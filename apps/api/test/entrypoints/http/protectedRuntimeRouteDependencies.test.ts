import { asNonBlankString } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';
import { describe, expect, it, vi } from 'vitest';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../../src/application/ports/accessDecision.js';
import { WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION } from '../../../src/application/ports/workspaceGraphDraft.js';
import { EnvironmentId, ProjectId, TenantId } from '../../../src/domain/auth/types.js';
import { buildProtectedRuntimeRouteDependencies } from '../../../src/entrypoints/http/protectedRuntimeRouteDependencies.js';
import type { ProtectedRuntimeModule } from '../../../src/modules/types.js';

import {
  VALID_DBT_GRAPH_SOURCE,
  VALID_PLAN_REF,
  VALID_TRANSFORMATION_GRAPH_SOURCE,
  buildStoredPlan,
  buildTransformationStoredPlan,
} from './planRouteFixtures.js';

describe('buildProtectedRuntimeRouteDependencies', () => {
  const OBSERVABILITY: IObservability = {
    logs: {
      debug: () => undefined,
      error: () => undefined,
      info: () => undefined,
      warn: () => undefined,
    },
    metrics: {
      counter: () => ({ add: () => undefined }),
      gauge: () => ({ set: () => undefined }),
      histogram: () => ({ record: () => undefined }),
    },
    traces: {
      startSpan: () => ({
        end: () => undefined,
        recordException: () => undefined,
        setAttribute: () => undefined,
        setAttributes: () => undefined,
        setStatus: () => undefined,
      }),
      withSpan: (_name, _options, fn) =>
        fn({
          end: () => undefined,
          recordException: () => undefined,
          setAttribute: () => undefined,
          setAttributes: () => undefined,
          setStatus: () => undefined,
        }),
    },
    withContext: (_ctx, fn) => fn(),
  };

  function buildPreviewDraft(): Record<string, unknown> {
    return {
      canvas: {
        kind: 'workspace-graph-authoring-v1',
        title: 'Transformation canvas',
      },
      nodeIds: ['source-node', 'transform-node', 'sink-node'],
      nodePositions: {
        'source-node': { x: 0, y: 0 },
        'transform-node': { x: 1, y: 1 },
        'sink-node': { x: 2, y: 2 },
      },
      nodes: [
        {
          id: 'source-node',
          name: 'Source',
          pluginId: 'dvt',
          kind: 'source',
          role: 'input',
          status: 'idle',
          tags: ['authoring'],
        },
        {
          id: 'transform-node',
          name: 'SQL transform',
          pluginId: 'dvt',
          kind: 'sql_transform',
          role: 'transform',
          status: 'idle',
          tags: ['authoring'],
        },
        {
          id: 'sink-node',
          name: 'Sink',
          pluginId: 'dvt',
          kind: 'sink',
          role: 'output',
          status: 'idle',
          tags: ['authoring'],
        },
      ],
      edges: [
        {
          id: 'edge-source-transform',
          sourceId: 'source-node',
          targetId: 'transform-node',
          relation: 'lineage',
        },
        {
          id: 'edge-transform-sink',
          sourceId: 'transform-node',
          targetId: 'sink-node',
          relation: 'lineage',
        },
      ],
    };
  }

  function buildProtectedModule(
    overrides: Partial<ProtectedRuntimeModule>
  ): ProtectedRuntimeModule {
    return {
      adapters: new Map(),
      authenticator: {},
      authorizer: {},
      close: async () => undefined,
      createProjectUseCase: {},
      dbtProjectImport: {
        projectGraphUseCase: {
          execute: vi.fn(),
        },
      },
      engine: {},
      executablePlanResolver: {},
      facade: {},
      getWorkspaceGraphDraftUseCase: {},
      listProjectsUseCase: {},
      migrate: async () => undefined,
      planCompilePlanner: {},
      planner: {},
      planStore: {},
      planValidator: {},
      runEnrichmentService: {},
      runHealthService: {},
      saveWorkspaceGraphDraftUseCase: {},
      startRunTargetAdapterRegistry: {},
      stateStore: {
        maintenance: {},
        read: {},
        snapshotStaleness: {},
      },
      workspaceContextQuery: {},
      workspaceGraphDraftCapabilityService: {},
      workspaceGraphDraftStore: {},
      ...overrides,
    } as unknown as ProtectedRuntimeModule;
  }

  it('builds transformation previews with the compile planner while deriving selection from the runtime planner', async () => {
    const selectedNodeIds = ['source-node', 'transform-node', 'sink-node'].map(asNonBlankString);
    const runtimePlanner = {
      buildPlan: vi.fn(async () => {
        throw new Error('runtime planner must not compile transformation previews');
      }),
      deriveExecutableSubgraph: vi.fn(() => ({
        selection: {
          mode: 'explicit' as const,
          nodeIds: selectedNodeIds,
        },
        nodeIds: selectedNodeIds,
        edgeIds: ['edge-source-transform', 'edge-transform-sink'],
        executable: true,
        diagnostics: [],
      })),
    };
    const compilePlanner = {
      buildPlan: vi.fn(async () => ({
        plan: buildTransformationStoredPlan(),
        executionPolicy: {},
        canonicalPlanCoreJson: '{}',
      })),
      deriveExecutableSubgraph: vi.fn(),
    };
    const planStore = {
      storePlanArtifact: vi.fn(async () => VALID_PLAN_REF),
      markStoredPlanArtifactValid: vi.fn(async () => undefined),
      markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
      getStoredPlanValidationRecord: vi.fn(async () => undefined),
    };
    const planValidator = {
      validatePlan: vi.fn(async () => ({
        status: 'OK' as const,
        planId: VALID_PLAN_REF.planId,
        adapterId: 'temporal',
      })),
    };
    const workspaceGraphDraftStore = {
      read: vi.fn(async () => ({
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        draftPayload: buildPreviewDraft(),
      })),
    };

    const dependencies = buildProtectedRuntimeRouteDependencies({
      observability: OBSERVABILITY,
      protectedModule: buildProtectedModule({
        planner: runtimePlanner as never,
        planCompilePlanner: compilePlanner as never,
        planStore: planStore as never,
        planValidator: planValidator as never,
        workspaceGraphDraftStore: workspaceGraphDraftStore as never,
      }),
    });

    const result = await dependencies.previewPlanUseCase.execute(
      {
        targetAdapter: 'temporal',
        graphSource: VALID_TRANSFORMATION_GRAPH_SOURCE,
        selection: {
          mode: 'explicit',
          nodeIds: selectedNodeIds,
        },
      },
      {
        principal: {
          principalId: 'principal-1',
          subjectId: 'principal-1',
          issuer: 'issuer',
          audience: 'audience',
          principalType: 'user',
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          rawScopes: [],
          assertedTenantIds: ['tenant-1'],
          assertedProjectIds: ['project-1'],
        },
        scope: buildEnvironmentAccessScope(
          TenantId.unsafe('tenant-1'),
          ProjectId.unsafe('project-1'),
          EnvironmentId.unsafe('env-1')
        ),
        action: AUTHORIZATION_ACTION.runStart,
        requestId: 'req-preview-route-deps',
        authorizedAt: new Date('2026-05-28T00:00:00.000Z'),
      }
    );

    expect(result.kind).toBe('accepted');
    expect(runtimePlanner.deriveExecutableSubgraph).toHaveBeenCalledTimes(1);
    expect(runtimePlanner.buildPlan).not.toHaveBeenCalled();
    expect(compilePlanner.buildPlan).toHaveBeenCalledTimes(1);
  });

  it('keeps generic dbt previews on the runtime planner while deriving selection from the runtime planner', async () => {
    const selectedNodeIds = ['node_1'].map(asNonBlankString);
    const runtimePlanner = {
      buildPlan: vi.fn(async () => ({
        plan: buildStoredPlan(),
        executionPolicy: {},
        canonicalPlanCoreJson: '{}',
      })),
      deriveExecutableSubgraph: vi.fn(() => ({
        selection: {
          mode: 'explicit' as const,
          nodeIds: selectedNodeIds,
        },
        nodeIds: selectedNodeIds,
        edgeIds: [],
        executable: true,
        diagnostics: [],
      })),
    };
    const compilePlanner = {
      buildPlan: vi.fn(async () => {
        throw new Error('compile planner must not build generic dbt previews');
      }),
      deriveExecutableSubgraph: vi.fn(),
    };
    const planStore = {
      storePlanArtifact: vi.fn(async () => VALID_PLAN_REF),
      markStoredPlanArtifactValid: vi.fn(async () => undefined),
      markStoredPlanArtifactInvalid: vi.fn(async () => undefined),
      getStoredPlanValidationRecord: vi.fn(async () => undefined),
    };
    const planValidator = {
      validatePlan: vi.fn(async () => ({
        status: 'OK' as const,
        planId: VALID_PLAN_REF.planId,
        adapterId: 'temporal',
      })),
    };
    const workspaceGraphDraftStore = {
      read: vi.fn(async () => ({
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        draftPayload: buildPreviewDraft(),
      })),
    };

    const dependencies = buildProtectedRuntimeRouteDependencies({
      observability: OBSERVABILITY,
      protectedModule: buildProtectedModule({
        planner: runtimePlanner as never,
        planCompilePlanner: compilePlanner as never,
        planStore: planStore as never,
        planValidator: planValidator as never,
        workspaceGraphDraftStore: workspaceGraphDraftStore as never,
      }),
    });

    const result = await dependencies.previewPlanUseCase.execute(
      {
        targetAdapter: 'temporal',
        graphSource: VALID_DBT_GRAPH_SOURCE,
        selection: {
          mode: 'explicit',
          nodeIds: selectedNodeIds,
        },
      },
      {
        principal: {
          principalId: 'principal-1',
          subjectId: 'principal-1',
          issuer: 'issuer',
          audience: 'audience',
          principalType: 'user',
          expiresAt: new Date('2030-01-01T00:00:00.000Z'),
          rawScopes: [],
          assertedTenantIds: ['tenant-1'],
          assertedProjectIds: ['project-1'],
        },
        scope: buildEnvironmentAccessScope(
          TenantId.unsafe('tenant-1'),
          ProjectId.unsafe('project-1'),
          EnvironmentId.unsafe('env-1')
        ),
        action: AUTHORIZATION_ACTION.runStart,
        requestId: 'req-dbt-preview-route-deps',
        authorizedAt: new Date('2026-05-28T00:00:00.000Z'),
      }
    );

    expect(result.kind).toBe('accepted');
    expect(runtimePlanner.deriveExecutableSubgraph).toHaveBeenCalledTimes(1);
    expect(runtimePlanner.buildPlan).toHaveBeenCalledTimes(1);
    expect(compilePlanner.buildPlan).not.toHaveBeenCalled();
  });
});
