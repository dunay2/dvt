import { describe, expect, it, vi } from 'vitest';
import * as dvtProjection from './canvasDvtPreviewProjection';
import * as dbtProjection from './canvasDbtExecutionProjection';

import { deriveCanvasExecutionState } from './canvasExecutionState';
import { mockExecutionPlan } from '../../../testing/fixtures/mockDbtData';

import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  evaluateCanvasExecutionGraph,
  type CanvasExecutionGraphArgs,
} from './canvasExecutionGraph';
import * as workspaceArtifacts from './canvasDbtWorkspaceArtifacts';

const registeredStrategy: Extract<CanvasExecutionStrategy, { kind: 'dvt_protected_preview' }> = {
  kind: 'dvt_protected_preview',
  previewProfile: 'planner-generic-v1',
  sourceFamily: 'dvt',
};

const dbtSource: CanonicalNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
  metadata: {
    columns: [{ name: 'order_id', type: 'integer' }],
    dbt: { packageName: 'analytics', sourceName: 'raw', tableName: 'orders' },
  },
};

const dbtModel: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: ['model'],
  metadata: { dbt: { selectedSourceId: dbtSource.id } },
};

const dbtLineage: CanonicalEdge = {
  id: 'source-model',
  sourceId: dbtSource.id,
  targetId: dbtModel.id,
  relation: 'lineage',
};

