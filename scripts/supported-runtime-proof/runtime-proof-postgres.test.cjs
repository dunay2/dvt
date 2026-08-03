'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createRuntimeProofPostgresProbe,
  hasContiguousRunSequence,
  snapshotsMatch,
} = require('./runtime-proof-postgres.cjs');

test('sequence proof requires exactly contiguous one-based run sequence', () => {
  assert.equal(hasContiguousRunSequence([{ run_seq: 1 }, { run_seq: 2 }, { run_seq: 3 }]), true);
  assert.equal(hasContiguousRunSequence([{ run_seq: 1 }, { run_seq: 3 }]), false);
  assert.equal(hasContiguousRunSequence([{ run_seq: 0 }, { run_seq: 1 }]), false);
});

test('snapshot proof compares authoritative state and sequence', () => {
  const snapshot = { snapshot: { runId: 'run-1', status: 'COMPLETED' }, last_run_seq: 8 };
  assert.equal(snapshotsMatch(snapshot, structuredClone(snapshot)), true);
  assert.equal(snapshotsMatch(snapshot, { ...snapshot, last_run_seq: 7 }), false);
  assert.equal(snapshotsMatch(snapshot, null), false);
});

test('postgres probe scopes evidence queries by tenant and run', async () => {
  const calls = [];
  class FakeClient {
    async connect() {}
    async end() {}
    async query(text, values) {
      calls.push({ text, values });
      return { rows: [{ run_seq: 1, event_type: 'RunStarted' }] };
    }
  }
  const probe = createRuntimeProofPostgresProbe({
    connectionString: 'postgresql://proof',
    schema: 'dvt',
    ClientClass: FakeClient,
  });

  await probe.readEvents('tenant-a', 'run-1');

  assert.match(calls[0].text, /FROM "dvt"\.run_events/);
  assert.deepEqual(calls[0].values, ['tenant-a', 'run-1']);
});
