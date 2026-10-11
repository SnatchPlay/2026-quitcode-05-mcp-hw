// HTTP transport (bonus E1): node src/http.mjs  — listens on 127.0.0.1 only, PORT overrides 3333.
import { createServer } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler, localhostHostValidation, localhostOriginValidation } from "@modelcontextprotocol/node";
import { factory } from "./factory.mjs";

const PORT = Number(process.env.PORT ?? 3333);
const mcp = toNodeHandler(createMcpHandler(factory));
const checkHost = localhostHostValidation();
const checkOrigin = localhostOriginValidation();

createServer(async (req, res) => {
  if (!checkHost(req, res)) return; // the guard has already answered 403
  if (!checkOrigin(req, res)) return;
  await mcp(req, res);
}).listen(PORT, "127.0.0.1", () => {
  console.error(`leaddesk MCP over HTTP: http://127.0.0.1:${PORT}/mcp`);
});
