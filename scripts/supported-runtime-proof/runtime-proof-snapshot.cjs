'use strict';

let canonicalDependencies;

async function projectCanonicalSnapshot(runId, persistedEvents) {
  const { applyRunEvent, schemaVersion } = await loadCanonicalDependencies();
  const snapshot = {
    schemaVersion,
    runId,
    status: 'PENDING',
    paused: false,
    cancelling: false,
    gatewayDecisions: {},
    steps: {},
  };

  for (const event of persistedEvents) {
    applyRunEvent(snapshot, event.payload);
  }

  return {
    snapshot,
    last_run_seq: persistedEvents.at(-1)?.run_seq ?? 0,
  };
}

async function loadCanonicalDependencies() {
  canonicalDependencies ??= Promise.all([
    import('../../packages/@dvt/run-domain/dist/index.js'),
    import('../../packages/@dvt/contracts/dist/index.js'),
  ]).then(([runDomain, contracts]) => ({
    applyRunEvent: runDomain.applyRunEvent,
    schemaVersion: contracts.CURRENT_WORKFLOW_SNAPSHOT_SCHEMA_VERSION,
  }));
  return canonicalDependencies;
}

module.exports = { projectCanonicalSnapshot };
