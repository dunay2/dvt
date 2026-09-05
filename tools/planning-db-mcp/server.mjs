/** Owned concern: expose the approved Planning DB read adapter as one localhost MCP HTTP tool. */
import http from 'node:http';
import { pathToFileURL } from 'node:url';

import { createMcpHandler, fromJsonSchema, McpServer } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';

import {
  ALLOWED_PLANNING_DB_QUERIES,
  runPlanningDbQuery,
} from './planningDbQueryAdapter.mjs';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 3333;
const MCP_PATH = '/mcp';
const localOrigins = new Set([`http://${HOST}`, 'http://localhost']);

const inputSchema = fromJsonSchema({
  type: 'object',
  properties: {
    query: { type: 'string', enum: [...ALLOWED_PLANNING_DB_QUERIES] },
    component: { type: 'string', minLength: 1, maxLength: 128 },
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 100 },
  },
  required: ['query'],
  additionalProperties: false,
});

export function createPlanningDbMcpServer() {
  const server = new McpServer({ name: 'dvt-planning-db', version: '1.0.0' });
  server.registerTool(
    'planning_db_query',
    {
      title: 'Query DVT Planning DB',
      description: 'Runs one approved read-only DVT Planning DB governance query with refresh disabled.',
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const text = await runPlanningDbQuery(input);
        return { content: [{ type: 'text', text: text || '(no rows)' }] };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: error instanceof Error ? error.message : 'Planning DB query failed.',
            },
          ],
        };
      }
    }
  );
  return server;
}

function resolvePort(value) {
  if (value === undefined) return DEFAULT_PORT;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DVT_PLANNING_DB_MCP_PORT must be an integer between 1 and 65535.');
  }
  return port;
}

function hasRejectedOrigin(request) {
  const origin = request.headers.origin;
  if (origin == null) return false;
  try {
    const parsed = new URL(origin);
    return !localOrigins.has(`${parsed.protocol}//${parsed.hostname}`);
  } catch {
    return true;
  }
}

export function startPlanningDbMcpServer({
  port = resolvePort(process.env.DVT_PLANNING_DB_MCP_PORT),
} = {}) {
  const mcpHandler = createMcpHandler(() => createPlanningDbMcpServer());
  const nodeHandler = toNodeHandler(mcpHandler);
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', `http://${HOST}`).pathname;
    if (pathname !== MCP_PATH) {
      response.writeHead(404).end();
      return;
    }
    if (hasRejectedOrigin(request)) {
      response.writeHead(403).end();
      return;
    }
    Promise.resolve(nodeHandler(request, response)).catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    });
  });
  server.listen(port, HOST, () => {
    console.log(`DVT Planning DB MCP listening on http://${HOST}:${port}${MCP_PATH}`);
  });
  return server;
}

const isMain = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) startPlanningDbMcpServer();
