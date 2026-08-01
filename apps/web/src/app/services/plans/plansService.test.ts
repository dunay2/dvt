import { parseExecutionSelection, type ExecutionSelection } from '@dvt/contracts';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api/createApiClient';
import type { ApiClient } from '../api/createApiClient';

import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import { createMockPlansService } from '../../../testing/plansPortDoubles';
import type { IPlansPort, PlanPreviewInput, PreviewedPlanViewModel } from '../../ports/plans';
import { createPlansService } from './plansService';

const VALID_TRANSFORMATION_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'transformation-design-graph',
  sourceVersion: 'transformation-sql-first-v1',
  nodes: [
    {
      nodeId: 'source-node',
      stepKind: 'PREPARE_POSTGRES_TRANSFORM',
      dependsOn: [],
      stepTypeConfig: {
        targetSchema: 'analytics',
        sourceSchema: 'raw',
        sourceTable: 'orders',
        sourceAlias: 'orders_src',
      },
    },
    {
      nodeId: 'transform-node',
      stepKind: 'POSTGRES_SQL_TRANSFORM',
      dependsOn: ['source-node'],
      stepTypeConfig: {
        dialect: 'postgres',
        entrypoint: 'sql/orders.sql',
        sql: 'select * from raw.orders',
        sqlArtifact: {
          repo: 'dunay2/dvt',
          path: 'sql/orders.sql',
          ref: 'refs/heads/main',
          commitSha: 'commit-sql-1',
          contentSha256: 'e'.repeat(64),
        },
        sourceSchema: 'raw',
        sourceTable: 'orders',
        sourceAlias: 'orders_src',
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
    {
      nodeId: 'sink-node',
      stepKind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
      dependsOn: ['transform-node'],
      stepTypeConfig: {
        sinkSchema: 'analytics',
        sinkTable: 'orders_daily',
        materialization: 'table',
        writeMode: 'replace',
      },
    },
  ],
} as const;

const VALID_GENERIC_GRAPH_SOURCE = {
  kind: 'generic-graph-v1',
  sourceFamily: 'dbt',
  sourceVersion: 'manifest-v10',
  nodes: [{ nodeId: 'node_1', stepKind: 'DBT_MODEL', dependsOn: [] }],
} as const;

const VALID_TRANSFORMATION_SELECTION = ['source-node', 'transform-node', 'sink-node'] as const;
const VALID_GENERIC_SELECTION = ['node_1'] as const;

function toExplicitSelection(nodeIds: readonly string[]): ExecutionSelection {
  return parseExecutionSelection({
    mode: 'explicit' as const,
    nodeIds: [...nodeIds],
  });
}

function buildValidTransformationPlan(): Readonly<Record<string, unknown>> {
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'source-node',
        kind: 'PREPARE_POSTGRES_TRANSFORM',
        dependsOn: [],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[0].stepTypeConfig,
      },
      {
        stepId: 'transform-node',
        kind: 'POSTGRES_SQL_TRANSFORM',
        dependsOn: ['source-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[1].stepTypeConfig,
      },
      {
        stepId: 'sink-node',
        kind: 'CAPTURE_MATERIALIZATION_EVIDENCE',
        dependsOn: ['transform-node'],
        stepTypeConfig: VALID_TRANSFORMATION_GRAPH_SOURCE.nodes[2].stepTypeConfig,
      },
    ],
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
    metadata: {
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
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
    observability: {
      tags: {
        adapter: 'temporal',
        environmentId: 'dev',
      },
    },
  } as const;
}

function buildContractPlanWithRetiredRetryConfig(): Readonly<Record<string, unknown>> {
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'step_1',
        kind: 'DBT_MODEL',
        dependsOn: [],
        stepTypeConfig: {
          name: 'customers',
          nodeIds: ['model.analytics.customers'],
          retries: 9,
        },
      },
    ],
    observability: {
      tags: {
        adapter: 'temporal',
        environmentId: 'dev',
      },
    },
  } as const;
}

