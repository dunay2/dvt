'use strict';

const {
  evaluateRuntimeProof,
  isDeliveryOrderPreserved,
  percentile,
} = require('./runtime-proof-invariants.cjs');
const { startSupportedRuntimeProofLifecycle } = require('./runtime-proof-lifecycle.cjs');
const { hasContiguousRunSequence, snapshotsMatch } = require('./runtime-proof-postgres.cjs');
const {
  buildRuntimeProofDraftSaveRequest,
  buildRuntimeProofPreviewRequest,
  buildRuntimeProofStartRequest,
} = require('./runtime-proof-workload.cjs');

async function executeRuntimeProofIteration(profile, options = {}) {
  const lifecycle = await (options.startLifecycle ?? startSupportedRuntimeProofLifecycle)(profile);
  const acceptedRuns = [];
  const startLatencies = [];
  const completionDurations = [];
  let workerBacklogPeak = 0;
  let postgresInterruptionRejected = false;

  try {
    const planRef = await preparePersistedPlan(lifecycle.api, profile);
    const startRequest = buildRuntimeProofStartRequest(profile, planRef);

    for (let index = 0; index < profile.workload.steadyState.runCount; index += 1) {
      const run = await startAndWaitForCompletion(lifecycle.api, startRequest, profile);
      acceptedRuns.push(run);
      startLatencies.push(run.startLatencyMs);
      completionDurations.push(run.completionDurationMs);
      if (profile.workload.steadyState.launchIntervalMs > 0) {
        await sleep(profile.workload.steadyState.launchIntervalMs);
      }
    }

    await waitForCondition(
      async () => (await lifecycle.postgres.countPendingOutbox(profile.scope.tenantId)) === 0,
      profile.workload.workerInterruption.recoveryTimeoutMs,
      'steady-state outbox drain'
    );

    await lifecycle.stopOutbox();
    for (let index = 0; index < profile.workload.workerInterruption.runCount; index += 1) {
      const run = await startAndWaitForCompletion(lifecycle.api, startRequest, profile);
      acceptedRuns.push(run);
      startLatencies.push(run.startLatencyMs);
      completionDurations.push(run.completionDurationMs);
    }
    await waitForCondition(
      async () => {
        workerBacklogPeak = Math.max(
          workerBacklogPeak,
          await lifecycle.postgres.countPendingOutbox(profile.scope.tenantId)
        );
        return workerBacklogPeak > 0;
      },
      profile.workload.workerInterruption.backlogTimeoutMs,
      'outbox backlog creation'
    );

    const workerRecoveryStartedAt = Date.now();
    await lifecycle.startOutbox();
    await waitForCondition(
      async () => (await lifecycle.postgres.countPendingOutbox(profile.scope.tenantId)) === 0,
      profile.workload.workerInterruption.recoveryTimeoutMs,
      'outbox worker recovery'
    );
    const workerRecoveryMs = Date.now() - workerRecoveryStartedAt;

    lifecycle.stopPostgres();
    try {
      await lifecycle.api.startRun(
        startRequest,
        profile.workload.postgresInterruption.requestTimeoutMs
      );
    } catch {
      postgresInterruptionRejected = true;
    }

    const postgresRecoveryStartedAt = Date.now();
    lifecycle.startPostgres();
    await lifecycle.waitForApiDatabase();
    const recoveryRun = await startAndWaitForCompletion(lifecycle.api, startRequest, profile);
    acceptedRuns.push(recoveryRun);
    startLatencies.push(recoveryRun.startLatencyMs);
    completionDurations.push(recoveryRun.completionDurationMs);
    const postgresRecoveryCompleted = recoveryRun.status === 'COMPLETED';
    const postgresRecoveryMs = Date.now() - postgresRecoveryStartedAt;

    await waitForCondition(
      async () => (await lifecycle.postgres.countPendingOutbox(profile.scope.tenantId)) === 0,
      profile.workload.workerInterruption.recoveryTimeoutMs,
      'final outbox drain'
    );

    const evidence = await collectRunEvidence(lifecycle, profile, acceptedRuns);
    const sinkSnapshot = lifecycle.eventSink.snapshot();
    const expectedKeys = new Set(
      evidence.events.flatMap(({ events }) => events.map((event) => event.idempotency_key))
    );
    const acceptedRunIds = new Set(acceptedRuns.map((run) => run.runId));
    const relevantDeliveries = sinkSnapshot.deliveries.filter((delivery) =>
      acceptedRunIds.has(delivery.runId)
    );
    const deliveredExpectedKeys = new Set(
      relevantDeliveries
        .map((delivery) => delivery.idempotencyKey)
        .filter((key) => expectedKeys.has(key))
    );
    const pendingOutboxCount = await lifecycle.postgres.countPendingOutbox(profile.scope.tenantId);
    const expectedAcceptedCommandCount =
      profile.workload.steadyState.runCount + profile.workload.workerInterruption.runCount + 1;
    const report = {
      profileId: profile.profileId,
      expectedAcceptedCommandCount,
      acceptedCommandCount: acceptedRuns.length,
      startErrorCount: 0,
      completedRunCount: acceptedRuns.filter((run) => run.status === 'COMPLETED').length,
      failedRunCount: acceptedRuns.filter((run) => run.status === 'FAILED').length,
      eventSequencesContiguous: evidence.events.every(({ events }) =>
        hasContiguousRunSequence(events)
      ),
      persistedEventCount: expectedKeys.size,
      deliveredEventCount: deliveredExpectedKeys.size,
      deliveryOrderPreserved: isDeliveryOrderPreserved(relevantDeliveries),
      pendingOutboxCount,
      duplicateDeliveryCount: sinkSnapshot.duplicateDeliveryCount,
      snapshotReplayMismatchCount: evidence.snapshotReplayMismatchCount,
      postgresInterruptionRejected,
      postgresRecoveryCompleted,
      observations: {
        startLatencyMs: summarizeDurations(startLatencies),
        completionDurationMs: summarizeDurations(completionDurations),
        workerBacklogPeak,
        workerRecoveryMs,
        postgresRecoveryMs,
      },
      runIds: acceptedRuns.map((run) => run.runId),
    };

    return { report, evaluation: evaluateRuntimeProof(report) };
  } finally {
    await lifecycle.close();
  }
}

