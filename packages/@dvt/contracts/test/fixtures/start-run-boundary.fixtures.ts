import { parsePlanRef, type StartRunCommand, type StartRunResult } from '../../src/index.js';

export const VALID_START_RUN_PLAN_REF_COMMAND_FIXTURE: StartRunCommand = {
  planRef: parsePlanRef({
    uri: 's3://plans/plan-1.json',
    sha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    schemaVersion: 'v1.2',
    planId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    planVersion: '1.0',
  }),
  runId: 'run-1',
  targetAdapter: 'temporal',
  selection: ['model.analytics.orders'],
};

export const VALID_START_RUN_PLANNER_BACKED_COMMAND_FIXTURE: StartRunCommand = {
  runId: 'run-2',
  targetAdapter: 'mock',
  selection: [],
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
  environment: {
    environmentId: 'prod',
    vars: {
      target_name: 'prod',
    },
  },
  observability: {
    tags: {
      route: 'start-run',
    },
  },
};

export const VALID_START_RUN_RESULTS_FIXTURES: readonly StartRunResult[] = [
  {
    kind: 'accepted',
    runId: 'run-1',
    accepted: true,
  },
  {
    kind: 'duplicate',
    runId: 'run-1',
    accepted: true,
    duplicateOf: 'intent',
  },
  {
    kind: 'tenant_backpressure',
    accepted: false,
    code: 'TENANT_BACKPRESSURE',
    retryAfterSeconds: 30,
  },
  {
    kind: 'system_backpressure',
    accepted: false,
    code: 'BACKPRESSURE_SNAPSHOT_UNAVAILABLE',
    retryAfterSeconds: 30,
  },
  {
    kind: 'rate_limited',
    accepted: false,
    code: 'OUTBOX_RATE_LIMIT_EXCEEDED',
    retryAfterSeconds: 15,
  },
  {
    kind: 'plan_rejected',
    accepted: false,
    code: 'UNSUPPORTED_PLAN_VERSION',
    reason: 'Unsupported plan version: 2.0',
    supportedVersions: ['1.0'],
  },
] as const;
