import { Buffer } from "node:buffer";
import https from "node:https";

type IdssEndpoint = {
  name: string;
  description: string;
  path: string;
};

type EndpointResult = IdssEndpoint & {
  durationMs: number;
  ok: boolean;
  status?: number;
  statusText?: string;
  payload?: unknown;
  error?: string;
};

type IdssField = {
  field_identifier?: string;
  field_name?: string;
  value?: unknown;
};

type IdssListingPayload = {
  account_listing_id?: number;
  account_id?: number;
  parent_account_id?: number;
  account_name?: string;
  name?: string;
  description?: string;
  summary?: string;
  phone?: string;
  secondary_phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  twitter?: string;
  facebook?: string;
  you_tube?: string;
  linked_in?: string;
  instagram?: string;
  account_quality?: string;
  account_quality_name?: string;
  suite?: string;
  street?: string;
  address3?: string;
  address4?: string;
  city?: string;
  state?: string;
  county?: string;
  postal_code?: string;
  country?: string;
  google_map_query?: string;
  latitude?: number;
  longitude?: number;
  member_level_name?: string;
  is_primary?: boolean;
  external_reference?: string;
  web_cms_url?: string;
  geo_codes?: Record<string, unknown>[];
  account_types?: Record<string, unknown>[];
  categories?: Record<string, unknown>[];
  cuisines?: Record<string, unknown>[];
  images?: Record<string, unknown>[];
  files?: Record<string, unknown>[];
  listing_type?: string;
  fields?: IdssField[];
  amenities?: IdssField[];
};

type IdssAccountDetail = {
  detail_id?: number;
  account_id?: number;
  detail_type_id?: number;
  detail_type_name?: string;
  detail_name?: string;
  comments?: string;
  comments_html?: string;
  fields?: IdssField[];
};

type IdssSpace = {
  detail_space_id?: number;
  detail_id?: number;
  parent_detail_space_id?: number;
  detail_space_definition_id?: number;
  space_definition_name?: string;
  space_name?: string;
  space_description?: string;
  min_occupancy?: number;
  max_occupancy?: number;
  area?: number;
  height?: number;
  dimension?: string;
  measurement_units?: string;
  sort_order?: number;
  configs?: {
    detail_space_config_id?: number;
    detail_space_id?: number;
    detail_space_config_definition_id?: number;
    detail_space_config_definition_name?: string;
    description?: string;
    occupancy?: number;
    area?: number;
  }[];
  fields?: IdssField[];
};

type ContentfulFieldRow = {
  field: string;
  group: string;
  source: string;
  contentfulFieldId: string;
  contentfulType: string;
  sample?: string;
};

type ContentfulFieldInput = Omit<ContentfulFieldRow, "contentfulFieldId" | "contentfulType"> & {
  value?: unknown;
};

const IDSS_BASE_URL = "https://api-uat-ca.idss.com";
const LISTING_ENDPOINT_PATH = "/api/v2/listing/5";
const ACCOUNT_DETAIL_ENDPOINT_PATH = "/api/account/34804/detail";
const SPACE_ENDPOINT_PATH = "/api/space";

const endpoints: IdssEndpoint[] = [
  {
    name: "Listing 5",
    description: "Member listing content, images, main copy, and summary copy.",
    path: LISTING_ENDPOINT_PATH,
  },
  {
    name: "Account 34804 Details",
    description: "Amenities, green badges, certifications, and AccessNow fields.",
    path: ACCOUNT_DETAIL_ENDPOINT_PATH,
  },
  {
    name: "Meeting Spaces",
    description: "Room dimensions, layouts, capacities, and facilities.",
    path: SPACE_ENDPOINT_PATH,
  },
];

