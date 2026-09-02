import { createHash } from 'node:crypto';

import { jcsCanonicalize } from '@dvt/crypto';

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
  ownership: {
    tenantId: 'tenant-a',
    projectId: 'analytics',
    environmentId: 'prod',
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

export const INVALID_NO_GRAPH_SOURCE_PLANNER_INPUT_FIXTURE = {
  ...VALID_PLANNER_INPUT_FIXTURE,
  graphSource: undefined,
};

export const VALID_EXECUTION_PLAN_V1_FIXTURE = {
  metadata: {
    planVersion: CURRENT_EXECUTION_PLAN_VERSION,
    schemaVersion: '1.0',
    contractVersion: '1.0.0',
    inputHashSha256: HEX_64_A,
    planId: '',
    createdAtIso: '2026-02-26T22:01:00.000Z',
    ownership: {
      tenantId: 'tenant-a',
      projectId: 'analytics',
      environmentId: 'prod',
    },
  },
  steps: [
    {
      stepId: 'model.analytics.customers',
      kind: 'DBT_MODEL',
      dependsOn: [],
      retryPolicy: {
        maxAttempts: 3,
        initialInterval: '1s',
        maximumInterval: '60s',
        backoffCoefficient: 2,
      },
      stepTypeConfig: {
        modelName: 'customers',
      },
    },
    {
      stepId: 'model.analytics.orders',
      kind: 'DBT_MODEL',
      dependsOn: ['model.analytics.customers'],
      retryPolicy: {
        maxAttempts: 3,
        initialInterval: '1s',
        maximumInterval: '60s',
        backoffCoefficient: 2,
      },
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

const VALID_PLAN_CORE_FIXTURE = {
  metadata: {
    planVersion: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planVersion,
    inputHashSha256: VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.inputHashSha256,
  },
  steps: VALID_EXECUTION_PLAN_V1_FIXTURE.steps,
} as const;

const VALID_CANONICAL_PLAN_CORE_JSON = jcsCanonicalize(VALID_PLAN_CORE_FIXTURE);

VALID_EXECUTION_PLAN_V1_FIXTURE.metadata.planId = createHash('sha256')
  .update(VALID_CANONICAL_PLAN_CORE_JSON, 'utf8')
  .digest('hex');

export const VALID_PLANNER_BUILD_RESULT_V1_FIXTURE = {
  plan: VALID_EXECUTION_PLAN_V1_FIXTURE,
  executionPolicy: {
    pluginCompatibilityFingerprint: HEX_64_A,
    requiresCapabilities: ['basic-execution'],
  },
  canonicalPlanCoreJson: VALID_CANONICAL_PLAN_CORE_JSON,
};

export const INVALID_PLANNER_INPUT_FIXTURE = {
  ...VALID_PLANNER_INPUT_FIXTURE,
  graphSource: {
    ...VALID_PLANNER_INPUT_FIXTURE.graphSource,
    nodes: [
      ...VALID_PLANNER_INPUT_FIXTURE.graphSource.nodes,
      {
        nodeId: 'model.analytics.orders',
        stepKind: 'DBT_MODEL',
        dependsOn: [],
      },
    ],
  },
};
