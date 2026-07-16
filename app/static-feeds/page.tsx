import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type ConsolidatedRecord = JsonObject & {
  _sources: string[];
};

type AccountRecordGroup = {
  accountId?: string;
  account?: JsonObject;
  listings: JsonObject[];
  accountDetails: JsonObject[];
  spaces: JsonObject[];
  otherRecords: JsonObject[];
  sources: Set<string>;
};

type StaticFeed = {
  fileName: string;
  recordCount: number;
  payload: JsonValue;
  records: JsonObject[];
  error?: string;
};

type StaticContentFeed = {
  account?: JsonObject;
  listings: JsonObject[];
  accountDetails: JsonObject[];
  spaces: JsonObject[];
  sourceData: {
    account?: JsonObject;
    listings: JsonObject[];
    accountDetails: JsonObject[];
    spaces: JsonObject[];
  };
};

type ContentfulFieldRow = {
  field: string;
  group: string;
  source: string;
  contentfulFieldId: string;
  contentfulType: string;
  sample?: string;
  count: number;
};

type ContentfulFieldInput = Omit<ContentfulFieldRow, "contentfulFieldId" | "contentfulType" | "count"> & {
  value?: JsonValue;
};

const STATIC_FEEDS_DIR = path.join(process.cwd(), "data");
const ARRAY_KEYS = ["items", "records", "data", "results", "listings", "details", "spaces"];
const ID_KEYS = ["id", "_id", "account_id", "account_listing_id", "detail_id", "detail_space_id", "recid", "roomid"];

async function getJsonFileNames() {
  try {
    const fileNames: string[] = [];

    async function collectJsonFiles(directory: string, prefix = "") {
      const entries = await fs.readdir(directory, { withFileTypes: true });

      await Promise.all(
        entries.map(async (entry) => {
          const relativePath = path.join(prefix, entry.name);
          const fullPath = path.join(directory, entry.name);

          if (entry.isDirectory()) {
            await collectJsonFiles(fullPath, relativePath);
            return;
          }

          if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
            fileNames.push(relativePath);
          }
        }),
      );
    }

    await collectJsonFiles(STATIC_FEEDS_DIR);

    return fileNames.sort((first, second) => first.localeCompare(second));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await fs.mkdir(STATIC_FEEDS_DIR, { recursive: true });
      return [];
    }

    throw error;
  }
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeRecords(payload: JsonValue): JsonObject[] {
  if (Array.isArray(payload)) {
    return payload.filter(isJsonObject);
  }

  if (!isJsonObject(payload)) {
    return [];
  }

  for (const key of ARRAY_KEYS) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value.filter(isJsonObject);
    }
  }

  return [payload];
}

function getRecordId(record: JsonObject, fallback: string) {
  for (const key of ID_KEYS) {
    const value = record[key];

    if (typeof value === "string" || typeof value === "number") {
      return `${key}:${value}`;
    }
  }

  return fallback;
}