const consolidatedSourceRows = [
  {
    section: "listing",
    source: LISTING_ENDPOINT_PATH,
    sourcePath: "top-level listing fields",
    output: "Primary listing record with contact, address, categories, geo_codes, media, fields, and amenities.",
  },
  {
    section: "accountDetails[]",
    source: ACCOUNT_DETAIL_ENDPOINT_PATH,
    sourcePath: "detail rows grouped by detail_type_name",
    output: "Account-level detail records such as General, Meeting Spaces, Certifications, and AccessNow-related fields.",
  },
  {
    section: "meetingFacility",
    source: ACCOUNT_DETAIL_ENDPOINT_PATH,
    sourcePath: "detail_type_name=Meeting Spaces fields",
    output: "Summary meeting-space fields lifted from the matching account detail record.",
  },
  {
    section: "meetingRooms[]",
    source: SPACE_ENDPOINT_PATH,
    sourcePath: "spaces where detail_id matches the Meeting Spaces detail row",
    output: "Joined room records with dimensions, capacities, configs, fields, and source ids.",
  },
  {
    section: "sourceData",
    source: "all live endpoints",
    sourcePath: "raw listing, accountDetails, spaces, joinedMeetingSpaces",
    output: "Unmodified source payloads kept beside the mapped sections for traceability.",
  },
];

function getContentfulFieldType(field: string, value?: unknown) {
  const normalizedField = field.toLowerCase();

  if (typeof value === "boolean") {
    return "Boolean";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "Integer" : "Number";
  }

  if (Array.isArray(value)) {
    return field === "images[]" || field === "files[]" ? "Media, many files" : "JSON object";
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();

    if (["true", "false", "yes", "no"].includes(normalizedValue)) {
      return "Boolean";
    }
  }

  if (normalizedField.includes("date") || normalizedField.includes("dov")) {
    return "Date";
  }

  if (normalizedField.includes("url") || normalizedField.includes("website")) {
    return "Short text, URL";
  }

  if (field === "latitude" || field === "longitude") {
    return "Number";
  }

  if (field === "is_primary" || field.endsWith(".is_primary_category")) {
    return "Boolean";
  }

  if (
    field === "description" ||
    field === "summary" ||
    normalizedField.includes("description") ||
    normalizedField.includes("review") ||
    field.endsWith(".comments") ||
    field.endsWith(".comments_html")
  ) {
    return "Long text";
  }

  if (field === "images[]") {
    return "Media, many files";
  }

  if (field === "files[]") {
    return "Media, many files";
  }

  if (field.endsWith("[]")) {
    return "JSON object";
  }

  if (field.includes("_id") || field.endsWith(".detail_id") || field.endsWith(".parent_id")) {
    return "Integer";
  }

  if (
    field.includes("sort_order") ||
    field.includes("occupancy") ||
    field.endsWith(".area") ||
    field.endsWith(".height") ||
    field.includes("SqFt")
  ) {
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

function getSampleValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const sample = typeof value === "object" ? JSON.stringify(value) : String(value);

  return sample.length > 120 ? `${sample.slice(0, 117)}...` : sample;
}

function addContentfulFieldRow(rows: Map<string, ContentfulFieldRow>, row: ContentfulFieldInput) {
  if (rows.has(row.field)) {
    return;
  }

  rows.set(row.field, {
    field: row.field,
    group: row.group,
    source: row.source,
    sample: row.sample,
    contentfulFieldId: toContentfulFieldId(row.field),
    contentfulType: getContentfulFieldType(row.field, row.value),
  });
}

function addObjectFieldRows(rows: Map<string, ContentfulFieldRow>, record: Record<string, unknown>, group: string, source: string, prefix = "") {
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

      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          addObjectFieldRows(rows, item as Record<string, unknown>, group, source, `${field}[]`);
        }
      }
    }
  }
}

function getIdssFieldKey(field: IdssField, index: number) {
  return field.field_identifier || field.field_name || `field_${index + 1}`;
}

