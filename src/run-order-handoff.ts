import { exportOrderHandoff } from "./export-order.js";
import { handoffRequestSchema } from "./order-handoff.js";

const input = handoffRequestSchema.parse({
  orderId: "ord_1048",
  seller: {
    shopName: "Northwind Patterns",
    assets: [{ label: "Source files", url: "https://example.com/assets/ord_1048" }],
  },
  buyer: {
    email: "buyer@example.com",
    updates: [{ at: "2026-09-17T09:30:00.000Z", message: "Final files approved" }],
  },
  items: [{ sku: "PATTERN-12", title: "Landing page pattern", quantity: 1 }],
});

console.log(await exportOrderHandoff(input));