async function preparePersistedPlan(api, profile) {
  await api.saveDraft(buildRuntimeProofDraftSaveRequest(profile));
  const preview = await api.previewPlan(buildRuntimeProofPreviewRequest(profile));
  const planRef = preview.body?.planRef;
  if (planRef === null || typeof planRef !== 'object') {
    throw new Error('Runtime proof preview did not return a persisted planRef');
  }
  return planRef;
}

async function startAndWaitForCompletion(api, startRequest, profile) {
  const startedAt = Date.now();
  const accepted = await api.startRun(startRequest);
  const runId = accepted.body?.runId;
  if (accepted.body?.accepted !== true || typeof runId !== 'string') {
    throw new Error('Runtime proof start command was not accepted');
  }
  const terminal = await waitForCondition(
    async () => {
      const response = await api.getRun(runId, profile.scope.tenantId);
      return ['COMPLETED', 'FAILED', 'CANCELLED'].includes(response.body?.status)
        ? response.body
        : false;
    },
    profile.workload.runCompletionTimeoutMs,
    `run ${runId} completion`
  );

  return {
    runId,
    status: terminal.status,
    startLatencyMs: accepted.durationMs,
    completionDurationMs: Date.now() - startedAt,
  };
}

async function collectRunEvidence(lifecycle, profile, runs) {
  const events = [];
  let snapshotReplayMismatchCount = 0;

  for (const run of runs) {
    const persistedEvents = await lifecycle.postgres.readEvents(profile.scope.tenantId, run.runId);
    events.push({ runId: run.runId, events: persistedEvents });
    const before = await lifecycle.postgres.readSnapshot(profile.scope.tenantId, run.runId);
    await lifecycle.api.rebuildSnapshot(run.runId, profile.scope.tenantId);
    const after = await lifecycle.postgres.readSnapshot(profile.scope.tenantId, run.runId);
    if (!snapshotsMatch(before, after)) snapshotReplayMismatchCount += 1;
  }

  return { events, snapshotReplayMismatchCount };
}

async function waitForCondition(check, timeoutMs, label, pollIntervalMs = 100) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await check();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(
    `${label} did not complete within ${timeoutMs}ms${lastError instanceof Error ? `: ${lastError.message}` : ''}`
  );
}

function summarizeDurations(values) {
  return {
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: Math.max(...values),
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

module.exports = {
  executeRuntimeProofIteration,
  startAndWaitForCompletion,
  waitForCondition,
};