function buildContentfulFieldRows(consolidatedFeed: NonNullable<ReturnType<typeof buildConsolidatedFeed>>) {
  const rows = new Map<string, ContentfulFieldRow>();

  addObjectFieldRows(rows, consolidatedFeed.sourceData.listing as Record<string, unknown>, "listing", LISTING_ENDPOINT_PATH);

  for (const detail of consolidatedFeed.accountDetails) {
    addObjectFieldRows(rows, detail as Record<string, unknown>, `account detail: ${detail.detail_type_name ?? "unknown"}`, ACCOUNT_DETAIL_ENDPOINT_PATH, "accountDetails[]");

    detail.fields.forEach((field, index) => {
      const fieldKey = getIdssFieldKey(field, index);

      addContentfulFieldRow(rows, {
        field: `accountDetails[detail_type_name="${detail.detail_type_name}"].fields[field_identifier="${fieldKey}"].value`,
        group: `account detail: ${detail.detail_type_name ?? "unknown"}`,
        source: ACCOUNT_DETAIL_ENDPOINT_PATH,
        value: field.value,
        sample: getSampleValue(field.value),
      });
    });
  }

  consolidatedFeed.meetingRooms.forEach((room) => {
    addObjectFieldRows(rows, room as Record<string, unknown>, "meeting space", SPACE_ENDPOINT_PATH, "meetingRooms[]");
  });

  return [...rows.values()].sort((first, second) =>
    first.group.localeCompare(second.group) || first.field.localeCompare(second.field),
  );
}

function getAuthHeader() {
  const username = process.env.IDSS_API_USERNAME;
  const password = process.env.IDSS_API_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function fetchEndpoint(endpoint: IdssEndpoint): Promise<EndpointResult> {
  const authHeader = getAuthHeader();
  const startedAt = Date.now();

  if (!authHeader) {
    return {
      ...endpoint,
      durationMs: 0,
      ok: false,
      error: "Missing IDSS_API_USERNAME or IDSS_API_PASSWORD in .env.",
    };
  }

  try {
    const response = await requestIdssEndpoint(endpoint.path, authHeader);
    const payload = response.contentType.includes("application/json")
      ? JSON.parse(response.body)
      : response.body;

    return {
      ...endpoint,
      durationMs: Date.now() - startedAt,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      payload,
    };
  } catch (error) {
    return {
      ...endpoint,
      durationMs: Date.now() - startedAt,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown request error.",
    };
  }
}

function requestIdssEndpoint(path: string, authHeader: string) {
  const url = new URL(path, IDSS_BASE_URL);

  return new Promise<{
    body: string;
    contentType: string;
    status: number;
    statusText: string;
  }>((resolve, reject) => {
    const request = https.request(
      url,
      {
        headers: {
          Accept: "application/json",
          Authorization: authHeader,
        },
        rejectUnauthorized: false,
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          resolve({
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: response.headers["content-type"] ?? "",
            status: response.statusCode ?? 0,
            statusText: response.statusMessage ?? "",
          });
        });
      },
    );

    request.on("error", reject);
    request.end();
  });
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

function asArray<T>(payload: unknown): T[] {
  return Array.isArray(payload) ? payload : [];
}

function getResultPayload<T>(results: EndpointResult[], path: string) {
  return results.find((result) => result.path === path && result.ok)?.payload as T | undefined;
}

function getFieldValue(fields: IdssField[] | undefined, names: string[]) {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const field = fields?.find((item) => {
    const identifier = item.field_identifier?.toLowerCase();
    const fieldName = item.field_name?.toLowerCase();

    return normalizedNames.includes(identifier ?? "") || normalizedNames.includes(fieldName ?? "");
  });

  return field?.value;
}

function buildCapacityMap(space: IdssSpace) {
  return Object.fromEntries(
    (space.configs ?? []).map((config) => [
      config.detail_space_config_definition_name?.toLowerCase() ?? "",
      config.occupancy,
    ]),
  );
}

function getRecordText(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];

  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

function getSortedCategories(categories: Record<string, unknown>[] | undefined) {
  return [...(categories ?? [])].sort(
    (first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0),
  );
}

