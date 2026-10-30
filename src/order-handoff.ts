import { z } from "zod";

export const handoffRequestSchema = z.object({
  orderId: z.string().min(1).max(80),
  seller: z.object({
    shopName: z.string().min(1),
    assets: z.array(z.object({ label: z.string().min(1), url: z.string().url() })),
  }),
  buyer: z.object({
    email: z.string().email(),
    updates: z.array(z.object({ at: z.string().datetime(), message: z.string().min(1) })),
  }),
  items: z.array(z.object({ sku: z.string().min(1), title: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

export type HandoffRequest = z.infer<typeof handoffRequestSchema>;

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function buildOrderCsv(input: HandoffRequest): string {
  const rows = [["order_id", "buyer_email", "sku", "title", "quantity"]];
  for (const item of input.items) {
    rows.push([input.orderId, input.buyer.email, item.sku, item.title, String(item.quantity)]);
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function buildHandoffHtml(input: HandoffRequest): string {
  const assets = input.seller.assets.map((asset) => `<li><a href="${escapeHtml(asset.url)}">${escapeHtml(asset.label)}</a></li>`).join("");
  const updates = input.buyer.updates.map((update) => `<li>${escapeHtml(update.at)}: ${escapeHtml(update.message)}</li>`).join("");
  return `<!doctype html><html><body><h1>Order ${escapeHtml(input.orderId)}</h1><p>Seller: ${escapeHtml(input.seller.shopName)}</p><h2>Seller assets</h2><ul>${assets}</ul><h2>Buyer updates</h2><ul>${updates}</ul></body></html>`;
}