function buildGenericContractPlanWithoutNodeIds(): Readonly<Record<string, unknown>> {
  return {
    metadata: {
      planVersion: '1.0',
      schemaVersion: '1.0',
      contractVersion: '1.0.0',
      inputHashSha256: 'a'.repeat(64),
      planId: 'b'.repeat(64),
      createdAtIso: '2026-04-03T00:00:00.000Z',
    },
    steps: [
      {
        stepId: 'model-orders',
        kind: 'DBT_MODEL',
        dependsOn: [],
        stepTypeConfig: {
          name: 'Orders Model',
        },
      },
    ],
    observability: {
      tags: {
        adapter: 'temporal',
        environmentId: 'dev',
      },
    },
  } as const;
}

function buildValidPlanRef(): ReturnType<typeof makePlanRef> {
  return makePlanRef({
    uri: 'dvt://plans/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    sha256: 'b'.repeat(64),
    schemaVersion: '1.0',
    planId: 'b'.repeat(64),
    planVersion: 'v1',
  });
}

function buildTransformationPreviewPayload(
  overrides: Readonly<Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    previewProfile: 'transformation-sql-first-v1',
    plan: buildValidTransformationPlan(),
    planRef: buildValidPlanRef(),
    planSummary: {
      executor: 'postgres',
      nodeCount: 3,
      stepCount: 3,
      sourceTables: ['raw.orders'],
      sinkTables: ['analytics.orders_daily'],
    },
    persisted: {
      planRecordId: 'plan-record-1',
      canonicalPlanSha256: 'c'.repeat(64),
    },
    validation: {
      valid: true,
      warnings: [],
    },
    provenance: {
      kind: 'transformation-git-artifacts',
      graphArtifact: {
        repo: 'dunay2/dvt',
        path: 'graphs/orders.json',
        ref: 'refs/heads/main',
        commitSha: 'commit-graph-1',
        contentSha256: 'd'.repeat(64),
      },
      sqlArtifact: {
        repo: 'dunay2/dvt',
        path: 'sql/orders.sql',
        ref: 'refs/heads/main',
        commitSha: 'commit-sql-1',
        contentSha256: 'e'.repeat(64),
      },
    },
    ...overrides,
  } as const;
}

