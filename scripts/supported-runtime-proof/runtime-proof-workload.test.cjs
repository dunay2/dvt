'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { SUPPORTED_RUNTIME_PROOF_PROFILE } = require('./runtime-proof-profile.cjs');
const {
  buildRuntimeProofDraftSaveRequest,
  buildRuntimeProofPreviewRequest,
  buildRuntimeProofStartRequest,
} = require('./runtime-proof-workload.cjs');

test('draft and preview describe the same source, sink, and selected closure', () => {
  const draft = buildRuntimeProofDraftSaveRequest(SUPPORTED_RUNTIME_PROOF_PROFILE);
  const preview = buildRuntimeProofPreviewRequest(SUPPORTED_RUNTIME_PROOF_PROFILE);
  const connectionRef = {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'local-postgres-proof',
    provider: 'postgres',
  };

  assert.deepEqual(draft.scope, SUPPORTED_RUNTIME_PROOF_PROFILE.scope);
  assert.deepEqual(draft.draft.nodeIds, ['source_1', 'transform_1', 'sink_1']);
  assert.equal(draft.draft.nodes[0].metadata.schema, 'raw');
  assert.deepEqual(draft.draft.nodes[0].metadata.connectionRef, connectionRef);
  assert.equal(draft.draft.nodes[2].metadata.schema, 'runtime_proof');
  assert.equal(preview.previewProfile, 'planner-generic-v1');
  assert.equal(preview.graphSource.sourceVersion, 'substrait-v1');
  assert.deepEqual(preview.selection, { mode: 'upstream', nodeIds: ['sink_1'] });
  assert.equal(preview.graphSource.nodes[1].stepTypeConfig.sql, 'select * from raw.orders');
  assert.equal(
    preview.graphSource.nodes[1].stepTypeConfig.sinkTable,
    SUPPORTED_RUNTIME_PROOF_PROFILE.workload.sink.table
  );
  for (const node of preview.graphSource.nodes) {
    assert.deepEqual(node.stepTypeConfig.connectionRef, connectionRef);
  }
});

test('planRef starts do not reintroduce planner input', () => {
  const planRef = {
    uri: 'dvt-plan://plan-1',
    sha256: 'c'.repeat(64),
    schemaVersion: '1.0.0',
    planId: 'plan-1',
    planVersion: '1.0.0',
  };

  const command = buildRuntimeProofStartRequest(SUPPORTED_RUNTIME_PROOF_PROFILE, planRef);

  assert.equal(command.planRef, planRef);
  assert.equal(command.targetAdapter, 'temporal');
  assert.equal(command.graphSource, undefined);
  assert.equal(command.runId, undefined);
});
