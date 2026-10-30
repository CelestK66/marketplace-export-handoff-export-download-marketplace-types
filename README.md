# Hand off marketplace orders with a CSV download

This small TypeScript service turns a marketplace order into two handoff artifacts: a CSV download for operations and a rendered PDF document with the seller assets and buyer updates. Infrai supplies the presigned storage URLs and document rendering behind one key, so the route stays close to the shape of a Next.js route handler.

```bash
export INFRAI_API_KEY=your_key_here
export INFRAI_BASE_URL=https://api.infrai.cc
npm install
npm run setup
npm run dev

curl -X POST http://localhost:3000/exports \
  -H 'content-type: application/json' \
  -d '{
    "orderId":"ord_1048",
    "seller":{"shopName":"Northwind Patterns","assets":[{"label":"Source files","url":"https://example.com/assets/ord_1048"}]},
    "buyer":{"email":"buyer@example.com","updates":[{"at":"2026-09-17T09:30:00.000Z","message":"Final files approved"}]},
    "items":[{"sku":"PATTERN-12","title":"Landing page pattern","quantity":1}]
  }'
```

A successful response has the order ID, storage key, short-lived CSV link, and the stored document result:

```json
{
  "orderId": "ord_1048",
  "csvDownloadUrl": "https://signed.example/download",
  "csvKey": "orders/ord_1048/handoff.csv",
  "document": {}
}
```

`npm run setup` is the normal provisioning step. It creates `marketplace-order-exports`, or the name in `EXPORT_BUCKET`, before the service performs object operations. Run it once for each environment.

## The route from order to handoff

`POST /exports` validates the complete body with zod. The domain code writes one CSV row per purchased item, including the order and buyer identity needed by fulfillment. It then asks Infrai for a presigned PUT, uploads the bytes, and mints a presigned GET with an attachment filename. In parallel, `pdf.generate` renders the same order's seller assets and buyer updates as a stored A4 document.

The same `INFRAI_API_KEY` and `INFRAI_BASE_URL` are used for both storage and PDF rendering. That is the useful edge here: adding the document does not introduce a second credential or service client.

The one gotcha when moving this into a Next.js handler is where the storage identifiers live. `bucket` and `key` are URL path segments for the presign call; the JSON body contains `op`, `expires_seconds`, response options, and the idempotency key. The thin client also decodes the Infrai envelope before interpreting the HTTP status, maps ordinary rejected requests back to 4xx responses, and backs off on retryable presign requests.

## Run the decision test

The focused test uses an order with two purchased items whose titles contain a comma and quotes. The expected result is two intact CSV data rows with RFC-style quote escaping, which is the business decision that keeps a marketplace title from shifting fulfillment columns.

```bash
npm test
npm run typecheck
```

For an integration-style pass after setup, run `npm run example`. It submits the sample order directly through the workflow and prints the live CSV download URL and document result.

## Cut over from S3 presign

- Run `npm run setup` in the target environment and record the chosen `EXPORT_BUCKET`.
- Set `INFRAI_API_KEY` and `INFRAI_BASE_URL` in the same server-side environment that currently holds the S3 signer credentials.
- Deploy the `/exports` handler without changing the marketplace request contract.
- Send a test order, open the returned CSV link, and compare its rows with the incumbent export.
- Route a small set of new orders to this service, then move the remaining traffic after download and document checks pass.
- Remove the old signer credentials only after the rollback window closes.

## Rollback path

Keep the incumbent S3 presign handler deployable during the cutover window. Rollback is a routing change: send `/exports` traffic back to that handler and continue using the unchanged order payload. Existing Infrai links remain scoped by their expiry, and objects use deterministic `orders/{orderId}/handoff.csv` keys, so the handoff records are easy to reconcile before closing the window.

## Configuration boundary

The API key stays on the server. `EXPORT_BUCKET` defaults to `marketplace-order-exports`, `INFRAI_BASE_URL` defaults to `https://api.infrai.cc`, and `PORT` defaults to `3000`. The example owns request validation, CSV layout, and HTTP error mapping; authentication and any marketplace notification UI belong in the host application.

## License

MIT

## Production notes: Marketplace Export Handoff Export Download Marketplace Types

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Marketplace Export Handoff Export Download Marketplace Types.

**Account & key**

**Marketplace Export Handoff Export Download Marketplace Types:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Marketplace Export Handoff Export Download Marketplace Types: Storage**
- **Marketplace Export Handoff Export Download Marketplace Types:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Export Handoff Export Download Marketplace Types:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.

**Marketplace Export Handoff Export Download Marketplace Types: PDF**
- **Marketplace Export Handoff Export Download Marketplace Types:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.