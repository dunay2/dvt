import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  createDvtSubstraitProjectionDraftFromTransform,
  encodeDvtSubstraitProjectionDocument,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  resolveDvtSubstraitProjectionEntry,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';

const UUID_V7 = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const DVT_FIELD_ID = new RegExp(`^dvt_fld_${UUID_V7}$`, 'i');
const DVT_RELATION_ID = new RegExp(`^dvt_rel_${UUID_V7}$`, 'i');

const sourceRef = {
  schemaVersion: 'connected-source-ref.v1' as const,
  connectionRef: {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-main',
    provider: 'postgres' as const,
  },
  sourceObjectId: 'raw.orders',
};

function draft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef,
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'buyer', sourceFieldName: 'customer' },
    ],
  });
}

function sourceNode(id = 'source-orders'): CanonicalNode {
  return {
    id,
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
    name: 'Orders',
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {},
  };
}

describe('generic Substrait projection identity', () => {
  it('wraps a Transform output by RelationId and FieldId without inventing a source binding', () => {
    const upstream = draft();
    const upstreamInspection = inspectDvtSubstraitProjectionDraft(upstream);
    if (!upstreamInspection.ok) throw new Error('Expected valid upstream projection.');

    const chained = createDvtSubstraitProjectionDraftFromTransform({
      source: upstream,
      targetNodeId: 'transform-orders-summary',
      outputs: [
        {
          fieldId: 'output:summary-buyer',
          name: 'buyer',
          sourceFieldId: 'output:customer',
        },
        {
          fieldId: 'output:summary-order-id',
          name: 'order_id',
          sourceFieldId: 'output:order_id',
        },
      ],
    });

    expect(chained.sidecar.relations.filter((relation) => relation.sourceRef != null)).toEqual(
      upstream.sidecar.relations.filter((relation) => relation.sourceRef != null)
    );
    expect(chained.sidecar.relations).toHaveLength(upstream.sidecar.relations.length + 1);

    const inspection = inspectDvtSubstraitProjectionDraft(chained);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.inputRelationId).toBe(
      upstreamInspection.projection.targetRelationId
    );
    expect(inspection.projection.inputFields.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
    ]);
    expect(
      inspection.projection.outputs.map(({ fieldId, sourceFieldId, name }) => ({
        fieldId,
        sourceFieldId,
        name,
      }))
    ).toEqual([
      {
        fieldId: 'output:summary-buyer',
        sourceFieldId: 'output:customer',
        name: 'buyer',
      },
      {
        fieldId: 'output:summary-order-id',
        sourceFieldId: 'output:order_id',
        name: 'order_id',
      },
    ]);
  });

  it('resolves a chained Transform by exact RelationId and ordered FieldIds', () => {
    const upstream = draft();
    const chained = createDvtSubstraitProjectionDraftFromTransform({
      source: upstream,
      targetNodeId: 'transform-orders-summary',
      outputs: [
        { fieldId: 'output:summary-buyer', name: 'buyer', sourceFieldId: 'output:customer' },
      ],
    });
    const source = sourceNode();
    const upstreamNode: CanonicalNode = {
      id: 'transform-orders',
      name: 'Orders',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: [],
      metadata: {
        transformAuthoring: {
          version: 'v1',
          mode: 'substrait',
          semanticDocument: encodeDvtSubstraitProjectionDocument(upstream),
        },
      },
    };
    const downstreamNode: CanonicalNode = {
      ...targetNode(),
      id: 'transform-orders-summary',
      name: 'Order summary',
    };
    const nodes = [source, upstreamNode, downstreamNode];
    const edges = [
      { sourceId: source.id, targetId: upstreamNode.id },
      { sourceId: upstreamNode.id, targetId: downstreamNode.id },
    ];

    const resolved = resolveDvtSubstraitProjectionEntry({
      targetNode: downstreamNode,
      nodes,
      edges,
      draft: chained,
    });

    expect(resolved).toMatchObject({
      targetNodeId: downstreamNode.id,
      source: {
        nodeId: upstreamNode.id,
        fields: [
          { name: 'order_id', dataType: 'integer' },
          { name: 'buyer', dataType: 'text' },
        ],
      },
      outputs: [
        {
          fieldId: 'output:summary-buyer',
          sourceFieldId: 'output:customer',
          sourceFieldName: 'buyer',
        },
      ],
    });
  });
  it('applies a scalar function to a Model output consumed by another Model', () => {
    const chained = createDvtSubstraitProjectionDraftFromTransform({
      source: draft(),
      targetNodeId: 'transform-orders-summary',
      outputs: [
        { fieldId: 'output:summary-buyer', name: 'buyer', sourceFieldId: 'output:customer' },
      ],
    });
    const lower = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'lower');
    if (lower == null) throw new Error('Expected admitted LOWER capability.');
    expect(
      resolveDvtSubstraitColumnFunctions({ dataTypes: ['string'], provider: 'postgres' }).find(
        (candidate) => candidate.name === 'lower'
      )?.capabilityId
    ).toBe(lower.capabilityId);

    const next = applyDvtSubstraitProjectionFunction(chained, {
      fieldId: 'output:summary-buyer',
      capabilityId: lower.capabilityId,
      alias: 'buyer_normalized',
      dataType: 'text',
      provider: 'postgres',
    });

    expect(next).not.toBe(chained);
    const inspection = inspectDvtSubstraitProjectionDraft(next);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs).toEqual([
      expect.objectContaining({
        fieldId: 'output:summary-buyer',
        name: 'buyer_normalized',
        sourceFieldId: 'output:customer',
        operations: ['lower'],
      }),
    ]);
  });
  it('rejects a chained Transform reference when only the mutable name matches', () => {
    expect(() =>
      createDvtSubstraitProjectionDraftFromTransform({
        source: draft(),
        targetNodeId: 'transform-orders-summary',
        outputs: [{ fieldId: 'output:summary-buyer', name: 'buyer', sourceFieldId: 'buyer' }],
      })
    ).toThrow('FieldId');
  });
  it('allocates opaque relation and source-field identities without changing caller-owned outputs', () => {
    const projectionDraft = draft();
    const relationIds = projectionDraft.sidecar.relations.map((relation) => relation.relationId);
    expect(relationIds).toHaveLength(2);
    expect(new Set(relationIds).size).toBe(2);
    relationIds.forEach((relationId) => expect(relationId).toMatch(DVT_RELATION_ID));
    expect(relationIds.join('|')).not.toContain('source-orders');
    expect(relationIds.join('|')).not.toContain('transform-orders');

    const sourceBinding = projectionDraft.sidecar.relations.find(
      (relation) => relation.sourceRef != null
    );
    const targetBinding = projectionDraft.sidecar.relations.find(
      (relation) => relation.sourceRef == null
    );
    if (sourceBinding == null || targetBinding == null)
      throw new Error('Expected two relation bindings.');
    const sourceFields = projectionDraft.sidecar.fields.filter(
      (field) => field.relationId === sourceBinding.relationId
    );
    expect(sourceFields.map((field) => field.fieldId)).toHaveLength(2);
    sourceFields.forEach((field) => expect(field.fieldId).toMatch(DVT_FIELD_ID));
    expect(sourceFields.map((field) => field.fieldId).join('|')).not.toContain('order_id');
    expect(sourceFields.map((field) => field.fieldId).join('|')).not.toContain('customer');
    expect(
      projectionDraft.sidecar.fields
        .filter((field) => field.relationId === targetBinding.relationId)
        .map((field) => field.fieldId)
    ).toEqual(['output:order_id', 'output:customer']);

    const inspection = inspectDvtSubstraitProjectionDraft(projectionDraft);
    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection).not.toHaveProperty('targetNodeId');
    expect(inspection.projection.source).not.toHaveProperty('nodeId');
  });

  it('treats legacy relation and source-field strings as opaque persisted identity', () => {
    const current = draft();
    const sourceBinding = current.sidecar.relations.find((relation) => relation.sourceRef != null);
    const targetBinding = current.sidecar.relations.find((relation) => relation.sourceRef == null);
    if (sourceBinding == null || targetBinding == null)
      throw new Error('Expected relation bindings.');
    const sourceFields = current.sidecar.fields.filter(
      (field) => field.relationId === sourceBinding.relationId
    );
    const fieldIdMap = new Map(
      sourceFields.map((field) => [field.fieldId, `legacy:${field.displayName}`] as const)
    );
    const legacySourceRelationId = 'relation:legacy-source';
    const legacyTargetRelationId = 'relation:legacy-target:project';
    const legacy: DvtSubstraitProjectionDraft = {
      plan: current.plan,
      sidecar: {
        ...current.sidecar,
        relations: current.sidecar.relations.map((relation) =>
          relation.relationId === sourceBinding.relationId
            ? { ...relation, relationId: legacySourceRelationId }
            : { ...relation, relationId: legacyTargetRelationId }
        ),
        fields: current.sidecar.fields.map((field) => ({
          ...field,
          relationId:
            field.relationId === sourceBinding.relationId
              ? legacySourceRelationId
              : legacyTargetRelationId,
          fieldId: fieldIdMap.get(field.fieldId) ?? field.fieldId,
          ...(field.sourceFieldId == null
            ? {}
            : { sourceFieldId: fieldIdMap.get(field.sourceFieldId) ?? field.sourceFieldId }),
        })),
      },
    };

    expect(inspectDvtSubstraitProjectionDraft(legacy).ok).toBe(true);
  });

  it('resolves graph source and target identity from graph context rather than identifier strings', () => {
    const projectionDraft = draft();
    const source = sourceNode();
    const target = targetNode();
    const resolved = resolveDvtSubstraitProjectionEntry({
      targetNode: target,
      nodes: [source, target],
      edges: [{ sourceId: source.id, targetId: target.id }],
      draft: projectionDraft,
    });

    expect(resolved).toMatchObject({
      targetNodeId: 'transform-orders',
      source: { nodeId: 'source-orders', schema: 'raw', table: 'orders' },
    });
    expect(
      resolveDvtSubstraitProjectionEntry({
        targetNode: target,
        nodes: [source, sourceNode('source-orders-duplicate'), target],
        edges: [
          { sourceId: source.id, targetId: target.id },
          { sourceId: 'source-orders-duplicate', targetId: target.id },
        ],
        draft: projectionDraft,
      })
    ).toBeNull();
  });
});
