import { describe, expect, it, vi } from 'vitest';

import type { ApiClient } from '../api/createApiClient';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import { createPlansService } from './plansService';

const VALID_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'canvas-canonical-graph',
  sourceVersion: 'planner-generic-v1',
  nodes: [{ nodeId: 'node_1', stepKind: 'CANVAS_TRANSFORM', dependsOn: [] }],
} as const;

function buildValidContractPlan(): Readonly<Record<string, unknown>> {
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: 'v1.2',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
    steps: [],
    observability: {
      tags: {
        adapter: 'temporal',
        environmentId: 'dev',
      },
    },
  } as const;
}

function buildContractPlanWithRetryPolicy(): Readonly<Record<string, unknown>> {
  return {
    ...buildValidContractPlan(),
    steps: [
      {
        stepId: 'step_1',
        kind: 'DBT_MODEL',
        dependsOn: [],
        retryPolicy: {
          maxAttempts: 4,
          initialInterval: '2s',
          maximumInterval: '30s',
          backoffCoefficient: 2,
        },
        stepTypeConfig: {
          name: 'customers',
          nodeIds: ['model.analytics.customers'],
        },
      },
    ],
  } as const;
}

function buildValidPlanRef() {
  return makePlanRef({
    uri: 'dvt://plans/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sha256: 'b'.repeat(64),
    schemaVersion: 'v1.2',
    planId: 'b'.repeat(64),
    planVersion: 'v1',
  });
}

function buildApiClientStub(overrides: Partial<ApiClient> = {}): ApiClient {
  const base: ApiClient = {
    baseUrl: 'http://localhost:3000',
    requestRaw: vi.fn(),
    getJson: vi.fn(),
    postJson: vi.fn(),
  };

  return {
    ...base,
    ...overrides,
  };
}

describe('createPlansService', () => {
  it('uses mock implementation in mock mode', async () => {
    const service = createPlansService('mock');

    const plan = await service.previewPlan({
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_GRAPH_SOURCE,
      selectedNodeIds: ['node_1'],
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'mock',
      }),
    });

    expect(plan.planId).toBeTypeOf('string');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('routes to api implementation in api mode', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidContractPlan(),
      planRef: buildValidPlanRef(),
      planSummary: {
        executor: 'postgres',
        nodeCount: 3,
        stepCount: 2,
        sourceTables: ['raw.orders'],
        sinkTables: ['analytics.orders_daily'],
      },
      persisted: {
        planRecordId: 'plan-record-1',
        canonicalPlanSha256: 'c'.repeat(64),
      },
      provenance: {
        graphArtifact: {
          repo: 'dunay2/dvt',
          path: 'graphs/orders.json',
        },
        sqlArtifact: {
          repo: 'dunay2/dvt',
          path: 'sql/orders.sql',
        },
      },
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await service.previewPlan({
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_GRAPH_SOURCE,
      selectedNodeIds: ['node_1'],
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.planRef).toEqual(buildValidPlanRef());
    expect(plan.preview).toMatchObject({
      summary: {
        executor: 'postgres',
        sourceTables: ['raw.orders'],
        sinkTables: ['analytics.orders_daily'],
      },
      persisted: {
        planRecordId: 'plan-record-1',
      },
      provenance: {
        graphArtifact: {
          path: 'graphs/orders.json',
        },
        sqlArtifact: {
          path: 'sql/orders.sql',
        },
      },
    });

    expect(postJsonMock).toHaveBeenCalledWith(
      '/plans/preview',
      expect.objectContaining({
        previewProfile: 'transformation-sql-first-v1',
        graphSource: VALID_GRAPH_SOURCE,
        selectedNodeIds: ['node_1'],
        persist: true,
      })
    );
  });

  it('rejects api payloads that do not include planRef', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidContractPlan(),
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    await expect(
      service.previewPlan({
        previewProfile: 'transformation-sql-first-v1',
        graphSource: VALID_GRAPH_SOURCE,
        selectedNodeIds: ['node_1'],
        persist: true,
        context: makeRunContext('run-1', {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          targetAdapter: 'temporal',
        }),
      })
    ).rejects.toThrow('Invalid plans payload: expected { plan, planRef }');
  });

  it('maps importPlan responses from backend-owned planRef payloads', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidContractPlan(),
      planRef: {
        ...buildValidPlanRef(),
        uri: 'dvt-plan://plans/backend-owned-import-ref',
      },
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );
    const context = makeRunContext('run-1', {
      tenantId: 't1',
      projectId: 'p1',
      environmentId: 'e1',
      targetAdapter: 'temporal',
    });

    const plan = await service.importPlan(buildValidPlanRef(), context);

    expect(plan.planRef).toEqual({
      ...buildValidPlanRef(),
      uri: 'dvt-plan://plans/backend-owned-import-ref',
    });
    expect(postJsonMock).toHaveBeenCalledWith('/plans/import', {
      planRef: buildValidPlanRef(),
      context,
    });
  });

  it('maps step retryPolicy into UI retry counts with canonical precedence', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildContractPlanWithRetryPolicy(),
      planRef: buildValidPlanRef(),
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await service.previewPlan({
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_GRAPH_SOURCE,
      selectedNodeIds: ['node_1'],
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.steps[0]).toMatchObject({
      id: 'step_1',
      name: 'customers',
      nodes: ['model.analytics.customers'],
      policies: {
        retries: 3,
      },
    });
  });

  it('rejects import payloads that do not include planRef', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidContractPlan(),
    }));
    const service = createPlansService(
      'api',
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    await expect(
      service.importPlan(buildValidPlanRef(), {
        ...makeRunContext('run-1', {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          targetAdapter: 'temporal',
        }),
      })
    ).rejects.toThrow('Invalid plans payload: expected { plan, planRef }');
  });
});
