import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
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
