import type { ConnectedSourceRef } from '@dvt/contracts';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  persistCanvasProjectionOutputs,
  readEditableCanvasProjectionEntry,
} from './canvasColumnProjectionAuthority';
import { applyDvtSubstraitSemanticDocument } from './canvasDvtTransformAuthoringAuthority';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  projectCanvasColumnLineage,
  resolveCanvasColumnPortDirections,
} from './canvasColumnLineageProjection';

function buildNode(
  id: string,
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role'],
  columns: readonly Readonly<{ name: string; type: string }>[] = []
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
    metadata: { columns },
  };
}

function buildProjectionGraph(): readonly [CanonicalNode, CanonicalNode, string] {
  const sourceRef: ConnectedSourceRef = {
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: 'raw.orders',
  };
  const source: CanonicalNode = {
    ...buildNode('source-orders', 'dvt:source', 'input', [{ name: 'order_id', type: 'integer' }]),
    metadata: {
      schema: 'raw',
      tableName: 'orders',
      connectedSourceRef: sourceRef,
      columns: [{ name: 'order_id', type: 'integer' }],
    },
  };
  const draft = createDvtSubstraitProjectionDraft({
    source: {
      nodeId: source.id,
      schema: 'raw',
      table: 'orders',
      sourceRef,
      fields: [{ name: 'order_id', dataType: 'integer' }],
    },
    targetNodeId: 'model-orders',
    outputs: [{ fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' }],
  });
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  if (!inspection.ok || inspection.projection.outputs[0]?.sourceFieldId == null) {
    throw new Error('Expected admitted connected source lineage.');
  }
  const sourceFieldId = inspection.projection.outputs[0].sourceFieldId;
  const model = applyDvtSubstraitSemanticDocument(
    buildNode('model-orders', 'dvt:transform', 'transform'),
    encodeDvtSubstraitProjectionDocument(draft)
  );
  return [source, model, sourceFieldId];
}

describe('Canvas column lineage projection', () => {
  it('roundtrips UI handles and exposes ports according to node role', () => {
    const id = createCanvasColumnHandleId({
      direction: 'source',
      nodeId: 'source/one',
      columnId: 'Order ID',
    });

    expect(parseCanvasColumnHandleId(id)).toEqual({
      direction: 'source',
      nodeId: 'source/one',
      columnId: 'Order ID',
    });
    expect(parseCanvasColumnHandleId('node-output')).toBeNull();
    expect(resolveCanvasColumnPortDirections('input')).toEqual(['source']);
    expect(resolveCanvasColumnPortDirections('transform')).toEqual(['target', 'source']);
    expect(resolveCanvasColumnPortDirections('output')).toEqual(['target']);
  });

  it('derives removable lineage only from connected, disclosed canonical fields', () => {
    const [source, model, sourceFieldId] = buildProjectionGraph();
    const project = (
      expandedNodeIds: ReadonlySet<string>,
      connected = true
    ): ReturnType<typeof projectCanvasColumnLineage> =>
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: connected ? [{ sourceId: source.id, targetId: model.id }] : [],
        expandedNodeIds,
      });

    expect(project(new Set([source.id, model.id]))).toEqual([
      expect.objectContaining({
        source: source.id,
        target: model.id,
        data: expect.objectContaining({
          sourceFieldId,
          outputId: 'output:order_id',
          removable: true,
        }),
      }),
    ]);
    expect(project(new Set([source.id]))).toEqual([]);
    expect(project(new Set([source.id, model.id]), false)).toEqual([]);
  });

  it('keeps lineage identity stable when only the target display name changes', () => {
    const [source, original] = buildProjectionGraph();
    const expanded = new Set([source.id, original.id]);
    const edges = [{ sourceId: source.id, targetId: original.id }];
    const resolveNode = (nodeId: string): CanonicalNode | undefined =>
      [source, original].find((node) => node.id === nodeId);
    const entry = readEditableCanvasProjectionEntry({ targetNode: original, edges, resolveNode });
    if (entry.outcome === 'rejected' || entry.projection == null) {
      throw new Error('Expected editable projection.');
    }
    const renamedResult = persistCanvasProjectionOutputs({
      targetNode: original,
      resolveNode,
      projection: entry.projection,
      outputs: entry.projection.outputs.map((output) => ({ ...output, name: 'customer_order_id' })),
    });
    if (renamedResult.outcome === 'rejected') throw new Error('Expected renamed projection.');
    const renamed = renamedResult.node;

    const originalLineage = projectCanvasColumnLineage({
      nodes: [source, original],
      edges,
      expandedNodeIds: expanded,
    });
    const renamedLineage = projectCanvasColumnLineage({
      nodes: [source, renamed],
      edges,
      expandedNodeIds: expanded,
    });

    expect(originalLineage).toHaveLength(1);
    expect(renamedLineage).toHaveLength(1);
    expect(renamedLineage[0]?.id).toBe(originalLineage[0]?.id);
    expect(renamedLineage[0]?.data?.sourceFieldId).toBe(originalLineage[0]?.data?.sourceFieldId);
    expect(renamedLineage[0]?.data?.outputId).toBe(originalLineage[0]?.data?.outputId);
    expect(renamedLineage[0]?.data?.targetColumnName).toBe('customer_order_id');
  });

  it('does not fabricate lineage for dbt columns that only share a name', () => {
    const source: CanonicalNode = {
      id: 'dbt-source',
      name: 'source_orders',
      pluginId: 'dvt',
      kind: 'dvt:source',
      role: 'input',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'id', type: 'integer' }] },
    };
    const model: CanonicalNode = {
      id: 'dbt-model',
      name: 'fct_orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'id', type: 'integer' }] },
    };

    expect(
      projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id, model.id]),
      })
    ).toEqual([]);
  });
});
