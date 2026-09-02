/**
 * Owned concern: provide canonical command/result fixtures for the
 * StartRunBoundary contract tests.
 */
import {
  asNonBlankString,
  parsePlanRef,
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
  START_RUN_PLAN_REJECTION_CODE,
  START_RUN_RATE_LIMIT_CODE,
  START_RUN_RESULT_KIND,
  START_RUN_TARGET_ADAPTER,
  type StartRunCommand,
  type StartRunResult,
} from '../../src/index.js';

export const VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE: StartRunCommand = {
  planRef: parsePlanRef({
    uri: 's3://plans/plan-1.json',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    schemaVersion: '1.0',
    planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    planVersion: '1.0',
  }),
  runId: 'run-1',
  targetAdapter: START_RUN_TARGET_ADAPTER.temporal,
  selection: {
    mode: 'explicit',
    nodeIds: [asNonBlankString('model.analytics.orders')],
  },
};

export const VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE: StartRunCommand = {
  runId: 'run-2',
  targetAdapter: START_RUN_TARGET_ADAPTER.temporal,
  selection: {
    mode: 'explicit',
    nodeIds: [asNonBlankString('model.analytics.orders')],
  },
  graphSource: {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: 'manifest-v10',
    nodes: [
      {
        nodeId: 'model.analytics.orders',
        stepKind: 'DBT_MODEL',
        dependsOn: [],
      },
    ],
  },
  policies: {
    retry: { kind: 'at-most-once' },
  },
  observability: {
    tags: {
      route: 'start-run',
    },
  },
};

export const VALID_START_RUN_RESULTS_FIXTURES: readonly StartRunResult[] = [
  {
    kind: START_RUN_RESULT_KIND.accepted,
    runId: 'run-1',
    accepted: true,
  },
  {
    kind: START_RUN_RESULT_KIND.duplicate,
    runId: 'run-1',
    accepted: true,
    duplicateOf: START_RUN_DUPLICATE_OF.intent,
  },
  {
    kind: START_RUN_RESULT_KIND.tenantBackpressure,
    accepted: false,
    code: START_RUN_BACKPRESSURE_CODE.tenant,
    retryAfterSeconds: 30,
  },
  {
    kind: START_RUN_RESULT_KIND.systemBackpressure,
    accepted: false,
    code: START_RUN_BACKPRESSURE_CODE.snapshotUnavailable,
    retryAfterSeconds: 30,
  },
  {
    kind: START_RUN_RESULT_KIND.systemBackpressure,
    accepted: false,
    code: START_RUN_BACKPRESSURE_CODE.capacitySignalUnavailable,
    retryAfterSeconds: 30,
  },
  {
    kind: START_RUN_RESULT_KIND.rateLimited,
    accepted: false,
    code: START_RUN_RATE_LIMIT_CODE.outboxExceeded,
    retryAfterSeconds: 15,
  },
  {
    kind: START_RUN_RESULT_KIND.planRejected,
    accepted: false,
    code: START_RUN_PLAN_REJECTION_CODE.unsupportedPlanVersion,
    reason: 'Unsupported plan version: 2.0',
    supportedVersions: ['1.0'],
  },
] as const;
