'use strict';

/**
 * Owned concern: exercise the existing prototype fanout and SSE wire contracts.
 * Fastify injection exercises the declared HTTP adapter without opening a service port.
 */
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const test = require('node:test');
const Fastify = createRequire(resolve(__dirname, '../../../../apps/api/package.json'))('fastify');

function event(runId, seq = 1) {
  return {
    eventId: '00000000-0000-4000-8000-000000000001',
    runId,
    seq,
    type: 'node.status',
    ts: '2026-11-24T00:00:00.000Z',
    payload: { nodeId: 'node-a', status: 'RUNNING', attempt: 1 },
  };
}

test('fanout isolates Runs and preserves the original event for every subscriber', async () => {
  const { RunStreamHub } = await import('../src/runStreamHub.ts');
  const hub = new RunStreamHub();
  const first = [],
    second = [],
    foreign = [];
  hub.subscribe('run-a', (value) => first.push(value));
  hub.subscribe('run-a', (value) => second.push(value));
  hub.subscribe('run-b', (value) => foreign.push(value));
  const value = event('run-a');
  hub.publish(value);
  assert.deepEqual(first, [value]);
  assert.deepEqual(second, [value]);
  assert.equal(first[0], value);
  assert.deepEqual(foreign, []);
});

test('duplicate registration does not duplicate delivery and unsubscribe is idempotent', async () => {
  const { RunStreamHub } = await import('../src/runStreamHub.ts');
  const hub = new RunStreamHub();
  const delivered = [];
  const sink = (value) => delivered.push(value.seq);
  const remove = hub.subscribe('run-a', sink);
  hub.subscribe('run-a', sink);
  hub.publish(event('run-a', 1));
  remove();
  remove();
  hub.publish(event('run-a', 2));
  const removeNew = hub.subscribe('run-a', sink);
  hub.publish(event('run-a', 3));
  removeNew();
  assert.deepEqual(delivered, [1, 3]);
});

async function captureSse(message) {
  const { sseHeaders, sseSend } = await import('../src/sse.ts');
  const app = Fastify();
  app.get('/', (_request, reply) => {
    reply.hijack();
    sseHeaders(reply);
    sseSend(reply, message);
    reply.raw.end();
  });
  try {
    return await app.inject({ method: 'GET', url: '/' });
  } finally {
    await app.close();
  }
}

test('SSE uses real HTTP streaming headers and preserves replay identity', async () => {
  const response = await captureSse({ id: '0', event: 'node.status', data: event('run-a') });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'text/event-stream; charset=utf-8');
  assert.equal(response.headers['cache-control'], 'no-cache, no-transform');
  assert.equal(response.headers['x-accel-buffering'], 'no');
  assert.equal(
    response.body,
    `id: 0\nevent: node.status\ndata: ${JSON.stringify(event('run-a'))}\n\n`
  );
});

test('JSON payload line breaks cannot introduce another SSE frame', async () => {
  const data = { message: 'first\n\nid: forged', label: 'ñ' };
  const response = await captureSse({ event: 'node.status', data });
  assert.equal(response.body, `event: node.status\ndata: ${JSON.stringify(data)}\n\n`);
  assert.equal(response.body.split('\n\n').length, 2);
  assert.deepEqual(JSON.parse(response.body.split('\n')[1].slice('data: '.length)), data);
});