function getSortedGeoCodes(geoCodes: Record<string, unknown>[] | undefined) {
  return [...(geoCodes ?? [])].sort(
    (first, second) => Number(first.sort_order ?? 0) - Number(second.sort_order ?? 0),
  );
}

function buildConsolidatedFeed(results: EndpointResult[]) {
  const listing = getResultPayload<IdssListingPayload>(results, LISTING_ENDPOINT_PATH);
  const accountDetails = asArray<IdssAccountDetail>(
    getResultPayload<IdssAccountDetail[]>(results, ACCOUNT_DETAIL_ENDPOINT_PATH),
  );
  const spaces = asArray<IdssSpace>(getResultPayload<IdssSpace[]>(results, SPACE_ENDPOINT_PATH));
  const meetingDetail = accountDetails.find((detail) => detail.detail_type_name === "Meeting Spaces");
  const meetingSpaces = spaces
    .filter((space) => space.detail_id === meetingDetail?.detail_id)
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0));

  if (!listing) {
    return null;
  }

  const categories = getSortedCategories(listing.categories);
  const geoCodes = getSortedGeoCodes(listing.geo_codes);

  return {
    sourceEndpoints: [LISTING_ENDPOINT_PATH, ACCOUNT_DETAIL_ENDPOINT_PATH, SPACE_ENDPOINT_PATH],
    sourceData: {
      listing,
      accountDetails,
      spaces,
      joinedMeetingSpaces: meetingSpaces,
    },
    listing: {
      account_listing_id: listing.account_listing_id,
      account_id: listing.account_id,
      parent_account_id: listing.parent_account_id,
      account_name: listing.account_name,
      name: listing.name,
      description: listing.description,
      summary: listing.summary,
      account_quality: listing.account_quality,
      account_quality_name: listing.account_quality_name,
      member_level_name: listing.member_level_name,
      is_primary: listing.is_primary,
      external_reference: listing.external_reference,
      web_cms_url: listing.web_cms_url,
      listing_type: listing.listing_type,
      phone: listing.phone,
      secondary_phone: listing.secondary_phone,
      fax: listing.fax,
      email: listing.email,
      website: listing.website,
      social: {
        twitter: listing.twitter,
        facebook: listing.facebook,
        you_tube: listing.you_tube,
        linked_in: listing.linked_in,
        instagram: listing.instagram,
      },
      address: {
        suite: listing.suite,
        street: listing.street,
        address3: listing.address3,
        address4: listing.address4,
        city: listing.city,
        state: listing.state,
        county: listing.county,
        postal_code: listing.postal_code,
        country: listing.country,
        google_map_query: listing.google_map_query,
        latitude: listing.latitude,
        longitude: listing.longitude,
      },
      geo_codes: geoCodes,
      account_types: listing.account_types ?? [],
      categories,
      cuisines: listing.cuisines ?? [],
      images: listing.images ?? [],
      files: listing.files ?? [],
      fields: listing.fields ?? [],
      amenities: listing.amenities ?? [],
    },
    accountDetails: accountDetails.map((detail) => ({
      detail_id: detail.detail_id,
      account_id: detail.account_id,
      detail_type_id: detail.detail_type_id,
      detail_type_name: detail.detail_type_name,
      detail_name: detail.detail_name,
      comments: detail.comments,
      comments_html: detail.comments_html,
      fields: detail.fields ?? [],
    })),
    meetingFacility: meetingDetail
      ? {
          detail_id: meetingDetail.detail_id,
          detail_type_name: meetingDetail.detail_type_name,
          totalSqFt: getFieldValue(meetingDetail.fields, ["TotalSqFt", "Total Sq. Ft."]),
          largestRoom: getFieldValue(meetingDetail.fields, ["LargestRoom", "Largest Room"]),
          numberOfRooms: getFieldValue(meetingDetail.fields, ["NumRooms", "Number of Meeting Rooms"]),
          exhibitSpace: getFieldValue(meetingDetail.fields, ["ExhibitSpace", "Exhibit Space"]),
        }
      : null,
    meetingRooms: meetingSpaces.map((space) => {
      const capacities = buildCapacityMap(space);

      return {
        detail_space_id: space.detail_space_id,
        detail_id: space.detail_id,
        parent_detail_space_id: space.parent_detail_space_id,
        detail_space_definition_id: space.detail_space_definition_id,
        space_definition_name: space.space_definition_name,
        roomname: space.space_name,
        description: space.space_description,
        min_occupancy: space.min_occupancy,
        max_occupancy: space.max_occupancy,
        sqft: space.area,
        height: space.height,
        dimension: space.dimension,
        measurement_units: space.measurement_units,
        sort_order: space.sort_order,
        theater: capacities.theater,
        classroom: capacities.classroom,
        banquet: capacities.banquet,
        reception: capacities.reception,
        configs: space.configs ?? [],
        fields: space.fields ?? [],
      };
    }),
  };
}

