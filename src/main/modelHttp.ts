const BODY_PREVIEW_CHARS = 300;

export async function readJsonObjectResponse(
  response: Response,
  label: string
): Promise<Record<string, unknown>> {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(formatHttpError(response, body, `${label} request failed`));
  }

  try {
    return parseJsonObject(body);
  } catch (error) {
    throw new Error(formatHttpError(response, body, `${label} response is not valid JSON`), {
      cause: error
    });
  }
}

export async function validateJsonSuccess(response: Response, label: string): Promise<void> {
  await readJsonObjectResponse(response, label);
}

function parseJsonObject(body: string): Record<string, unknown> {
  const parsed = JSON.parse(body) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("JSON root is not an object");
  }

  return parsed;
}

function formatHttpError(response: Response, body: string, message: string): string {
  return [
    `${message}: HTTP ${response.status}`,
    `content-type ${response.headers.get("content-type") ?? "unknown"}`,
    `body preview: ${previewBody(body)}`
  ].join("; ");
}

function previewBody(body: string): string {
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length > BODY_PREVIEW_CHARS ? `${compact.slice(0, BODY_PREVIEW_CHARS)}...` : compact;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
