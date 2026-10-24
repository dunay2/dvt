import { describe, expect, it, vi } from 'vitest';
import * as dvtProjection from './canvasDvtPreviewProjection';
import * as dbtProjection from './canvasDbtExecutionProjection';
import * as validation from './transformationGraphValidation';
import { deriveCanvasExecutionState } from './canvasExecutionState';

import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { evaluateCanvasExecutionGraph } from './canvasExecutionGraph';

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
  it('builds each fallback candidate once and reuses the graph for repeated readiness observations', () => {
    const dvt = vi.spyOn(dvtProjection, 'buildProtectedDvtPreviewProjection');
    const dbt = vi.spyOn(dbtProjection, 'buildCanvasDbtExecutionProjection');
    const validate = vi.spyOn(validation, 'validateTransformationGraph');
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
      expect(validate).toHaveBeenCalledTimes(1);
    } finally {
      dvt.mockRestore();
      dbt.mockRestore();
      validate.mockRestore();
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