function getRecordAccountId(record: JsonObject) {
  const value = record.account_id;

  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function isAccountRecord(record: JsonObject) {
  return record.account_id !== undefined &&
    record.account_name !== undefined &&
    record.account_listing_id === undefined &&
    record.detail_id === undefined &&
    record.account_space_id === undefined;
}

function isListingRecord(record: JsonObject) {
  return record.account_listing_id !== undefined;
}

function isAccountDetailRecord(record: JsonObject) {
  return record.detail_type_name !== undefined;
}

function isSpaceRecord(record: JsonObject) {
  return record.account_space_id !== undefined || record.detail_space_id !== undefined;
}

function createAccountRecordGroup(accountId?: string): AccountRecordGroup {
  return {
    accountId,
    listings: [],
    accountDetails: [],
    spaces: [],
    otherRecords: [],
    sources: new Set<string>(),
  };
}

function mergeRecords(feeds: StaticFeed[]) {
  const records = new Map<string, AccountRecordGroup>();

  feeds.forEach((feed) => {
    feed.records.forEach((record, index) => {
      const accountId = getRecordAccountId(record);
      const id = accountId ? `account_id:${accountId}` : getRecordId(record, `${feed.fileName}:${index + 1}`);
      const existing = records.get(id) ?? createAccountRecordGroup(accountId);

      existing.sources.add(feed.fileName);

      if (isAccountRecord(record)) {
        existing.account = { ...existing.account, ...record };
      } else if (isListingRecord(record)) {
        existing.listings.push(record);
      } else if (isAccountDetailRecord(record)) {
        existing.accountDetails.push(record);
      } else if (isSpaceRecord(record)) {
        existing.spaces.push(record);
      } else {
        existing.otherRecords.push(record);
      }

      records.set(id, existing);
    });
  });

  return [...records.entries()].map(([id, group]) => {
    const record: ConsolidatedRecord = {
      account_id: group.accountId ?? null,
      account: group.account ?? null,
      listings: getSortedRecords(group.listings, "account_listing_id"),
      accountDetails: getSortedRecords(group.accountDetails, "detail_type_id"),
      spaces: getSortedRecords(group.spaces),
      otherRecords: group.otherRecords,
      listing_count: group.listings.length,
      detail_count: group.accountDetails.length,
      space_count: group.spaces.length,
      _sources: [...group.sources].sort((first, second) => first.localeCompare(second)),
    };

    return { id, record };
  });
}

function getFieldCoverage(records: { id: string; record: ConsolidatedRecord }[]) {
  const fields = new Map<string, number>();

  records.forEach(({ record }) => {
    Object.keys(record).forEach((field) => {
      fields.set(field, (fields.get(field) ?? 0) + 1);
    });
  });

  return [...fields.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((first, second) => second.count - first.count || first.field.localeCompare(second.field));
}

function formatValue(value: JsonValue | string[] | undefined) {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const text = typeof value === "object" ? JSON.stringify(value) : String(value);

  return text.length > 140 ? `${text.slice(0, 137)}...` : text;
}

function getContentfulFieldType(field: string, value?: JsonValue) {
  const normalizedField = field.toLowerCase();

  if (typeof value === "boolean") {
    return "Boolean";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "Integer" : "Number";
  }

  if (Array.isArray(value)) {
    return field.includes("images") || field.includes("files") ? "Media, many files" : "JSON object";
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "false", "yes", "no", "0", "1"].includes(normalizedValue) && normalizedField.includes("check")) {
      return "Boolean";
    }
  }

  if (normalizedField.includes("date")) {
    return "Date";
  }

  if (normalizedField.includes("url") || normalizedField.includes("website")) {
    return "Short text, URL";
  }

  if (normalizedField.includes("description") || normalizedField.includes("summary") || normalizedField.includes("comments")) {
    return "Long text";
  }

  if (normalizedField.endsWith("_id") || normalizedField.includes(".id") || normalizedField.includes("parent_")) {
    return "Integer";
  }

  if (normalizedField.includes("sort_order") || normalizedField.includes("occupancy") || normalizedField.includes("area") || normalizedField.includes("height")) {
    return "Number";
  }

  return "Short text";
}

function toContentfulFieldId(field: string) {
  const sourceIdentifier = field.match(/field_identifier="([^"]+)"/)?.[1] ?? field;
  const words = sourceIdentifier
    .replace(/\[.*?\]/g, " ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/);
  const fieldId = words
    .map((word, index) => {
      const normalized = word.replace(/^[0-9]+/, "");

      if (!normalized) {
        return "";
      }

      return index === 0
        ? normalized.charAt(0).toLowerCase() + normalized.slice(1)
        : normalized.charAt(0).toUpperCase() + normalized.slice(1);
    })
    .join("")
    .slice(0, 64);

  return /^[a-zA-Z]/.test(fieldId) ? fieldId : `field${fieldId.charAt(0).toUpperCase()}${fieldId.slice(1)}`;
}

function getSampleValue(value: JsonValue | undefined) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return formatValue(value);
}

function addContentfulFieldRow(rows: Map<string, ContentfulFieldRow>, row: ContentfulFieldInput) {
  const key = `${row.source}:${row.field}`;
  const existing = rows.get(key);

  if (existing) {
    rows.set(key, {
      ...existing,
      sample: existing.sample ?? row.sample,
      count: existing.count + 1,
    });
    return;
  }

  rows.set(key, {
    field: row.field,
    group: row.group,
    source: row.source,
    sample: row.sample,
    count: 1,
    contentfulFieldId: toContentfulFieldId(row.field),
    contentfulType: getContentfulFieldType(row.field, row.value),
  });
}

