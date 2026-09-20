#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSessionTools } from "./tools/session.js";
import { registerPipelineTools } from "./tools/pipeline.js";
import { registerScaffoldTools } from "./tools/scaffold.js";
import { registerDriftTools } from "./tools/drift.js";

const server = new McpServer({
  name: "aistarter-mcp",
  version: "0.1.0",
});

registerSessionTools(server);
registerPipelineTools(server);
registerScaffoldTools(server);
registerDriftTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
