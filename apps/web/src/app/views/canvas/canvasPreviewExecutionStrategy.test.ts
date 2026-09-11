import { describe, expect, it } from 'vitest';

import type { CanvasExecutionStrategy } from '../../plugins/canvasExecutionStrategyContracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import { resolveCanvasPreviewExecutionStrategy } from './canvasPreviewExecutionStrategy';

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

describe('resolveCanvasPreviewExecutionStrategy', () => {
  it('keeps the existing dbt Preview authority for a dbt-compatible closure in the shared Canvas', () => {
    expect(
      resolveCanvasPreviewExecutionStrategy({
        graphDraftCanvasId: 'canvas-main',
        registeredStrategy,
        canonicalNodes: [dbtSource, dbtModel],
        canonicalEdges: [dbtLineage],
        selectionIntent: { mode: 'workspace', nodeIds: [] },
        workspaceNodeIds: [dbtSource.id, dbtModel.id],
      })
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
      resolveCanvasPreviewExecutionStrategy({
        graphDraftCanvasId: 'canvas-main',
        registeredStrategy,
        canonicalNodes: [source, transform],
        canonicalEdges: [dbtLineage],
        selectionIntent: { mode: 'explicit', nodeIds: [transform.id] },
        workspaceNodeIds: [source.id, transform.id],
      })
    ).toBe(registeredStrategy);
  });
});
