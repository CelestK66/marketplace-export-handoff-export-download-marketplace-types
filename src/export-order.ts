import { randomUUID } from "node:crypto";
import { infrai } from "./infrai.js";
import { buildHandoffHtml, buildOrderCsv, type HandoffRequest } from "./order-handoff.js";

const BUCKET = process.env.EXPORT_BUCKET ?? "marketplace-order-exports";

export type ExportResult = {
  orderId: string;
  csvDownloadUrl: string;
  csvKey: string;
  document: Record<string, unknown>;
};

export async function exportOrderHandoff(input: HandoffRequest): Promise<ExportResult> {
  const csv = buildOrderCsv(input);
  const csvKey = `orders/${input.orderId}/handoff.csv`;
  const operationId = randomUUID();
  const upload = await infrai.storage.object.presign(BUCKET, csvKey, {
    op: "put",
    expires_seconds: 300,
    content_type: "text/csv; charset=utf-8",
    idempotency_key: `${operationId}:upload`,
  });

  const uploadResponse = await fetch(upload.url, {
    method: "PUT",
    headers: { "Content-Type": "text/csv; charset=utf-8" },
    body: csv,
  });
  if (!uploadResponse.ok) throw new Error(`CSV upload failed (${uploadResponse.status})`);

  const [download, document] = await Promise.all([
    infrai.storage.object.presign(BUCKET, csvKey, {
      op: "get",
      expires_seconds: 900,
      response_disposition: `attachment; filename="order-${input.orderId}.csv"`,
      idempotency_key: `${operationId}:download`,
    }),
    infrai.pdf.generate({
      html: buildHandoffHtml(input),
      page_size: "A4",
      orientation: "portrait",
      store: true,
    }),
  ]);

  return { orderId: input.orderId, csvDownloadUrl: download.url, csvKey, document };
}
