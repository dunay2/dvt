import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  persistCanvasProjectionOutputs,
  readEditableCanvasProjectionEntry,
  resolveCanvasColumnMappingTarget,
} from './canvasColumnProjectionAuthority';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitProjectionDocument } from './canvasDvtSubstraitProjection';

const sourceRef = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-main',
    provider: 'postgres' as const,
  },
  sourceObjectId: 'raw.orders',
};

function sourceNode(): CanonicalNode {
  return {
    id: 'source-orders',
    name: 'orders',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    metadata: {
      connectedSourceRef: sourceRef,
      schema: 'raw',
      tableName: 'orders',
      columns: [
        { name: 'order_id', type: 'integer' },
        { name: 'customer', type: 'text' },
      ],
    },
  };
}

function targetNode(): CanonicalNode {
  return {
    id: 'transform-orders',
    name: 'Orders transform',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

function identitySnapshot(node: CanonicalNode): Readonly<{
  sourceRelationId: string;
  targetRelationId: string;
  sourceFieldIds: readonly string[];
}> {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) throw new Error('Expected Transform authoring authority.');
  const draft = decodeDvtSubstraitProjectionDocument(authority.semanticDocument);
  const sourceRelation = draft.sidecar.relations.find((relation) => relation.sourceRef != null);
  const targetRelation = draft.sidecar.relations.find((relation) => relation.sourceRef == null);
  if (sourceRelation == null || targetRelation == null)
    throw new Error('Expected projection relations.');
  return {
    sourceRelationId: sourceRelation.relationId,
    targetRelationId: targetRelation.relationId,
    sourceFieldIds: draft.sidecar.fields
      .filter((field) => field.relationId === sourceRelation.relationId)
      .sort((left, right) => left.outputOrdinal - right.outputOrdinal)
      .map((field) => field.fieldId),
  };
}

describe('Canvas projection identity persistence', () => {
  it('keeps relation and source FieldIds stable when the same projection is edited', () => {
    const source = sourceNode();
    const target = targetNode();
    const resolveNode = (nodeId: string): CanonicalNode | undefined =>
      nodeId === source.id ? source : nodeId === target.id ? target : undefined;

    const created = persistCanvasProjectionOutputs({
      targetNode: target,
      projection: null,
      outputs: [
        {
          fieldId: 'output:order_id',
          name: 'order_id',
          sourceFieldName: 'order_id',
          dataType: 'integer',
          outputOrdinal: 0,
        },
        {
          fieldId: 'output:customer',
          name: 'buyer',
          sourceFieldName: 'customer',
          dataType: 'text',
          outputOrdinal: 1,
        },
      ],
      resolveNode,
      sourceNodeIdHint: source.id,
    });
    if (created.outcome !== 'applied') throw new Error('Expected initial projection persistence.');
    const before = identitySnapshot(created.node);

    const entry = readEditableCanvasProjectionEntry({
      targetNode: created.node,
      edges: [{ sourceId: source.id, targetId: target.id }],
      resolveNode: (nodeId) =>
        nodeId === source.id ? source : nodeId === target.id ? created.node : undefined,
    });
    if (entry.outcome !== 'ready' || entry.projection == null) {
      throw new Error('Expected graph-bound projection.');
    }

    const edited = persistCanvasProjectionOutputs({
      targetNode: created.node,
      projection: entry.projection,
      outputs: entry.projection.outputs.map((output) =>
        output.fieldId === 'output:customer' ? { ...output, name: 'customer_name' } : output
      ),
      resolveNode: (nodeId) =>
        nodeId === source.id ? source : nodeId === target.id ? created.node : undefined,
    });
    if (edited.outcome !== 'applied') throw new Error('Expected edited projection persistence.');

    expect(identitySnapshot(edited.node)).toEqual(before);
  });

  it('does not resolve an existing semantic output by its display name', () => {
    const source = sourceNode();
    const target = targetNode();
    const created = persistCanvasProjectionOutputs({
      targetNode: target,
      projection: null,
      outputs: [
        {
          fieldId: 'dvt_fld_01991dc0-0000-7000-8000-000000000201',
          name: 'buyer',
          sourceFieldName: 'customer',
          dataType: 'text',
          outputOrdinal: 0,
        },
      ],
      resolveNode: (nodeId) => (nodeId === source.id ? source : undefined),
      sourceNodeIdHint: source.id,
    });
    if (created.outcome !== 'applied') throw new Error('Expected initial projection persistence.');

    expect(resolveCanvasColumnMappingTarget(created.node, 'buyer')).toBeNull();
    expect(
      resolveCanvasColumnMappingTarget(created.node, 'dvt_fld_01991dc0-0000-7000-8000-000000000201')
    ).toEqual({
      nodeId: target.id,
      outputId: 'dvt_fld_01991dc0-0000-7000-8000-000000000201',
      columnName: 'buyer',
    });
  });
});
