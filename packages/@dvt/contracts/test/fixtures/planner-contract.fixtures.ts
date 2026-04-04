import { CURRENT_EXECUTION_PLAN_VERSION } from '../../src/index.js';

/**
 * Fixtures mínimos para validar el contrato normativo del planner (GAP-P0-02).
 */

export const HEX_64_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
export const HEX_64_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

export const VALID_PLANNER_INPUT_FIXTURE = {
  graphSource: {
    kind: 'generic-graph-v1',
    sourceFamily: 'dbt',
    sourceVersion: '1.0',
    nodes: [
      {
        nodeId: 'model.analytics.customers',
        stepKind: 'DBT_MODEL',
        dependsOn: [],
      },
      {
        nodeId: 'model.analytics.orders',
        stepKind: 'DBT_MODEL',
        dependsOn: ['model.analytics.customers'],
      },
    ],
  },
  selection: {
    selectedNodeIds: ['model.analytics.orders'],
    includeUpstream: true,
  },
  policies: {
    retry: {
      kind: 'at-most-N',
      maxAttempts: 3,
    },
    timeout: {
      kind: 'budget',
      maxSeconds: 120,
    },
    concurrency: {
      kind: 'bounded',
      maxParallel: 8,
    },
  },
  environment: {
    environmentId: 'prod',
    targetProfile: 'warehouse',
    vars: {
      full_refresh: false,
      threads: 4,
    },
  },
  observability: {
    tags: {
      tenantId: 'tenant-a',
      projectId: 'analytics',
    },
    extra: {
      requestSource: 'contracts-test',
    },
  },
  requestedBy: 'ci-bot',
  requestId: 'req-20260226-0001',
  requestedAtIso: '2026-02-26T22:00:00.000Z',
};

export const NO_SOURCE_PLANNER_INPUT_FIXTURE = {
  selection: {
    selectedNodeIds: ['model.analytics.orders'],
  },
};

export const MULTI_SOURCE_PLANNER_INPUT_FIXTURE = {
  ...VALID_PLANNER_INPUT_FIXTURE,
  manifestRef: {
    uri: 's3://acme-dbt-artifacts/prod/manifest.json',
    sha256: HEX_64_A,
    artifactId: 'manifest-prod-20260226',
  },
};

export const VALID_EXECUTION_PLAN_V2_FIXTURE = {
  metadata: {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: 'v1.2',
    contractVersion: '1.0.0',
    inputHashSha256: HEX_64_A,
    planId: HEX_64_B,
    createdAtIso: '2026-02-26T22:01:00.000Z',
  },
  steps: [
    {
      stepId: 'model.analytics.customers',
      kind: 'DBT_MODEL',
      dependsOn: [],
      stepTypeConfig: {
        modelName: 'customers',
      },
    },
    {
      stepId: 'model.analytics.orders',
      kind: 'DBT_MODEL',
      dependsOn: ['model.analytics.customers'],
      stepTypeConfig: {
        modelName: 'orders',
      },
    },
  ],
  observability: {
    tags: {
      tenantId: 'tenant-a',
    },
  },
};

export const VALID_PLANNER_BUILD_RESULT_V2_FIXTURE = {
  plan: VALID_EXECUTION_PLAN_V2_FIXTURE,
  canonicalPlanJson: JSON.stringify({
    metadata: {
      planVersion: CURRENT_EXECUTION_PLAN_VERSION,
      inputHashSha256: HEX_64_A,
    },
    steps: VALID_EXECUTION_PLAN_V2_FIXTURE.steps,
  }),
};

export const INVALID_PLANNER_INPUT_FIXTURE = {
  ...VALID_PLANNER_INPUT_FIXTURE,
  manifestRef: {
    uri: 's3://acme-dbt-artifacts/prod/manifest.json',
    sha256: 'not-a-sha256',
  },
};
