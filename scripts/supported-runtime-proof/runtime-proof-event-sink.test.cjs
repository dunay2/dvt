'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { startRuntimeProofEventSink } = require('./runtime-proof-event-sink.cjs');

test('event sink records real batches and reports duplicate idempotency keys', async (t) => {
  const sink = await startRuntimeProofEventSink({ bearerToken: 'sink-token' });
  t.after(() => sink.close());
  const event = { idempotencyKey: 'run-1:1', runId: 'run-1', runSeq: 1 };

  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(sink.targetUrl, {
      method: 'POST',
      headers: { authorization: 'Bearer sink-token', 'content-type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
    });
    assert.equal(response.status, 202);
  }

  assert.equal(sink.snapshot().deliveries.length, 2);
  assert.equal(sink.snapshot().duplicateDeliveryCount, 1);
});

test('event sink rejects unauthenticated delivery without recording it', async (t) => {
  const sink = await startRuntimeProofEventSink({ bearerToken: 'sink-token' });
  t.after(() => sink.close());

  const response = await fetch(sink.targetUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ events: [{ idempotencyKey: 'run-1:1' }] }),
  });

  assert.equal(response.status, 401);
  assert.equal(sink.snapshot().deliveries.length, 0);
});
