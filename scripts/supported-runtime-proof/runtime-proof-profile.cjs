'use strict';

const { LOCAL_POSTGRES_CONNECTION_ID } = require('../run-dev-stack.cjs');

const SUPPORTED_RUNTIME_PROOF_PROFILE = deepFreeze({
  schemaVersion: 'dvt-supported-runtime-proof/v1',
  profileId: 'mvp-18-local-v1',
  baselineRunCount: 3,
  budgets: {
    minimumEventThroughputPerSecond: 1.5,
    maximumProjectionFreshnessMs: 1_000,
    maximumStartLatencyP95Ms: 750,
    maximumCompletionDurationP95Ms: 5_000,
    maximumWorkerRecoveryMs: 6_000,
    maximumPostgresRecoveryMs: 25_000,
  },
  scope: {
    tenantId: 'tenant-proof-mvp-18',
    projectId: 'project-proof-mvp-18',
    environmentId: 'env-proof-mvp-18',
  },
  workload: {
    runCompletionTimeoutMs: 60_000,
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: LOCAL_POSTGRES_CONNECTION_ID,
      provider: 'postgres',
    },
    source: { schema: 'raw', table: 'orders' },
    sink: { schema: 'runtime_proof', table: 'orders_snapshot' },
    steadyState: {
      runCount: 5,
      concurrency: 1,
      launchIntervalMs: 50,
    },
    workerInterruption: {
      runCount: 2,
      backlogTimeoutMs: 15_000,
      recoveryTimeoutMs: 30_000,
    },
    postgresInterruption: {
      requestTimeoutMs: 5_000,
      recoveryTimeoutMs: 30_000,
    },
  },
});

function validateSupportedRuntimeProofProfile(profile) {
  const failures = [];

  if (profile?.schemaVersion !== 'dvt-supported-runtime-proof/v1') {
    failures.push('schemaVersion must be dvt-supported-runtime-proof/v1');
  }

  for (const [name, value] of Object.entries(profile?.scope ?? {})) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      failures.push(`scope.${name} must be a non-empty string`);
    }
  }

  if (!isPositiveInteger(profile?.baselineRunCount)) {
    failures.push('baselineRunCount must be a positive integer');
  }
  if (profile?.budgets === null || typeof profile?.budgets !== 'object') {
    failures.push('budgets must be an object');
  } else {
    for (const [name, value] of Object.entries(profile.budgets)) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        failures.push(`budgets.${name} must be a positive number`);
      }
    }
  }
  if (!isPositiveInteger(profile?.workload?.runCompletionTimeoutMs)) {
    failures.push('workload.runCompletionTimeoutMs must be a positive integer');
  }
  const connectionRef = profile?.workload?.connectionRef;
  if (
    connectionRef?.schemaVersion !== 'connection-ref.v1' ||
    connectionRef?.provider !== 'postgres' ||
    typeof connectionRef?.connectionId !== 'string' ||
    connectionRef.connectionId.trim().length === 0
  ) {
    failures.push('workload.connectionRef must identify a governed PostgreSQL connection');
  }

  const steadyState = profile?.workload?.steadyState;
  if (!isPositiveInteger(steadyState?.runCount)) {
    failures.push('workload.steadyState.runCount must be a positive integer');
  }
  if (!isPositiveInteger(steadyState?.concurrency)) {
    failures.push('workload.steadyState.concurrency must be a positive integer');
  } else if (
    isPositiveInteger(steadyState?.runCount) &&
    steadyState.concurrency > steadyState.runCount
  ) {
    failures.push('workload.steadyState.concurrency cannot exceed runCount');
  }

  const workerInterruption = profile?.workload?.workerInterruption;
  if (!isPositiveInteger(workerInterruption?.runCount)) {
    failures.push('workload.workerInterruption.runCount must be a positive integer');
  }

  return failures;
}

function isPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

module.exports = {
  SUPPORTED_RUNTIME_PROOF_PROFILE,
  validateSupportedRuntimeProofProfile,
};
