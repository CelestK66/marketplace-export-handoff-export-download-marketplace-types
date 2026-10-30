import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderCsv, handoffRequestSchema } from "../src/order-handoff.js";

test("the handoff CSV keeps every purchased line and safely quotes marketplace text", () => {
  const order = handoffRequestSchema.parse({
    orderId: "ord_204",
    seller: { shopName: "Pixel Foundry", assets: [] },
    buyer: { email: "buyer@example.com", updates: [] },
    items: [
      { sku: "UI-1", title: "Dashboard, dark", quantity: 1 },
      { sku: "ICON-2", title: "Icon \"Starter\"", quantity: 2 },
    ],
  });

  assert.equal(
    buildOrderCsv(order),
    "order_id,buyer_email,sku,title,quantity\n" +
      "ord_204,buyer@example.com,UI-1,\"Dashboard, dark\",1\n" +
      "ord_204,buyer@example.com,ICON-2,\"Icon \"\"Starter\"\"\",2\n",
  );
});