function buildGenericPreviewPayload(
  plan: Readonly<Record<string, unknown>> = buildContractPlanWithRetryPolicy()
): Record<string, unknown> {
  return {
    previewProfile: 'planner-generic-v1',
    plan,
    planRef: buildValidPlanRef(),
    persisted: {
      planRecordId: 'plan-record-1',
      canonicalPlanSha256: 'c'.repeat(64),
    },
    validation: {
      valid: true,
      warnings: [],
    },
  } as const;
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

function createPlanRejectedApiError(details: Record<string, unknown>): ApiError {
  return new ApiError({
    message: 'HTTP 422',
    endpoint: '/plans/preview',
    statusCode: 422,
    category: 'client',
    responseBody: {
      error: {
        type: 'unprocessable',
        reason: 'plan_rejected',
        details,
      },
    },
  });
}

function buildGenericPreviewInput(): PlanPreviewInput {
  return {
    previewProfile: 'planner-generic-v1',
    graphSource: VALID_GENERIC_GRAPH_SOURCE,
    selection: toExplicitSelection(VALID_GENERIC_SELECTION),
    persist: true,
    context: makeRunContext('run-1'),
  };
}

async function previewAccepted(
  service: IPlansPort,
  input: PlanPreviewInput
): Promise<PreviewedPlanViewModel> {
  const outcome = await service.previewPlan(input);
  expect(outcome.kind).toBe('accepted');
  if (outcome.kind !== 'accepted') {
    throw new Error(`Expected accepted preview, received ${outcome.kind}`);
  }
  return outcome.plan;
}

describe('createPlansService', () => {
  it('keeps the explicit plan-port test double contract usable', async () => {
    const service = createMockPlansService();

    const plan = await previewAccepted(service, {
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.planId).toBeTypeOf('string');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('routes to the API implementation', async () => {
    const postJsonMock = vi.fn(async () => buildTransformationPreviewPayload());
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.planRef).toEqual(buildValidPlanRef());
    expect(plan.steps.map((step) => step.type)).toEqual([
      'PREPARE_POSTGRES_TRANSFORM',
      'POSTGRES_SQL_TRANSFORM',
      'CAPTURE_MATERIALIZATION_EVIDENCE',
    ]);
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
        graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
        persist: true,
      })
    );
  });

  it('prefers scoped environment tags when projecting the UI target', async () => {
    const postJsonMock = vi.fn(async () =>
      buildTransformationPreviewPayload({
        plan: {
          ...buildValidTransformationPlan(),
          observability: {
            tags: {
              adapter: 'temporal',
              environmentId: 'retired-env',
              'dvt.scope.environmentId': 'scoped-env',
            },
          },
        },
      })
    );
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.target).toBe('scoped-env');
  });

  it('derives transformation preview step nodes from step ids when canonical nodeIds are absent', async () => {
    const postJsonMock = vi.fn(async () =>
      buildTransformationPreviewPayload({
        plan: buildValidTransformationPlan(),
      })
    );
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'transformation-sql-first-v1',
      graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.steps.map((step) => step.nodes)).toEqual([
      ['source-node'],
      ['transform-node'],
      ['sink-node'],
    ]);
  });

  it('rejects api payloads that do not include planRef', async () => {
    const postJsonMock = vi.fn(async () => {
      const payload = { ...buildTransformationPreviewPayload() } as Record<string, unknown>;
      delete payload.planRef;
      return payload;
    });
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    await expect(
      service.previewPlan({
        previewProfile: 'transformation-sql-first-v1',
        graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
        persist: true,
        context: makeRunContext('run-1', {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          targetAdapter: 'temporal',
        }),
      })
    ).rejects.toThrow('Validation failed');
  });

  it.each([
    {
      cause: 'dependency_gap',
      reason: 'Selected closure is missing required upstream dependencies.',
    },
    {
      cause: 'selected_node_missing',
      reason: 'Selected nodes are no longer available in the authoritative draft.',
    },
    {
      cause: 'cycle_detected',
      reason: 'Selected closure contains a cycle and cannot be executed.',
    },
    {
      cause: 'graph_source_selection_mismatch',
      reason: 'graphSource nodes must match the authoritative executable subgraph.',
    },
  ])('returns typed selection rejection for $cause', async ({ cause, reason }) => {
    const postJsonMock = vi.fn(async () => {
      throw createPlanRejectedApiError({
        contractVersion: '1.0.0',
        kind: 'selection-rejected',
        rejection: { code: 'REJECTED', cause, reason },
      });
    });
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    await expect(
      service.previewPlan({
        previewProfile: 'transformation-sql-first-v1',
        graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        selection: toExplicitSelection(VALID_TRANSFORMATION_SELECTION),
        persist: true,
        context: makeRunContext('run-1', {
          tenantId: 't1',
          projectId: 'p1',
          environmentId: 'e1',
          targetAdapter: 'temporal',
        }),
      })
    ).resolves.toEqual({
      kind: 'selection-rejected',
      rejection: { code: 'REJECTED', cause, reason },
    });
  });

  it('returns plan-invalid with exact plan identity and validation', async () => {
    const preview = buildGenericPreviewPayload();
    const validation = {
      status: 'ERROR',
      code: 'MISSING_CAPABILITY',
      planId: buildValidPlanRef().planId,
      adapterId: 'temporal',
      degradable: false,
      reason: 'The adapter is missing executor.dbt.',
      cause: 'executor.dbt',
    };
    const postJsonMock = vi.fn(async () => {
      throw createPlanRejectedApiError({
        contractVersion: '1.0.0',
        kind: 'plan-invalid',
        ...preview,
        validation,
      });
    });
    const service = createPlansService(
      buildApiClientStub({ postJson: postJsonMock as ApiClient['postJson'] })
    );

    const outcome = await service.previewPlan({
      previewProfile: 'planner-generic-v1',
      graphSource: VALID_GENERIC_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_GENERIC_SELECTION),
      persist: true,
      context: makeRunContext('run-1'),
    });

    expect(outcome.kind).toBe('plan-invalid');
    if (outcome.kind === 'plan-invalid') {
      expect(outcome.plan.planRef).toEqual(buildValidPlanRef());
      expect(outcome.validation).toEqual(validation);
    }
  });

  it('keeps malformed typed 422 responses as errors', async () => {
    const apiError = createPlanRejectedApiError({
      contractVersion: '1.0.0',
      kind: 'selection-rejected',
      rejection: { code: 'REJECTED' },
    });
    const service = createPlansService(
      buildApiClientStub({
        postJson: vi.fn(async () => {
          throw apiError;
        }) as ApiClient['postJson'],
      })
    );

    await expect(service.previewPlan(buildGenericPreviewInput())).rejects.toBe(apiError);
  });

  it('keeps unknown typed rejection codes as errors', async () => {
    const apiError = createPlanRejectedApiError({
      contractVersion: '1.0.0',
      kind: 'plan-invalid',
      ...buildGenericPreviewPayload(),
      validation: {
        status: 'ERROR',
        code: 'UNKNOWN_EXECUTABILITY_CODE',
        planId: buildValidPlanRef().planId,
        adapterId: 'temporal',
        degradable: false,
        reason: 'Unknown rejection.',
      },
    });
    const service = createPlansService(
      buildApiClientStub({
        postJson: vi.fn(async () => {
          throw apiError;
        }) as ApiClient['postJson'],
      })
    );

    await expect(service.previewPlan(buildGenericPreviewInput())).rejects.toBe(apiError);
  });

  it.each([
    {
      label: 'authentication',
      error: new ApiError({
        message: 'HTTP 401',
        endpoint: '/plans/preview',
        statusCode: 401,
        category: 'unauthorized',
        responseBody: { error: { type: 'unauthorized', reason: 'authentication_required' } },
      }),
    },
    {
      label: 'transport',
      error: new Error('Network unavailable'),
    },
  ])('keeps $label failures outside the product outcome union', async ({ error }) => {
    const service = createPlansService(
      buildApiClientStub({
        postJson: vi.fn(async () => {
          throw error;
        }) as ApiClient['postJson'],
      })
    );

    await expect(service.previewPlan(buildGenericPreviewInput())).rejects.toThrow();
  });

  it('maps importPlan responses from backend-owned planRef payloads', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidTransformationPlan(),
      planRef: {
        ...buildValidPlanRef(),
        uri: 'dvt-plan://plans/backend-owned-import-ref',
      },
    }));
    const service = createPlansService(
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

  it('maps step retryPolicy into UI retry counts from the canonical field only', async () => {
    const postJsonMock = vi.fn(async () => buildGenericPreviewPayload());
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'planner-generic-v1',
      graphSource: VALID_GENERIC_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_GENERIC_SELECTION),
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
      type: 'DBT_MODEL',
      name: 'customers',
      nodes: ['model.analytics.customers'],
      policies: {
        retries: 3,
      },
    });
  });

  it('derives planner-generic preview step nodes from step ids when canonical nodeIds are absent', async () => {
    const postJsonMock = vi.fn(async () =>
      buildGenericPreviewPayload(buildGenericContractPlanWithoutNodeIds())
    );
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'planner-generic-v1',
      graphSource: VALID_GENERIC_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_GENERIC_SELECTION),
      persist: true,
      context: makeRunContext('run-1', {
        tenantId: 't1',
        projectId: 'p1',
        environmentId: 'e1',
        targetAdapter: 'temporal',
      }),
    });

    expect(plan.steps[0]).toMatchObject({
      id: 'model-orders',
      type: 'DBT_MODEL',
      name: 'Orders Model',
      nodes: ['model-orders'],
    });
  });

  it('does not read retired retry counts from stepTypeConfig', async () => {
    const postJsonMock = vi.fn(async () =>
      buildGenericPreviewPayload(buildContractPlanWithRetiredRetryConfig())
    );
    const service = createPlansService(
      buildApiClientStub({
        postJson: postJsonMock as ApiClient['postJson'],
      })
    );

    const plan = await previewAccepted(service, {
      previewProfile: 'planner-generic-v1',
      graphSource: VALID_GENERIC_GRAPH_SOURCE,
      selection: toExplicitSelection(VALID_GENERIC_SELECTION),
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
      policies: {},
    });
    expect(plan.steps[0]?.policies.retries).toBeUndefined();
  });

  it('rejects import payloads that do not include planRef', async () => {
    const postJsonMock = vi.fn(async () => ({
      plan: buildValidTransformationPlan(),
    }));
    const service = createPlansService(
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
