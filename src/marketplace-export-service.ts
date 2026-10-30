import { createServer } from "node:http";
import { ZodError } from "zod";
import { exportOrderHandoff } from "./export-order.js";
import { InfraiError } from "./infrai.js";
import { handoffRequestSchema } from "./order-handoff.js";

const port = Number(process.env.PORT ?? 3000);

function json(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/exports") {
    json(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = handoffRequestSchema.parse(await readJson(request));
    json(response, 201, await exportOrderHandoff(input));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      json(response, 400, { error: "Invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      json(response, status, { error: error.message, code: error.detail.code });
      return;
    }
    json(response, 502, { error: error instanceof Error ? error.message : "Export failed" });
  }
});

server.listen(port, () => console.log(`Marketplace export service listening on http://localhost:${port}`));