function addObjectFieldRows(rows: Map<string, ContentfulFieldRow>, record: JsonObject, group: string, source: string, prefix = "") {
  for (const [key, value] of Object.entries(record)) {
    const field = prefix ? `${prefix}.${key}` : key;

    addContentfulFieldRow(rows, {
      field,
      group,
      source,
      value,
      sample: getSampleValue(value),
    });

    if (Array.isArray(value)) {
      addContentfulFieldRow(rows, {
        field: `${field}[]`,
        group,
        source,
        value,
        sample: getSampleValue(value),
      });

      value.filter(isJsonObject).forEach((item) => addObjectFieldRows(rows, item, group, source, `${field}[]`));
    }
  }
}

function getFeedRecordGroup(record: JsonObject) {
  if (isAccountRecord(record)) {
    return "account";
  }

  if (isListingRecord(record)) {
    return "listing";
  }

  if (isAccountDetailRecord(record)) {
    return `account detail: ${getRecordText(record, "detail_type_name") ?? "unknown"}`;
  }

  if (isSpaceRecord(record)) {
    return "space";
  }

  return "other";
}

function addNamedFieldValueRows(rows: Map<string, ContentfulFieldRow>, record: JsonObject, group: string, source: string) {
  asJsonObjectArray(record.fields).forEach((field, index) => {
    const fieldKey = getRecordText(field, "field_identifier") || getRecordText(field, "field_name") || `field_${index + 1}`;
    const fieldType = getRecordText(field, "field_type");
    const path = `${group}.fields[field_identifier="${fieldKey}"].value`;
    const value = field.value;

    addContentfulFieldRow(rows, {
      field: path,
      group,
      source,
      value,
      sample: getSampleValue(value),
    });

    if (fieldType) {
      addContentfulFieldRow(rows, {
        field: `${path} source type`,
        group,
        source,
        value: fieldType,
        sample: fieldType,
      });
    }
  });
}

function buildContentfulFieldRows(feeds: StaticFeed[]) {
  const rows = new Map<string, ContentfulFieldRow>();

  feeds.filter((feed) => !feed.error).forEach((feed) => {
    feed.records.forEach((record) => {
      const group = getFeedRecordGroup(record);

      addObjectFieldRows(rows, record, group, feed.fileName);
      addNamedFieldValueRows(rows, record, group, feed.fileName);
    });
  });

  return [...rows.values()].sort((first, second) =>
    first.group.localeCompare(second.group) || first.field.localeCompare(second.field),
  );
}

async function readStaticFeeds(): Promise<StaticFeed[]> {
  const fileNames = await getJsonFileNames();

  return Promise.all(
    fileNames.map(async (fileName) => {
      try {
        const file = await fs.readFile(path.join(STATIC_FEEDS_DIR, fileName), "utf8");
        const payload = JSON.parse(file) as JsonValue;
        const records = normalizeRecords(payload);

        return {
          fileName,
          recordCount: records.length,
          payload,
          records,
        };
      } catch (error) {
        return {
          fileName,
          recordCount: 0,
          payload: null,
          records: [],
          error: error instanceof Error ? error.message : "Unable to read JSON feed.",
        };
      }
    }),
  );
}

