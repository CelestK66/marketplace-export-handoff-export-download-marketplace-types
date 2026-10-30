import { infrai } from "./infrai.js";

const bucket = process.env.EXPORT_BUCKET ?? "marketplace-order-exports";
await infrai.storage.bucket.create({ name: bucket });
console.log(`Export bucket ready: ${bucket}`);
