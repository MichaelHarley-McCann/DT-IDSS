import { Buffer } from "node:buffer";
import https from "node:https";

export const dynamic = "force-dynamic";

type CategoryResult = {
  durationMs: number;
  ok: boolean;
  status?: number;
  statusText?: string;
  payload?: unknown;
  error?: string;
};

const IDSS_BASE_URL = "https://api-uat-ca.idss.com";
const CATEGORY_ENDPOINT_PATH = "/api/category";

function getAuthHeader() {
  const username = process.env.IDSS_API_USERNAME;
  const password = process.env.IDSS_API_PASSWORD;

  if (!username || !password) {
    return null;
  }

  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

async function fetchCategories(): Promise<CategoryResult> {
  const authHeader = getAuthHeader();
  const startedAt = Date.now();

  if (!authHeader) {
    return {
      durationMs: 0,
      ok: false,
      error: "Missing IDSS_API_USERNAME or IDSS_API_PASSWORD in .env.",
    };
  }

  try {
    const response = await requestIdssEndpoint(CATEGORY_ENDPOINT_PATH, authHeader);
    const payload = response.contentType.includes("application/json")
      ? JSON.parse(response.body)
      : response.body;

    return {
      durationMs: Date.now() - startedAt,
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      payload,
    };
  } catch (error) {
    return {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function getRecordText(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];

  return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
    ? String(value)
    : undefined;
}

function getCategoryRows(payload: unknown) {
  if (Array.isArray(payload)) {
    return asRecordArray(payload);
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ["categories", "items", "records", "data", "results"] as const) {
    const rows = asRecordArray(payload[key]);

    if (rows.length > 0) {
      return rows;
    }
  }

  return [];
}

function getPayloadKeys(payload: unknown) {
  return isRecord(payload) ? Object.keys(payload) : [];
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

export default async function CategoriesPage() {
  const result = await fetchCategories();
  const categoryRows = getCategoryRows(result.payload);
  const payloadKeys = getPayloadKeys(result.payload);

  return (
    <main className="min-h-screen bg-[#eef3ef] px-5 py-8 text-[#18211c] sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="border-b border-[#b8c8bb] pb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#51705a]">
            iDSS Category API
          </p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Category Endpoint Check
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#59665d]">
                This page requests {CATEGORY_ENDPOINT_PATH} directly so we can inspect the category hierarchy source separately from listing.categories[].
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-3 text-sm sm:min-w-[420px]">
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Status</dt>
                <dd className="mt-2 text-2xl font-semibold">
                  {result.status ? `${result.status}` : "None"}
                </dd>
              </div>
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Rows</dt>
                <dd className="mt-2 text-2xl font-semibold">{categoryRows.length}</dd>
              </div>
              <div className="border border-[#b8c8bb] bg-white/70 p-4">
                <dt className="text-[#59665d]">Time</dt>
                <dd className="mt-2 text-2xl font-semibold">{result.durationMs}ms</dd>
              </div>
            </dl>
          </div>
        </header>

        <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Endpoint Result</h2>
              <p className="mt-2 text-sm leading-6 text-[#59665d]">
                {result.ok ? "The category endpoint responded successfully." : "The category endpoint needs attention."}
              </p>
            </div>
            <dl className="grid gap-2 text-sm text-[#59665d] sm:grid-cols-2 lg:min-w-[420px]">
              <div>
                <dt className="font-semibold text-[#18211c]">Path</dt>
                <dd className="font-mono text-xs">{CATEGORY_ENDPOINT_PATH}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[#18211c]">Status text</dt>
                <dd>{result.statusText ?? "Missing"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-semibold text-[#18211c]">Top-level payload keys</dt>
                <dd className="font-mono text-xs">{payloadKeys.join(", ") || "None"}</dd>
              </div>
            </dl>
          </div>

          {result.error ? (
            <p className="mt-5 border border-[#ce9b87] bg-[#fff2ec] p-4 text-sm text-[#87442b]">
              {result.error}
            </p>
          ) : null}
        </article>

        <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
          <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold tracking-tight">Detected Category Rows</h2>
            <p className="mt-2 text-sm leading-6 text-[#59665d]">
              Rows are detected from an array response or from common paginated keys like categories, items, records, data, or results.
            </p>
          </div>

          <div className="mt-5 overflow-auto">
            <table className="w-full min-w-[960px] border-collapse text-left text-sm">
              <thead className="text-[#59665d]">
                <tr>
                  <th className="border-b border-[#cdd9cf] py-2 pr-4">category_id</th>
                  <th className="border-b border-[#cdd9cf] py-2 pr-4">category_name</th>
                  <th className="border-b border-[#cdd9cf] py-2 pr-4">parent_id</th>
                  <th className="border-b border-[#cdd9cf] py-2 pr-4">sort_order</th>
                  <th className="border-b border-[#cdd9cf] py-2 pr-4">external_reference</th>
                </tr>
              </thead>
              <tbody>
                {categoryRows.length === 0 ? (
                  <tr>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 text-sm text-[#59665d]" colSpan={5}>
                      No category rows detected. Check the raw payload below for the response shape.
                    </td>
                  </tr>
                ) : categoryRows.map((category, index) => (
                  <tr key={`${getRecordText(category, "category_id") ?? getRecordText(category, "id") ?? index}-${index}`}>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">
                      {getRecordText(category, "category_id") ?? getRecordText(category, "id") ?? ""}
                    </td>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-medium">
                      {getRecordText(category, "category_name") ?? getRecordText(category, "name") ?? ""}
                    </td>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top font-mono text-xs">
                      {getRecordText(category, "parent_id") ?? getRecordText(category, "parent_category_id") ?? ""}
                    </td>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">
                      {getRecordText(category, "sort_order") ?? ""}
                    </td>
                    <td className="border-b border-[#dfe8e1] py-2 pr-4 align-top">
                      {getRecordText(category, "external_reference") ?? ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="border border-[#8fa997] bg-white/80 p-5 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Raw Category Payload</h2>
          <pre className="mt-4 max-h-[620px] overflow-auto border border-[#cdd9cf] bg-[#17211b] p-4 text-xs leading-5 text-[#eef3ef]">
            {formatPayload(result.payload)}
          </pre>
        </article>
      </section>
    </main>
  );
}