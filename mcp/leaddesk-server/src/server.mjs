// stdio transport: node src/server.mjs  (LEADDESK_FIXTURE=/path/to/leads.json to override the fixture)
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { factory } from "./factory.mjs";

await serveStdio(factory);
