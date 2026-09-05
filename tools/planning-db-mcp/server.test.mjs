/** Owned concern: prove the localhost HTTP boundary exposes only the governed MCP endpoint and tool. */
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, test } from 'node:test';

import { startPlanningDbMcpServer } from './server.mjs';

let httpServer;
let endpoint;

before(async () => {
  httpServer = startPlanningDbMcpServer({ port: 0 });
  await once(httpServer, 'listening');
  const address = httpServer.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, 'object');
  endpoint = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    httpServer.close((error) => (error == null ? resolve() : reject(error)));
  });
});

test('serves only /mcp and rejects non-local browser origins', async () => {
  const missing = await fetch(`${endpoint}/not-mcp`);
  assert.equal(missing.status, 404);

  const rejected = await fetch(`${endpoint}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      origin: 'https://example.com',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });
  assert.equal(rejected.status, 403);
});

test('lists one read-only planning_db_query tool over Streamable HTTP', async () => {
  const response = await fetch(`${endpoint}/mcp`, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-11-25',
      origin: 'http://localhost',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
  });
  assert.equal(response.status, 200);
  const payload = await response.text();
  assert.match(payload, /"name":"planning_db_query"/u);
  assert.match(payload, /"readOnlyHint":true/u);
  assert.doesNotMatch(payload, /sql|insert|update|delete|ddl/iu);
});