export default async function StaticFeedsPage() {
  const feeds = await readStaticFeeds();
  const staticContentFeed = buildStaticContentFeed(feeds);
  const primaryListing = staticContentFeed.listings[0];
  const accountLayout = staticContentFeed.accountDetails.find((detail) => getRecordText(detail, "detail_type_name") === "Account Layout");
  const certifications = staticContentFeed.accountDetails.find((detail) => getRecordText(detail, "detail_type_name") === "CertificationSubmissions");
  const membershipRows: [string, JsonValue | undefined][] = [
    ["Primary Business Type", getFieldValue(accountLayout?.fields, ["Primary Business Type"])],
    ["Secondary Business Type", getFieldValue(accountLayout?.fields, ["Secondary Business Type"])],
    ["Membership Type", getFieldValue(accountLayout?.fields, ["Membership Type"])],
    ["Membership Pipeline", getFieldValue(accountLayout?.fields, ["Membership Pipeline"])],
    ["AccessNow ID", getFieldValue(accountLayout?.fields, ["AccessNow ID"])],
    ["Destination Pass", getFieldValue(accountLayout?.fields, ["destination_pass_participation", "Destination Program Participation"])],
  ];
  const consolidatedRecords = mergeRecords(feeds.filter((feed) => !feed.error));
  const contentfulRows = buildContentfulFieldRows(feeds);
  const fieldCoverage = getFieldCoverage(consolidatedRecords);
  const visibleFields = fieldCoverage
    .map(({ field }) => field)
    .filter((field) => field !== "_sources")
    .slice(0, 8);
  const lodgingListings = staticContentFeed.listings.filter((listing) => getRecordText(listing, "listing_type") === "Lodging");
  const listingCertificationFields = staticContentFeed.listings.flatMap((listing) =>
    asJsonObjectArray(listing.fields)
      .filter((field) => getRecordText(field, "detail_type_id") === "23")
      .map((field) => ({ listing, field })),
  );

  return (
    <main className="min-h-screen bg-[#eef3ef] px-5 py-8 text-[#18211c] sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="border-b border-[#b8c8bb] pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#51705a]">
            Static JSON feeds
          </p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Consolidated Feed Builder
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#59665d]">
                Drop provided JSON files into data and this page will normalize top-level records, merge shared identifiers, and surface field coverage.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#59665d]">
                The consolidation logic reads all provided JSON feeds, normalizes each file into records, detects each record type by its fields, and combines related records by account_id. Listings, account details, and spaces are kept as separate arrays under the account rather than forced into a legacy hierarchy. Category values are preserved as a flat categories[] array exactly as provided by the source feed.
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-3 text-sm sm:min-w-[420px]">
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Feeds</dt>
                <dd className="mt-2 text-3xl font-semibold">{feeds.length}</dd>
              </div>
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Records</dt>
                <dd className="mt-2 text-3xl font-semibold">{consolidatedRecords.length}</dd>
              </div>
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Fields</dt>
                <dd className="mt-2 text-3xl font-semibold">{contentfulRows.length}</dd>
              </div>
            </dl>
          </div>
        </header>

        {feeds.length === 0 ? (
          <article className="border border-[#b8c8bb] bg-white/80 p-5 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">No JSON feeds found</h2>
            <p className="mt-2 text-sm leading-6 text-[#59665d]">
              Add the provided feed files to data, then reload this page.
            </p>
          </article>
        ) : (
          <>
            <section className="grid gap-4 lg:grid-cols-3">
              {feeds.map((feed) => (
                <article key={feed.fileName} className="border border-[#b8c8bb] bg-white/80 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="break-all text-xl font-semibold tracking-tight">{feed.fileName}</h2>
                      <p className="mt-2 text-sm text-[#59665d]">
                        {feed.error ? "Unable to parse this feed." : `${feed.recordCount} normalized records`}
                      </p>
                    </div>
                    <span className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${feed.error ? "border-[#ce9b87] bg-[#fff2ec] text-[#87442b]" : "border-[#8eac96] bg-[#eef8f0] text-[#2d653b]"}`}>
                      {feed.error ? "Error" : "Ready"}
                    </span>
                  </div>
                  {feed.error ? <p className="mt-4 text-sm text-[#87442b]">{feed.error}</p> : null}
                </article>
              ))}
            </section>

            <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#51705a]">
                  Consolidated Feed
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {getRecordText(staticContentFeed.account, "account_name") ??
                    getRecordText(primaryListing, "account_name") ??
                    "No account payload"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#59665d]">
                  {getRecordText(primaryListing, "description") ??
                    getRecordText(staticContentFeed.account, "account_description") ??
                    "The feed can be built after JSON files are added to data."}
                </p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                <section className="border border-[#cdd9cf] bg-[#f7faf7] p-4">
                  <h3 className="text-lg font-semibold">Account Summary</h3>
                  <dl className="mt-3 grid gap-2 text-sm text-[#59665d] sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold text-[#18211c]">Account</dt>
                      <dd>{getRecordText(staticContentFeed.account, "account_id") ?? "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Status</dt>
                      <dd>{getRecordText(staticContentFeed.account, "account_quality") ?? "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Website</dt>
                      <dd className="break-all">{getRecordText(staticContentFeed.account, "website") ?? "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Email</dt>
                      <dd className="break-all">{getRecordText(staticContentFeed.account, "email") ?? "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Phone</dt>
                      <dd>{getRecordText(staticContentFeed.account, "phone") ?? "Missing"}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Listings</dt>
                      <dd>{staticContentFeed.listings.length}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Detail rows</dt>
                      <dd>{staticContentFeed.accountDetails.length}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[#18211c]">Spaces</dt>
                      <dd>{staticContentFeed.spaces.length}</dd>
                    </div>
                  </dl>
                </section>

                <section className="border border-[#cdd9cf] bg-[#f7faf7] p-4">
                  <h3 className="text-lg font-semibold">Membership Fields</h3>
                  <dl className="mt-3 grid gap-2 text-sm text-[#59665d] sm:grid-cols-2">
                    {membershipRows.map(([label, value]) => (
                      <div key={label}>
                        <dt className="font-semibold text-[#18211c]">{label}</dt>
                        <dd>{formatValue(value) || "Missing"}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>

              <section className="mt-5 border border-[#cdd9cf] bg-[#f7faf7] p-4">
                <h3 className="text-lg font-semibold">Listings</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59665d]">
                  categories[] is shown as a flat source array. The listing payload does not include parent category data, so parent/child hierarchy must come from the separate category endpoint once confirmed.
                </p>
                <div className="mt-3 overflow-auto">
                  <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead className="text-[#59665d]">
                      <tr>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Listing</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Type</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">categories[]</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Geo code</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Summary</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Images</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staticContentFeed.listings.map((listing, index) => {
                        const categories = asJsonObjectArray(listing.categories);
                        const geoCodes = asJsonObjectArray(listing.geo_codes);
                        const images = asJsonObjectArray(listing.images);

                        return (
                          <tr key={getRecordText(listing, "account_listing_id") ?? index}>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-medium">
                              {getRecordText(listing, "name") ?? getRecordText(listing, "account_name") ?? "Untitled"}
                              <span className="block font-mono text-xs text-[#59665d]">
                                {getRecordText(listing, "account_listing_id") ?? ""}
                              </span>
                            </td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{getRecordText(listing, "listing_type") ?? ""}</td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">
                              {categories.map((category, categoryIndex) => (
                                <span key={`${getRecordText(category, "category_id") ?? categoryIndex}-${categoryIndex}`} className="mb-2 block last:mb-0">
                                  {getRecordText(category, "category_name") ?? ""}
                                  <span className="block font-mono text-xs text-[#59665d]">
                                    categories[{categoryIndex}].category_id {getRecordText(category, "category_id") ?? ""}
                                    {getRecordText(category, "is_primary_category") ? `, is_primary_category ${getRecordText(category, "is_primary_category")}` : ""}
                                    {getRecordText(category, "sort_order") ? `, sort_order ${getRecordText(category, "sort_order")}` : ""}
                                  </span>
                                </span>
                              ))}
                            </td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">
                              {geoCodes.map((geoCode) => (
                                <span key={`${getRecordText(geoCode, "geo_code_id") ?? getRecordText(geoCode, "geo_code_name")}`} className="mb-2 block last:mb-0">
                                  {getRecordText(geoCode, "geo_code_name") ?? ""}
                                  <span className="block font-mono text-xs text-[#59665d]">
                                    id {getRecordText(geoCode, "geo_code_id") ?? ""}
                                    {getRecordText(geoCode, "parent_id") ? `, parent ${getRecordText(geoCode, "parent_id")}` : ""}
                                  </span>
                                </span>
                              ))}
                            </td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top text-xs text-[#59665d]">
                              {formatValue(getNamedValue(listing, ["summary", "description"]) as JsonValue | undefined)}
                            </td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{images.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-5 border border-[#cdd9cf] bg-[#f7faf7] p-4">
                <h3 className="text-lg font-semibold">Listing-Level Certification Fields</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#59665d]">
                  These are embedded directly in listing.fields with detail_type_id 23. They are shown separately from the account-level CertificationSubmissions detail row until iDSS confirms the relationship.
                </p>
                <div className="mt-3 overflow-auto">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead className="text-[#59665d]">
                      <tr>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Listing</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">listing_type</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">field_name</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">field_identifier</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">detail_type_id</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listingCertificationFields.length === 0 ? (
                        <tr>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 text-sm text-[#59665d]" colSpan={6}>
                            No listing-level certification fields found.
                          </td>
                        </tr>
                      ) : listingCertificationFields.map(({ listing, field }, index) => (
                        <tr key={`${getRecordText(listing, "account_listing_id") ?? "listing"}-${getRecordText(field, "field_id") ?? index}`}>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-medium">
                            {getRecordText(listing, "name") ?? getRecordText(listing, "account_name") ?? "Untitled"}
                            <span className="block font-mono text-xs text-[#59665d]">
                              account_listing_id {getRecordText(listing, "account_listing_id") ?? ""}
                            </span>
                          </td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{getRecordText(listing, "listing_type") ?? ""}</td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{getRecordText(field, "field_name") ?? ""}</td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">{getRecordText(field, "field_identifier") ?? ""}</td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">{getRecordText(field, "detail_type_id") ?? ""}</td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{formatValue(field.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-5 border border-[#cdd9cf] bg-[#f7faf7] p-4">
                <h3 className="text-lg font-semibold">Lodging Details</h3>
                <div className="mt-3 grid gap-4">
                  {lodgingListings.length === 0 ? (
                    <p className="text-sm text-[#59665d]">No lodging listings found.</p>
                  ) : lodgingListings.map((listing, index) => {
                    const fields = listing.fields;
                    const propertyAmenities = getAmenityNamesByGroup(listing, "Property Amenities");
                    const inRoomAmenities = getAmenityNamesByGroup(listing, "In-Room Amenities");
                    const accessibilityAmenities = getAmenityNamesByGroup(listing, "Accessibility");

                    return (
                      <article key={getRecordText(listing, "account_listing_id") ?? index} className="border border-[#cdd9cf] bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h4 className="text-base font-semibold">
                              {getRecordText(listing, "name") ?? getRecordText(listing, "account_name") ?? "Untitled lodging listing"}
                            </h4>
                            <p className="mt-1 font-mono text-xs text-[#59665d]">
                              account_listing_id {getRecordText(listing, "account_listing_id") ?? "Missing"}
                            </p>
                          </div>
                          <p className="text-sm text-[#59665d]">
                            {getRecordText(listing, "summary") ?? getRecordText(listing, "description") ?? ""}
                          </p>
                        </div>

                        <dl className="mt-4 grid gap-2 text-sm text-[#59665d] sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.CheckinTime</dt>
                            <dd>{formatValue(getFieldValue(fields, ["CheckinTime", "Check-in Time"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.CheckoutTime</dt>
                            <dd>{formatValue(getFieldValue(fields, ["CheckoutTime", "Check-out Time"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.NumberOfRooms</dt>
                            <dd>{formatValue(getFieldValue(fields, ["NumberOfRooms", "Number of Rooms"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.NumberOfAccessibleRooms</dt>
                            <dd>{formatValue(getFieldValue(fields, ["NumberOfAccessibleRooms", "Number of Accessible Rooms"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.NumberOfSingleRooms</dt>
                            <dd>{formatValue(getFieldValue(fields, ["NumberOfSingleRooms", "Number of Single Rooms"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.NumberOfDoubleRooms</dt>
                            <dd>{formatValue(getFieldValue(fields, ["NumberOfDoubleRooms", "Number of Double Rooms"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.NumberOfSuites</dt>
                            <dd>{formatValue(getFieldValue(fields, ["NumberOfSuites", "Number of Suites"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold text-[#18211c]">fields.StarRating</dt>
                            <dd>{formatValue(getFieldValue(fields, ["StarRating", "Star Rating"]) as JsonValue | undefined) || "Missing"}</dd>
                          </div>
                        </dl>

                        <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                          <div className="border border-[#dfe8e1] bg-[#f7faf7] p-3">
                            <p className="font-semibold text-[#18211c]">amenities[group_name=&quot;Property Amenities&quot;]</p>
                            <p className="mt-2 text-xs leading-5 text-[#59665d]">{propertyAmenities.join(", ") || "Missing"}</p>
                          </div>
                          <div className="border border-[#dfe8e1] bg-[#f7faf7] p-3">
                            <p className="font-semibold text-[#18211c]">amenities[group_name=&quot;In-Room Amenities&quot;]</p>
                            <p className="mt-2 text-xs leading-5 text-[#59665d]">{inRoomAmenities.join(", ") || "Missing"}</p>
                          </div>
                          <div className="border border-[#dfe8e1] bg-[#f7faf7] p-3">
                            <p className="font-semibold text-[#18211c]">amenities[group_name=&quot;Accessibility&quot;]</p>
                            <p className="mt-2 text-xs leading-5 text-[#59665d]">{accessibilityAmenities.join(", ") || "Missing"}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="mt-5 border border-[#cdd9cf] bg-[#f7faf7] p-4">
                <h3 className="text-lg font-semibold">Spaces</h3>
                <div className="mt-3 overflow-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="text-[#59665d]">
                      <tr>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Space</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Area</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Min</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Max</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Height</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Amenities</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staticContentFeed.spaces.map((space, index) => {
                        const amenities = asJsonObjectArray(space.amenities);

                        return (
                          <tr key={getRecordText(space, "account_space_id") ?? getRecordText(space, "detail_space_id") ?? index}>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-medium">
                              {getRecordText(space, "name") ?? getRecordText(space, "space_name") ?? "Untitled"}
                              <span className="block text-xs text-[#59665d]">{formatValue(space.description)}</span>
                            </td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{formatValue(space.area)}</td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{formatValue(space.min_occupancy)}</td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{formatValue(space.max_occupancy)}</td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{formatValue(space.height)}</td>
                            <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top text-xs text-[#59665d]">
                              {amenities.map((amenity) => getRecordText(amenity, "name")).filter(Boolean).join(", ")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="mt-5 border border-[#cdd9cf] bg-[#f7faf7] p-4">
                <h3 className="text-lg font-semibold">Certifications</h3>
                <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {asJsonObjectArray(certifications?.fields)
                    .filter((field) => field.value === "1" || field.value === true)
                    .map((field, index) => (
                      <div key={`${getRecordText(field, "field_id") ?? index}`} className="border border-[#cdd9cf] bg-white p-3">
                        <p className="font-semibold">{getRecordText(field, "field_name") ?? getRecordText(field, "field_identifier")}</p>
                        <p className="mt-1 font-mono text-xs text-[#59665d]">{getRecordText(field, "field_identifier")}</p>
                      </div>
                    ))}
                </div>
              </section>

              <div className="mt-5 overflow-auto">
                <h3 className="mb-3 text-lg font-semibold">Merged Records</h3>
                <table className="w-full min-w-[1120px] border-collapse text-left text-sm">
                  <thead className="text-[#59665d]">
                    <tr>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Record key</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Sources</th>
                      {visibleFields.map((field) => (
                        <th key={field} className="border-b border-[#cdd9cf] py-2 pr-4 font-mono text-xs">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {consolidatedRecords.map(({ id, record }) => (
                      <tr key={id}>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">{id}</td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top text-xs">{record._sources.join(", ")}</td>
                        {visibleFields.map((field) => (
                          <td key={field} className="border-b border-[#dfe8e1] py-2 pr-4 align-top text-xs text-[#59665d]">
                            {formatValue(record[field])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#51705a]">
                  Contentful Field Output
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Raw source fields for import modeling</h2>
                <p className="mt-2 text-sm leading-6 text-[#59665d]">
                  Use this as the field creation checklist. It includes raw feed paths, repeated custom fields by identifier, suggested Contentful field IDs, inferred types, and sample values.
                </p>
              </div>

              <div className="mt-5 overflow-auto">
                <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
                  <thead className="text-[#59665d]">
                    <tr>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Contentful field ID</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Type</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Source path</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Group</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Feed</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Rows</th>
                      <th className="border-b border-[#cdd9cf] py-2 pr-4">Sample</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentfulRows.map((row) => (
                      <tr key={`${row.source}-${row.field}`}>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">
                          {row.contentfulFieldId}
                        </td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-medium">
                          {row.contentfulType}
                        </td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">
                          {row.field}
                        </td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{row.group}</td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">
                          {row.source}
                        </td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">{row.count}</td>
                        <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top text-xs text-[#59665d]">
                          {row.sample ?? ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
              <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight">Consolidated field coverage</h2>
                <div className="mt-4 max-h-[520px] overflow-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="text-[#59665d]">
                      <tr>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Field</th>
                        <th className="border-b border-[#cdd9cf] py-2 pr-4">Rows</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fieldCoverage.map(({ field, count }) => (
                        <tr key={field}>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4 font-mono text-xs">{field}</td>
                          <td className="border-b border-[#dfe8e1] py-2 pr-4">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>

              <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
                <h2 className="text-2xl font-semibold tracking-tight">Consolidated JSON</h2>
                <pre className="mt-4 max-h-[520px] overflow-auto border border-[#cdd9cf] bg-[#17211b] p-4 text-xs leading-5 text-[#eef3ef]">
                  {formatPayload(staticContentFeed)}
                </pre>
              </article>
            </div>

            <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight">Raw Feeds</h2>
              <div className="mt-5 grid gap-5">
                {feeds.map((feed) => (
                  <section key={feed.fileName} className="border border-[#cdd9cf] bg-[#f7faf7] p-4">
                    <h3 className="break-all text-lg font-semibold">{feed.fileName}</h3>
                    {feed.error ? (
                      <p className="mt-3 text-sm text-[#87442b]">{feed.error}</p>
                    ) : (
                      <pre className="mt-3 max-h-80 overflow-auto border border-[#cdd9cf] bg-[#17211b] p-4 text-xs leading-5 text-[#eef3ef]">
                        {formatPayload(feed.payload)}
                      </pre>
                    )}
                  </section>
                ))}
              </div>
            </article>
          </>
        )}
      </section>
    </main>
  );
}

function formatPayload(payload: unknown) {
  if (payload === undefined) {
    return "No response payload.";
  }

  if (typeof payload === "string") {
    return payload || "Empty response body.";
  }

  return JSON.stringify(payload, null, 2);
}

function getRecordText(record: JsonObject | undefined, key: string) {
  const value = record?.[key];

  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : undefined;
}

function asJsonObjectArray(value: JsonValue | undefined) {
  return Array.isArray(value) ? value.filter(isJsonObject) : [];
}

function getFieldValue(fields: JsonValue | undefined, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const field = asJsonObjectArray(fields).find((item) => {
    const identifier = getRecordText(item, "field_identifier")?.toLowerCase();
    const fieldName = getRecordText(item, "field_name")?.toLowerCase();

    return normalizedNames.includes(identifier ?? "") || normalizedNames.includes(fieldName ?? "");
  });

  return field?.value;
}

function getAmenityNamesByGroup(record: JsonObject, groupName: string) {
  return asJsonObjectArray(record.amenities)
    .filter((amenity) => getRecordText(amenity, "group_name") === groupName && amenity.value === true)
    .map((amenity) => getRecordText(amenity, "name"))
    .filter((name): name is string => Boolean(name));
}

function getNamedValue(record: JsonObject | undefined, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function getSortedRecords(records: JsonObject[], sortKey = "sort_order") {
  return [...records].sort(
    (first, second) => Number(first[sortKey] ?? 0) - Number(second[sortKey] ?? 0),
  );
}

function buildStaticContentFeed(feeds: StaticFeed[]): StaticContentFeed {
  const records = feeds.filter((feed) => !feed.error).flatMap((feed) => feed.records);
  const account = records.find((record) =>
    record.account_id !== undefined &&
    record.account_name !== undefined &&
    record.account_listing_id === undefined &&
    record.detail_id === undefined &&
    record.account_space_id === undefined,
  );
  const listings = records.filter((record) => record.account_listing_id !== undefined);
  const accountDetails = records.filter((record) => record.detail_type_name !== undefined);
  const spaces = records.filter((record) =>
    record.account_space_id !== undefined || record.detail_space_id !== undefined,
  );

  return {
    account,
    listings: getSortedRecords(listings, "account_listing_id"),
    accountDetails: getSortedRecords(accountDetails, "detail_type_id"),
    spaces: getSortedRecords(spaces),
    sourceData: {
      account,
      listings,
      accountDetails,
      spaces,
    },
  };
}