describe('evaluateCanvasExecutionGraph', () => {
  it('expires Preview when the graph loses its usable identity and recovers only the exact valid semantics', () => {
    const input = {
      graphDraftCanvasId: 'canvas-main',
      registeredStrategy,
      canonicalNodes: [dbtSource, dbtModel],
      canonicalEdges: [dbtLineage],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [dbtSource.id, dbtModel.id],
    } satisfies CanvasExecutionGraphArgs;
    const accepted = evaluateCanvasExecutionGraph(input);
    expect(accepted.canPlanGraph).toBe(true);
    expect(accepted.draftSignature).toEqual(expect.any(String));
    expect(accepted).not.toHaveProperty('transformationValidation');
    const plan = {
      ...mockExecutionPlan,
      preview: {
        ...mockExecutionPlan.preview,
        persisted: {
          planRecordId: mockExecutionPlan.planId,
          canonicalPlanSha256: 'a'.repeat(64),
        },
      },
    };
    const observe = (
      graph: ReturnType<typeof evaluateCanvasExecutionGraph>
    ): ReturnType<typeof deriveCanvasExecutionState> =>
      deriveCanvasExecutionState({
        graph,
        runAdmission: { allowed: true },
        currentPlan: plan,
        lastPlannedDraftSignature: accepted.draftSignature,
        latestPreviewOutcome: null,
      });
    expect(observe(accepted).planRunReadiness.status).toBe('ready');

    const invalid = evaluateCanvasExecutionGraph({ ...input, canonicalNodes: [dbtSource] });
    expect(invalid.canPlanGraph).toBe(false);
    expect(invalid.draftSignature).toBeNull();
    expect(invalid.failure).not.toBeNull();
    expect(observe(invalid)).toMatchObject({
      isCurrentPlanStale: true,
      planRunReadiness: { status: 'blocked', target: null, previewState: 'stale' },
    });

    const changedNodes = [
      {
        ...dbtSource,
        metadata: {
          ...dbtSource.metadata,
          dbt: { packageName: 'analytics', sourceName: 'raw', tableName: 'orders_changed' },
        },
      },
      dbtModel,
    ];
    const changed = evaluateCanvasExecutionGraph({ ...input, canonicalNodes: changedNodes });
    expect(changed.canPlanGraph).toBe(true);
    const originalArtifacts = workspaceArtifacts.buildDbtWorkspaceArtifacts({
      nodes: input.canonicalNodes,
      edges: input.canonicalEdges,
      scopedNodeIds: [dbtModel.id],
    });
    const changedArtifacts = workspaceArtifacts.buildDbtWorkspaceArtifacts({
      nodes: changedNodes,
      edges: input.canonicalEdges,
      scopedNodeIds: [dbtModel.id],
    });
    expect(originalArtifacts.ok).toBe(true);
    expect(changedArtifacts.ok).toBe(true);
    expect(changedArtifacts).not.toEqual(originalArtifacts);
    expect(changed.draftSignature).not.toBe(accepted.draftSignature);
    expect(observe(changed).planRunReadiness.status).toBe('blocked');
    const recovered = evaluateCanvasExecutionGraph(input);
    expect(recovered.draftSignature).toBe(accepted.draftSignature);
    expect(observe(recovered).planRunReadiness).toMatchObject({
      status: 'ready',
      target: { plan },
    });
  });

  it('has no usable graph identity when execution has no registered projection', () => {
    const graph = evaluateCanvasExecutionGraph({
      graphDraftCanvasId: 'canvas-main',
      registeredStrategy: null,
      canonicalNodes: [dbtSource, dbtModel],
      canonicalEdges: [dbtLineage],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [dbtSource.id, dbtModel.id],
    });
    expect(graph).toMatchObject({
      executionAvailable: false,
      canPlanGraph: false,
      draftSignature: null,
    });
  });

  it('rejects a generic graph whose model artifacts cannot be projected', () => {
    const graph = evaluateCanvasExecutionGraph({
      graphDraftCanvasId: 'canvas-main',
      registeredStrategy: {
        kind: 'planner_generic_preview',
        previewProfile: 'planner-generic-v1',
        sourceFamily: 'dbt',
      },
      canonicalNodes: [{ ...dbtSource, metadata: { dbt: dbtSource.metadata?.dbt } }, dbtModel],
      canonicalEdges: [dbtLineage],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [dbtSource.id, dbtModel.id],
    });
    expect(graph).toMatchObject({
      canPlanGraph: false,
      draftSignature: null,
      failure: {
        cause: 'dbt_projection_failed',
        diagnostic: expect.stringContaining('canonical columns'),
      },
    });
  });

  it('builds each fallback candidate once and reuses the graph for repeated readiness observations', () => {
    const dvt = vi.spyOn(dvtProjection, 'buildProtectedDvtPreviewProjection');
    const dbt = vi.spyOn(dbtProjection, 'buildCanvasDbtExecutionProjection');
    try {
      const graph = evaluateCanvasExecutionGraph({
        graphDraftCanvasId: 'canvas-main',
        registeredStrategy,
        canonicalNodes: [dbtSource, dbtModel],
        canonicalEdges: [dbtLineage],
        selectionIntent: { mode: 'workspace', nodeIds: [] },
        workspaceNodeIds: [dbtSource.id, dbtModel.id],
      });
      Object.freeze(graph);
      for (let index = 0; index < 3; index++) {
        const state = deriveCanvasExecutionState({
          graph,
          runAdmission: { allowed: true },
          currentPlan: null,
          lastPlannedDraftSignature: null,
          latestPreviewOutcome: null,
        });
        expect(state.planRunReadiness).toMatchObject({
          status: 'blocked',
          target: null,
          previewState: 'required',
        });
      }
      expect(dvt).toHaveBeenCalledTimes(1);
      expect(dbt).toHaveBeenCalledTimes(1);
    } finally {
      dvt.mockRestore();
      dbt.mockRestore();
    }
  });

  it('does not authorize graph-authored Preview without an actual Canvas identity', () => {
    const graph = evaluateCanvasExecutionGraph({
      graphDraftCanvasId: null,
      registeredStrategy,
      canonicalNodes: [dbtSource, dbtModel],
      canonicalEdges: [dbtLineage],
      selectionIntent: { mode: 'workspace', nodeIds: [] },
      workspaceNodeIds: [dbtSource.id, dbtModel.id],
    });
    expect(graph).toMatchObject({
      canPlanGraph: false,
      failure: { cause: 'graph_authority_unavailable' },
      draftSignature: null,
    });
  });
  it('keeps the existing dbt Preview authority for a dbt-compatible closure in the shared Canvas', () => {
    expect(
      evaluateCanvasExecutionGraph({
        graphDraftCanvasId: 'canvas-main',
        registeredStrategy,
        canonicalNodes: [dbtSource, dbtModel],
        canonicalEdges: [dbtLineage],
        selectionIntent: { mode: 'workspace', nodeIds: [] },
        workspaceNodeIds: [dbtSource.id, dbtModel.id],
      }).executionStrategy
    ).toEqual({
      kind: 'planner_generic_preview',
      previewProfile: 'planner-generic-v1',
      sourceFamily: 'dbt',
    });
  });

  it('keeps protected DVT authority when the selected closure has admitted semantics', () => {
    const source: CanonicalNode = {
      ...dbtSource,
      pluginId: 'dvt.warehouse-source',
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
    const transform = applyDvtSubstraitSemanticDocument(
      { ...dbtModel, metadata: {} },
      encodeDvtSubstraitProjectionDocument(
        createDvtSubstraitProjectionDraft({
          source: {
            nodeId: source.id,
            schema: 'raw',
            table: 'orders',
            sourceRef: source.metadata?.connectedSourceRef as never,
            fields: [{ name: 'order_id', dataType: 'integer' }],
          },
          targetNodeId: dbtModel.id,
          outputs: [
            {
              fieldId: 'field:model-orders:order_id',
              name: 'order_id',
              sourceFieldName: 'order_id',
            },
          ],
        })
      )
    );

    expect(
      evaluateCanvasExecutionGraph({
        graphDraftCanvasId: 'canvas-main',
        registeredStrategy,
        canonicalNodes: [source, transform],
        canonicalEdges: [dbtLineage],
        selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
        workspaceNodeIds: [source.id, transform.id],
      }).executionStrategy
    ).toBe(registeredStrategy);
  });
});
