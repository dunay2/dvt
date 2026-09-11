import { describe, expect, it, vi } from 'vitest';

import type { IGraphDbtModelCompilationQueryPort } from '../../ports/graphDbtModelCompilation';
import type { IGraphDbtWorkspaceArtifactPublicationCommandPort } from '../../ports/graphDbtWorkspaceArtifactPublication';
import type { IPlansPort } from '../../ports/plans';
import type { SessionContextPort } from '../../ports/sessionContext';
import type { IWorkspaceFilesQueryPort } from '../../ports/workspace';
import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import { makePlanRef, makeRunContext } from '../../testing/contractTestUtils';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PlanViewModel } from '../../types/plans';
import { deriveCanvasExecutionState } from './canvasExecutionState';
import { executeCanvasPlanAction } from './canvasPlanAction';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { canvasViewCopy } from './copy';

const source: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'success',
  tags: ['source'],
  metadata: {
    schema: 'raw',
    tableName: 'orders',
    connectedSourceRef: {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgres-main',
        provider: 'postgres',
      },
      sourceObjectId: 'raw.orders',
    },
    columns: [{ name: 'order_id', type: 'integer' }],
  },
};

const transform: CanonicalNode = applyDvtSubstraitSemanticDocument(
  {
    id: 'transform-orders',
    name: 'Orders projection',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  },
  encodeDvtSubstraitProjectionDocument(
    createDvtSubstraitProjectionDraft({
      source: {
        nodeId: source.id,
        schema: 'raw',
        table: 'orders',
        sourceRef: source.metadata?.connectedSourceRef as never,
        fields: [{ name: 'order_id', dataType: 'integer' }],
      },
      targetNodeId: 'transform-orders',
      outputs: [
        {
          fieldId: 'field:transform-orders:order_id',
          name: 'order_id',
          sourceFieldName: 'order_id',
        },
      ],
    })
  )
);

const lineage: CanonicalEdge = {
  id: 'source-transform',
  sourceId: source.id,
  targetId: transform.id,
  relation: 'lineage',
};

const strategy: Extract<CanvasExecutionStrategy, { kind: 'dvt_protected_preview' }> = {
  kind: 'dvt_protected_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'dvt',
};

function sessionContext(): SessionContextPort {
  const context = makeRunContext('preview_context');
  return {
    buildRunContext: () => context,
    getWorkspaceScope: () => context,
    getWorkspaceScopeSnapshot: () => context,
    subscribeWorkspaceScope: () => () => undefined,
  };
}

function persistedPlan(): PlanViewModel {
  return {
    planId: 'plan-dvt-preview',
    planVersion: '1.0.0',
    generatedAt: '2026-09-11T00:00:00.000Z',
    adapter: 'temporal',
    target: 'development',
    capabilities: [],
    steps: [],
  };
}

describe('executeCanvasPlanAction protected DVT branch', () => {
  it('requests one upstream terminal Transform without browser graph semantics', async () => {
    const plan = persistedPlan();
    const previewPlan = vi.fn<IPlansPort['previewPlan']>().mockResolvedValue({
      kind: 'accepted',
      plan: { ...plan, planRef: makePlanRef({ planId: plan.planId }) },
    });
    const publish = vi.fn();
    const compile = vi.fn();

    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: 'canvas-main',
      canPlan: true,
      canonicalEdges: [lineage],
      canonicalNodes: [source, transform],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
      sessionContext: sessionContext(),
      workspaceNodeIds: [source.id, transform.id],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      graphDbtWorkspaceArtifactPublicationCommand: {
        publish,
      } as unknown as IGraphDbtWorkspaceArtifactPublicationCommandPort,
      graphDbtModelCompilationQuery: {
        compile,
      } as unknown as IGraphDbtModelCompilationQueryPort,
    });

    expect(result).toMatchObject({
      ok: true,
      writtenArtifactPaths: [],
      previewOutcome: {
        kind: 'accepted',
        plan: {
          preview: {
            selectionIntent: {
              mode: 'explicit',
              requestedRootNodeIds: [transform.id],
              derivedDependencyNodeIds: [source.id],
              authorizedScopeNodeIds: [source.id, transform.id],
            },
          },
        },
      },
    });
    expect(previewPlan).toHaveBeenCalledOnce();
    const request = previewPlan.mock.calls[0]?.[0];
    expect(request).toEqual({
      previewProfile: 'planner-generic-v1',
      selection: { mode: 'upstream', nodeIds: [transform.id] },
      context: expect.objectContaining({ runId: 'preview_context' }),
      provenance: {
        kind: 'dvt-protected-workspace-graph',
        canvasId: 'canvas-main',
      },
      persist: true,
    });
    expect(request).not.toHaveProperty('graphSource');
    expect(publish).not.toHaveBeenCalled();
    expect(compile).not.toHaveBeenCalled();
  });

  it('rejects a non-terminal Transform before calling Preview', async () => {
    const previewPlan = vi.fn<IPlansPort['previewPlan']>();
    const result = await executeCanvasPlanAction({
      graphDraftCanvasId: 'canvas-main',
      canPlan: true,
      canonicalEdges: [
        lineage,
        {
          id: 'transform-sink',
          sourceId: transform.id,
          targetId: 'sink-orders',
          relation: 'lineage',
        },
      ],
      canonicalNodes: [
        source,
        transform,
        {
          id: 'sink-orders',
          name: 'Orders sink',
          pluginId: 'dvt',
          kind: 'dvt:sink',
          role: 'output',
          status: 'idle',
          tags: [],
        },
      ],
      executionStrategy: strategy,
      plansService: { previewPlan, importPlan: vi.fn() },
      selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
      sessionContext: sessionContext(),
      workspaceNodeIds: [source.id, transform.id, 'sink-orders'],
      workspaceFilesQuery: {} as IWorkspaceFilesQueryPort,
      graphDbtWorkspaceArtifactPublicationCommand:
        {} as IGraphDbtWorkspaceArtifactPublicationCommandPort,
      graphDbtModelCompilationQuery: {} as IGraphDbtModelCompilationQueryPort,
    });

    expect(result).toEqual({
      ok: false,
      message: canvasViewCopy.previewProvenanceTransformPathRequiredMessage,
    });
    expect(previewPlan).not.toHaveBeenCalled();
  });
  it('enables Preview readiness for the exact protected terminal closure', () => {
    const state = deriveCanvasExecutionState({
      graphDraftCanvasId: 'canvas-main',
      canRun: true,
      executionStrategy: strategy,
      currentPlan: null,
      lastPlannedDraftSignature: null,
      canonicalNodes: [source, transform],
      canonicalEdges: [lineage],
      selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
      workspaceNodeIds: [source.id, transform.id],
      latestPreviewOutcome: null,
    });

    expect(state.canPlanGraph).toBe(true);
    expect(state.canStartRun).toBe(false);
    expect(state.executableGraphFailureMessage).toBeNull();
  });
});
