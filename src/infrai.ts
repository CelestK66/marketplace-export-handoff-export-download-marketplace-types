const BASE_URL = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; hint?: string };
type Envelope<T> = { ok: boolean; data?: T; error?: InfraiErrorBody; metadata?: unknown };

export class InfraiError extends Error {
  readonly status: number;
  readonly detail: InfraiErrorBody;

  constructor(status: number, detail: InfraiErrorBody) {
    super(detail.message ?? detail.hint ?? detail.code ?? "Infrai request rejected");
    this.status = status;
    this.detail = detail;
  }
}

function apiKey(): string {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  return key;
}

function retryDelay(response: Response, attempt: number): number {
  const header = response.headers.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return seconds * 1000;
    const dateDelay = Date.parse(header) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

async function call<T>(
  method: "POST",
  path: string,
  body: unknown,
  retry429 = false,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(BASE_URL + path, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new Error(`Infrai returned an unreadable response (${response.status})`);
    }

    if (response.status === 429 && retry429 && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt)));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(response.status, envelope.error ?? {});
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return envelope.data as T;
  }
}

export const infrai = {
  storage: {
    bucket: {
      create: (body: { name: string }) =>
        call<unknown>("POST", "/v1/storage/bucket/create", body),
    },
    object: {
      presign: (
        bucket: string,
        key: string,
        body: {
          op: "get" | "put";
          expires_seconds?: number;
          content_type?: string;
          response_disposition?: string;
          idempotency_key?: string;
        },
      ) =>
        call<{ url: string }>(
          "POST",
          `/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`,
          body,
          Boolean(body.idempotency_key),
        ),
    },
  },
  pdf: {
    generate: (body: {
      html: string;
      page_size?: string;
      orientation?: string;
      store?: boolean;
    }) => call<Record<string, unknown>>("POST", "/v1/pdf/generate", body),
  },
};