export default async function Home() {
  const results = await Promise.all(endpoints.map(fetchEndpoint));
  const successfulRequests = results.filter((result) => result.ok).length;
  const consolidatedFeed = buildConsolidatedFeed(results);
  const contentfulRows = consolidatedFeed ? buildContentfulFieldRows(consolidatedFeed) : [];
  const primaryCategory = consolidatedFeed?.listing.categories[0];
  const primaryGeoCode = consolidatedFeed?.listing.geo_codes[0];

  return (
    <main className="min-h-screen bg-[#f5f1e8] px-5 py-8 text-[#20201d] sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-5 border-b border-[#cfc6b4] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              iDSS UAT API
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#151512] sm:text-5xl">
              Endpoint Connection Check
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d584f]">
              Live listing, account detail, and meeting space records joined into one iDSS feed.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-72">
            <div className="border border-[#cfc6b4] bg-white/65 p-4">
              <p className="text-[#6f675a]">Connected</p>
              <p className="mt-2 text-3xl font-semibold">{successfulRequests}</p>
            </div>
            <div className="border border-[#cfc6b4] bg-white/65 p-4">
              <p className="text-[#6f675a]">Total</p>
              <p className="mt-2 text-3xl font-semibold">{results.length}</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 border-b border-[#cfc6b4] pb-4 text-sm">
          {[
            ["#consolidated-feed", "Consolidated Feed"],
            ["#contentful-field-list", "Contentful Field List"],
            ["#raw-endpoints", "Raw Endpoints"],
            ["#source-map", "Source Map"],
            ["/old-listing", "Old Listing"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="border border-[#cfc6b4] bg-white/70 px-3 py-2 font-medium text-[#20201d] hover:bg-[#fffaf0]"
            >
              {label}
            </a>
          ))}
        </nav>

        <article id="consolidated-feed" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
                Consolidated Feed
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                {consolidatedFeed?.listing.account_name ?? "No listing payload"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#625c52]">
                {consolidatedFeed?.listing.description ??
                  "The feed can be built after the listing endpoint returns successfully."}
              </p>
            </div>

            <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2 lg:min-w-[480px]">
              <div>
                <dt className="font-semibold text-[#20201d]">listing.account_id</dt>
                <dd>{consolidatedFeed?.listing.account_id ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">listing.categories[0].category_name</dt>
                <dd>{getRecordText(primaryCategory, "category_name") ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">listing.geo_codes[0].geo_code_name</dt>
                <dd>{getRecordText(primaryGeoCode, "geo_code_name") ?? "Missing"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#20201d]">meetingRooms.length</dt>
                <dd>{consolidatedFeed?.meetingRooms.length ?? 0}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">listing</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.account_listing_id</dt>
                  <dd>{consolidatedFeed?.listing.account_listing_id ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.website</dt>
                  <dd className="break-all">{consolidatedFeed?.listing.website ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.phone</dt>
                  <dd>{consolidatedFeed?.listing.phone ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.email</dt>
                  <dd className="break-all">{consolidatedFeed?.listing.email ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.categories[0].category_id</dt>
                  <dd>{getRecordText(primaryCategory, "category_id") ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.geo_codes[0].geo_code_id</dt>
                  <dd>{getRecordText(primaryGeoCode, "geo_code_id") ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.geo_codes[0].parent_id</dt>
                  <dd>{getRecordText(primaryGeoCode, "parent_id") ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.geo_codes.length</dt>
                  <dd>{consolidatedFeed?.listing.geo_codes.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.account_types.length</dt>
                  <dd>{consolidatedFeed?.listing.account_types.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">sourceData.accountDetails.length</dt>
                  <dd>{consolidatedFeed?.sourceData.accountDetails.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">sourceData.spaces.length</dt>
                  <dd>{consolidatedFeed?.sourceData.spaces.length ?? 0}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.address.latitude</dt>
                  <dd>{consolidatedFeed?.listing.address.latitude ?? "Missing"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">listing.address.longitude</dt>
                  <dd>{consolidatedFeed?.listing.address.longitude ?? "Missing"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-[#20201d]">listing.address</dt>
                  <dd>
                    {[
                      consolidatedFeed?.listing.address.street,
                      consolidatedFeed?.listing.address.city,
                      consolidatedFeed?.listing.address.state,
                      consolidatedFeed?.listing.address.postal_code,
                      consolidatedFeed?.listing.address.country,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Missing"}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="border border-[#d9d0bd] bg-white/70 p-4">
              <h3 className="text-lg font-semibold">meetingFacility</h3>
              <dl className="mt-3 grid gap-2 text-sm text-[#5d584f] sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-[#20201d]">meetingFacility.totalSqFt</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.totalSqFt ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">meetingFacility.largestRoom</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.largestRoom ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">meetingFacility.numberOfRooms</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.numberOfRooms ?? "Missing")}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-[#20201d]">meetingFacility.exhibitSpace</dt>
                  <dd>{String(consolidatedFeed?.meetingFacility?.exhibitSpace ?? "Missing")}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">listing.categories</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">path</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">category_id</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">category_name</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">is_primary_category</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">sort_order</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.listing.categories.map((categoryRow, index) => (
                    <tr key={`${getRecordText(categoryRow, "category_id") ?? index}-${index}`}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        listing.categories[{index}]
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        {getRecordText(categoryRow, "category_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(categoryRow, "category_name") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {String(categoryRow.is_primary_category ?? "")}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(categoryRow, "sort_order") ?? ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">listing.geo_codes</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">geo_code_name</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">geo_code_id</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">parent_id</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">sort_order</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">external_reference</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.listing.geo_codes.map((geoCode, index) => (
                    <tr key={`${getRecordText(geoCode, "geo_code_id") ?? index}-${index}`}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {getRecordText(geoCode, "geo_code_name") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        {getRecordText(geoCode, "geo_code_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(geoCode, "parent_id") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {getRecordText(geoCode, "sort_order") ?? ""}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">
                        {String(geoCode.external_reference ?? "")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-5 border border-[#d9d0bd] bg-white/70 p-4">
            <h3 className="text-lg font-semibold">meetingRooms</h3>
            <div className="mt-3 overflow-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="text-[#625c52]">
                  <tr>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">roomname</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">sqft</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">banquet</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">classroom</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">reception</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">theater</th>
                    <th className="border-b border-[#d9d0bd] py-2 pr-4">detail_id</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedFeed?.meetingRooms.map((room) => (
                    <tr key={room.detail_space_id}>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-medium">
                        {room.roomname}
                      </td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.sqft}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.banquet}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.classroom}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.reception}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4">{room.theater}</td>
                      <td className="border-b border-[#ece4d4] py-2 pr-4 font-mono text-xs">
                        {room.detail_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <pre className="mt-5 max-h-96 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
            {formatPayload(consolidatedFeed)}
          </pre>
        </article>

        <article id="contentful-field-list" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              Contentful Field List
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Live-derived import plan for Contentful
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#625c52]">
              This includes top-level listing fields, nested account detail fields like AccessNow, and meeting space fields from the joined live feed.
            </p>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="text-[#625c52]">
                <tr>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Contentful field ID</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Contentful type</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">iDSS source path</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">group</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">source</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">sample</th>
                </tr>
              </thead>
              <tbody>
                {contentfulRows.map((row) => (
                  <tr key={`${row.group}-${row.field}`}>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.contentfulFieldId}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-medium">
                      {row.contentfulType}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.field}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top">
                      {row.group}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.source}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top text-xs text-[#5d584f]">
                      {row.sample ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <div id="raw-endpoints" className="grid gap-5">
          {results.map((result) => (
            <article
              key={result.path}
              className="border border-[#cfc6b4] bg-white/80 p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {result.name}
                    </h2>
                    <span
                      className={`border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        result.ok
                          ? "border-[#91a66f] bg-[#eef5df] text-[#3f5f22]"
                          : "border-[#d59a7a] bg-[#fff0e8] text-[#8b3f20]"
                      }`}
                    >
                      {result.ok ? "OK" : "Needs attention"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#625c52]">
                    {result.description}
                  </p>
                </div>

                <dl className="grid gap-2 text-sm text-[#5d584f] sm:grid-cols-3 lg:min-w-[360px]">
                  <div>
                    <dt className="font-semibold text-[#20201d]">Status</dt>
                    <dd>
                      {result.status
                        ? `${result.status} ${result.statusText ?? ""}`.trim()
                        : "No response"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#20201d]">Time</dt>
                    <dd>{result.durationMs}ms</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[#20201d]">Path</dt>
                    <dd className="break-all font-mono text-xs">{result.path}</dd>
                  </div>
                </dl>
              </div>

              {result.error ? (
                <p className="mt-5 border border-[#d59a7a] bg-[#fff8f2] p-4 text-sm text-[#8b3f20]">
                  {result.error}
                </p>
              ) : (
                <pre className="mt-5 max-h-80 overflow-auto border border-[#d9d0bd] bg-[#1f211d] p-4 text-xs leading-5 text-[#f5f1e8]">
                  {formatPayload(result.payload)}
                </pre>
              )}
            </article>
          ))}
        </div>

        <article id="source-map" className="border border-[#a99b82] bg-[#fffaf0] p-5 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#786449]">
              Source Map
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Three endpoints to consolidated listing
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#625c52]">
              The consolidated feed keeps live iDSS source arrays visible and adds only the joined sections needed to inspect the listing, account details, meeting facility, and rooms together.
            </p>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="text-[#625c52]">
                <tr>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Consolidated section</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Source endpoint</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Source path / lookup</th>
                  <th className="border-b border-[#d9d0bd] py-2 pr-4">Output</th>
                </tr>
              </thead>
              <tbody>
                {consolidatedSourceRows.map((row) => (
                  <tr key={row.section}>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.section}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-medium">
                      {row.source}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top font-mono text-xs">
                      {row.sourcePath}
                    </td>
                    <td className="border-b border-[#ece4d4] py-2 pr-4 align-top text-[#5d584f]">
                      {row.output}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

      </section>

      <style>{`
        #crowdriff-embed-shell {
          width: 100%;
          max-width: 200px;
          margin: 0 auto;
          overflow: hidden;
          background: #000;
          min-height: 200px;
        }

        #crowdriff-embed-shell iframe,
        #crowdriff-embed-shell > div {
          max-width: 100%;
        }
      `}</style>

      <section id="crowdriff-embed-shell" className="mx-auto w-full max-w-[200px] overflow-hidden bg-black">
        <script
          id="cr-init__c2360344c58220d5"
          src="https://starling.crowdriff.com/js/crowdriff.js"
          async
        />
      </section>
      </main>
  );
}


