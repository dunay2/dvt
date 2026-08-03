'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildRuntimeProofOutboxEnv,
  buildRuntimeProofProjectorEnv,
} = require('./runtime-proof-lifecycle.cjs');

test('outbox proof host uses active ownership and disables unrelated retention work', () => {
  const env = buildRuntimeProofOutboxEnv({
    databaseUrl: 'postgresql://proof',
    adminPort: 9464,
    targetUrl: 'http://127.0.0.1:4000/events',
  });

  assert.equal(env.DVT_OUTBOX_OWNERSHIP_MODE, 'active');
  assert.equal(env.DVT_OUTBOX_EVENT_BUS_MODE, 'http');
  assert.equal(env.DVT_OUTBOX_HTTP_TARGET_URL, 'http://127.0.0.1:4000/events');
  assert.equal(env.DVT_OUTBOX_WORKER_RUN_MIGRATIONS, 'false');
  assert.equal(env.DVT_PURGE_ENABLED, 'false');
  assert.equal(env.DVT_RUN_EVENT_RETENTION_ENABLED, 'false');
});

test('projector proof host materializes authoritative snapshots with bounded polling', () => {
  const env = buildRuntimeProofProjectorEnv({
    databaseUrl: 'postgresql://proof',
    adminPort: 9465,
  });

  assert.equal(env.DATABASE_URL, 'postgresql://proof');
  assert.equal(env.DVT_PG_SCHEMA, 'dvt');
  assert.equal(env.DVT_PROJECTOR_ADMIN_PORT, '9465');
  assert.equal(env.DVT_PROJECTOR_POLL_INTERVAL_MS, '50');
  assert.equal(env.DVT_PROJECTOR_ERROR_BACKOFF_MS, '100');
});
