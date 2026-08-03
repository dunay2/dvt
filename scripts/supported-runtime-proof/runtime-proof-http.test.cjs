'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createRuntimeProofApiClient, requestJson } = require('./runtime-proof-http.cjs');

test('API client sends authenticated planRef commands through protected routes', async () => {
  const calls = [];
  const client = createRuntimeProofApiClient({
    baseUrl: 'http://127.0.0.1:3100',
    bearerToken: 'proof-token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({ accepted: true, runId: 'run-1' }), { status: 202 });
    },
  });

  await client.startRun({ planRef: { planId: 'plan-1' } });

  assert.equal(calls[0].url, 'http://127.0.0.1:3100/runs/start');
  assert.equal(calls[0].options.headers.authorization, 'Bearer proof-token');
  assert.equal(calls[0].options.method, 'POST');
});

test('requestJson preserves non-success status and parsed response for fail-closed proof', async () => {
  await assert.rejects(
    requestJson({
      fetchImpl: async () =>
        new Response(JSON.stringify({ error: { reason: 'database_unavailable' } }), {
          status: 503,
        }),
      url: 'http://127.0.0.1:3100/runs/start',
      method: 'POST',
      payload: {},
      expectedStatuses: [202],
    }),
    (error) => {
      assert.equal(error.statusCode, 503);
      assert.equal(error.responseBody.error.reason, 'database_unavailable');
      return true;
    }
  );
});
