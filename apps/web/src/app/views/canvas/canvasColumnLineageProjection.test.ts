import { projectCanvasColumnLineageForGraph as projectCanvasColumnLineage } from './canvasColumnLineageProjection.test-fixtures';
import type { ConnectedSourceRef } from '@dvt/contracts';
import { createProducerInput } from '@dvt/substrait-analysis';
import { canvasInputSlotId } from './canvasInputBindings';
import { createSourceDocument } from './canvasSourceDocument';
import { encodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  decodeDvtSubstraitProjectionDocument,
  encodeDvtSubstraitProjectionDocument,
} from './canvasDvtSubstraitProjection';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { changeSelectedRelationOutputs } from './canvasSelectedRelationOutputs';
import { relationOutputSlots } from './canvasRelationOutputSchema';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import {
  createCanvasColumnHandleId,
  parseCanvasColumnHandleId,
  resolveCanvasColumnPortDirections,
} from './canvasColumnHandleIdentity';

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

function buildProjectionGraph(): readonly [CanonicalNode, CanonicalNode] {
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
  const model = applyDvtSubstraitSemanticDocument(
    buildNode('model-orders', 'dvt:transform', 'transform'),
    encodeDvtSubstraitProjectionDocument(draft)
  );
  return [source, model];
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

  it('connects disclosed producer fields to stable consumer Inputs without deleting consumed bindings', async () => {
    const [source, model] = buildProjectionGraph();
    const project = async (
      expandedNodeIds: ReadonlySet<string>,
      connected = true
    ): ReturnType<typeof projectCanvasColumnLineage> =>
      await projectCanvasColumnLineage({
        nodes: [source, model],
        edges: connected ? [{ sourceId: source.id, targetId: model.id }] : [],
        expandedNodeIds,
      });

    expect(await project(new Set([source.id, model.id]))).toEqual([
      expect.objectContaining({
        source: source.id,
        target: model.id,
        data: expect.objectContaining({
          sourceFieldId: 'order_id',
          outputId: canvasInputSlotId(source.id, 'order_id'),
          removable: false,
        }),
      }),
    ]);
    expect(await project(new Set([source.id]))).toEqual([]);
    expect(await project(new Set([source.id, model.id]), false)).toEqual([]);
  });

  it('projects producer-to-consumer lineage through published FieldIds, without producer operations', async () => {
    const [source, upstream] = buildProjectionGraph();
    const upstreamAuthority = readDvtTransformAuthoringAuthority(upstream);
    if (upstreamAuthority == null) throw new Error('Expected upstream authority.');
    const input = createProducerInput(
      {
        nodeId: upstream.id,
        name: upstream.name,
        document: decodeDvtSubstraitProjectionDocument(upstreamAuthority.semanticDocument),
      },
      1
    );
    const downstreamDraft = createSourceDocument([input], input);
    const downstream = applyDvtSubstraitSemanticDocument(
      buildNode('model-customer-orders', 'dvt:transform', 'transform'),
      encodeDvtSubstraitSemanticDocument(downstreamDraft)
    );
    const lineage = await projectCanvasColumnLineage({
      nodes: [source, upstream, downstream],
      edges: [
        { sourceId: source.id, targetId: upstream.id },
        { sourceId: upstream.id, targetId: downstream.id },
      ],
      expandedNodeIds: new Set([source.id, upstream.id, downstream.id]),
    });

    expect(lineage).toHaveLength(2);
    expect(lineage[1]).toMatchObject({
      source: upstream.id,
      target: downstream.id,
      sourceHandle: createCanvasColumnHandleId({
        direction: 'source',
        nodeId: upstream.id,
        columnId: 'output:order_id',
      }),
      data: {
        sourceFieldId: 'output:order_id',
        outputId: canvasInputSlotId(upstream.id, 'output:order_id'),
        removable: false,
      },
    });
  });

  it('preserves the first binding and independently maps the second producer to Input', async () => {
    const [source, model] = buildProjectionGraph();
    const secondSource: CanonicalNode = {
      ...buildNode('source-health-check', 'dvt:source', 'input', [{ name: 'id', type: 'integer' }]),
      metadata: {
        schema: 'core',
        tableName: 'health_check',
        connectedSourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'core.health_check',
        },
        columns: [{ name: 'id', type: 'integer' }],
      },
    };

    const lineage = await projectCanvasColumnLineage({
      nodes: [source, secondSource, model],
      edges: [
        { sourceId: source.id, targetId: model.id },
        { sourceId: secondSource.id, targetId: model.id },
      ],
      expandedNodeIds: new Set([source.id, secondSource.id, model.id]),
    });

    expect(lineage).toEqual([
      expect.objectContaining({
        source: source.id,
        target: model.id,
        data: expect.objectContaining({
          sourceFieldId: 'order_id',
          outputId: canvasInputSlotId(source.id, 'order_id'),
          removable: false,
        }),
      }),
      expect.objectContaining({
        source: secondSource.id,
        target: model.id,
        data: expect.objectContaining({
          sourceFieldId: 'id',
          outputId: canvasInputSlotId(secondSource.id, 'id'),
          removable: true,
        }),
      }),
    ]);
    expect(new Set(lineage.map((edge) => edge.targetHandle)).size).toBe(2);
  });
  it('does not rename or retarget Input lineage when the consumer Output alias changes', async () => {
    const [source, original] = buildProjectionGraph();
    const expanded = new Set([source.id, original.id]);
    const edges = [{ sourceId: source.id, targetId: original.id }];
    const authority = readDvtTransformAuthoringAuthority(original)!;
    const session = new CanvasRelationAnalysisSession(original.id);
    session.receive(decodeDvtSubstraitProjectionDocument(authority.semanticDocument));
    const root = session.locate(session.rootId, session.revision);
    const slots = relationOutputSlots(
      root,
      await Promise.all(root.inputs.map((id) => session.query(id)))
    );
    const draft = await changeSelectedRelationOutputs(session, {
      relationId: session.rootId,
      expectedRevision: session.revision,
      outputs: slots
        .filter((slot) => slot.output != null)
        .map((slot) => ({ slot: slot.slot, alias: 'customer_order_id' })),
    });
    const renamed = applyDvtSubstraitSemanticDocument(
      original,
      encodeDvtSubstraitSemanticDocument(draft)
    );
    session.dispose();

    const originalLineage = await projectCanvasColumnLineage({
      nodes: [source, original],
      edges,
      expandedNodeIds: expanded,
    });
    const renamedLineage = await projectCanvasColumnLineage({
      nodes: [source, renamed],
      edges,
      expandedNodeIds: expanded,
    });

    expect(originalLineage).toHaveLength(1);
    expect(renamedLineage).toHaveLength(1);
    expect(renamedLineage[0]?.id).toBe(originalLineage[0]?.id);
    expect(renamedLineage[0]?.data?.sourceFieldId).toBe(originalLineage[0]?.data?.sourceFieldId);
    expect(renamedLineage[0]?.data?.outputId).toBe(originalLineage[0]?.data?.outputId);
    expect(renamedLineage[0]?.data?.targetColumnName).toBe('order_id');
    expect(renamedLineage[0]?.targetHandle).toBe(originalLineage[0]?.targetHandle);
    expect(parseCanvasColumnHandleId(renamedLineage[0]?.targetHandle)?.columnId).toBe(
      canvasInputSlotId(source.id, 'order_id')
    );
  });

  it('does not fabricate lineage for dbt columns that only share a name', async () => {
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
      pluginId: 'dbt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: { columns: [{ name: 'id', type: 'integer' }] },
    };

    expect(
      await projectCanvasColumnLineage({
        nodes: [source, model],
        edges: [{ sourceId: source.id, targetId: model.id }],
        expandedNodeIds: new Set([source.id, model.id]),
      })
    ).toEqual([]);
  });
});
