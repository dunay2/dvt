import { describe, expect, it } from 'vitest';

import {
  createDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  inspectDvtSubstraitStructuredFieldDraft,
  orderedDvtSubstraitFields,
  resolveDvtSubstraitStructuredProjectionParts,
} from './canvasDvtSubstraitStructuredField';
import { createDvtSubstraitFieldReference } from './canvasDvtSubstraitStructuredFieldAppend';
import { removeDvtSubstraitProjectionRoot } from './canvasDvtSubstraitStructuredFieldRemove';
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';

const SOURCE = {
  nodeId: 'source-orders',
  schema: 'raw',
  table: 'orders',
  sourceRef: {
    schemaVersion: 'connected-source-ref.v1' as const,
    connectionRef: {
      schemaVersion: 'connection-ref.v1' as const,
      connectionId: 'warehouse-main',
      provider: 'postgres',
    },
    sourceObjectId: 'raw.orders',
  },
  fields: [
    { name: 'order_id', dataType: 'integer' },
    { name: 'customer', dataType: 'text' },
    { name: 'amount', dataType: 'numeric' },
    { name: 'status', dataType: 'text' },
  ],
};

function projectionDraft(): DvtSubstraitProjectionDraft {
  return createDvtSubstraitProjectionDraft({
    source: SOURCE,
    targetNodeId: 'transform-orders',
    outputs: SOURCE.fields.map((field) => ({
      fieldId: `output:${field.name}`,
      name: field.name,
      sourceFieldName: field.name,
    })),
  });
}

function composeDetails(draft = projectionDraft()): DvtSubstraitProjectionDraft {
  return composeDvtSubstraitProjectionFields(draft, {
    draggedFieldId: 'output:amount',
    targetFieldId: 'output:customer',
    parentFieldId: 'output:details',
    parentName: 'details',
  });
}

describe('canonical structured-field composition lifecycle', () => {
  it('adds a derived struct while retaining the original roots and fresh child provenance', () => {
    const draft = projectionDraft();
    const before = resolveDvtSubstraitStructuredProjectionParts(draft)!;
    const targetRelationId = before.targetRelation.relationId;
    const rootsBefore = orderedDvtSubstraitFields(draft.sidecar.fields, targetRelationId);
    const mappingsBefore = [...before.emit.outputMapping];

    const composed = composeDetails(draft);

    const after = resolveDvtSubstraitStructuredProjectionParts(composed)!;
    const rootsAfter = orderedDvtSubstraitFields(composed.sidecar.fields, targetRelationId);
    expect(rootsAfter.slice(0, rootsBefore.length)).toEqual(rootsBefore);
    expect(rootsAfter.map((field) => field.fieldId)).toEqual([
      'output:order_id',
      'output:customer',
      'output:amount',
      'output:status',
      'output:details',
    ]);
    expect(after.emit.outputMapping.slice(0, mappingsBefore.length)).toEqual(mappingsBefore);

    const originalByName = new Map(rootsBefore.map((field) => [field.displayName, field]));
    const children = orderedDvtSubstraitFields(
      composed.sidecar.fields,
      targetRelationId,
      'output:details'
    );
    expect(children.map((field) => field.displayName)).toEqual(['customer', 'amount']);
    children.forEach((child) => {
      const original = originalByName.get(child.displayName);
      expect(original).toBeDefined();
      expect(child.fieldId).not.toBe(original!.fieldId);
      expect(child).toMatchObject({
        relationId: original!.relationId,
        sourceFieldId: original!.sourceFieldId,
        parentFieldId: 'output:details',
      });
    });

    const sourceCount = orderedDvtSubstraitFields(
      draft.sidecar.fields,
      before.sourceRelation.relationId
    ).length;
    const parentMapping = after.emit.outputMapping[rootsBefore.length]!;
    const parentExpression = after.project.expressions[parentMapping - sourceCount]!;
    expect(parentExpression.rexType.case).toBe('nested');
    if (
      parentExpression.rexType.case !== 'nested' ||
      parentExpression.rexType.value.nestedType.case !== 'struct'
    ) {
      throw new Error('Expected a canonical derived struct expression.');
    }
    expect(parentExpression.rexType.value.nestedType.value.fields).toEqual([
      createDvtSubstraitFieldReference(mappingsBefore[1]!),
      createDvtSubstraitFieldReference(mappingsBefore[2]!),
    ]);
  });
});

describe('removeDvtSubstraitProjectionRoot', () => {
  it('removes only the derived struct and leaves original roots unchanged', () => {
    const original = projectionDraft();
    const originalParts = resolveDvtSubstraitStructuredProjectionParts(original)!;
    const targetRelationId = originalParts.targetRelation.relationId;
    const rootsBefore = orderedDvtSubstraitFields(original.sidecar.fields, targetRelationId);
    const mappingsBefore = [...originalParts.emit.outputMapping];
    const expressionsBefore = [...originalParts.project.expressions];
    const composed = composeDetails(original);

    const dissolved = removeDvtSubstraitProjectionRoot(composed, { fieldId: 'output:details' });

    const after = resolveDvtSubstraitStructuredProjectionParts(dissolved)!;
    expect(orderedDvtSubstraitFields(dissolved.sidecar.fields, targetRelationId)).toEqual(
      rootsBefore
    );
    expect(after.emit.outputMapping).toEqual(mappingsBefore);
    expect(after.project.expressions).toEqual(expressionsBefore);
    expect(inspectDvtSubstraitStructuredFieldDraft(dissolved)).toEqual({
      ok: true,
      fields: [
        { fieldId: 'output:order_id', name: 'order_id' },
        { fieldId: 'output:customer', name: 'customer' },
        { fieldId: 'output:amount', name: 'amount' },
        { fieldId: 'output:status', name: 'status' },
      ],
    });
    expect(
      dissolved.sidecar.fields.some(
        (field) => field.fieldId === 'output:details' || field.parentFieldId === 'output:details'
      )
    ).toBe(false);
  });

  it('rejects a missing root without mutating the draft', () => {
    const draft = composeDetails();
    expect(removeDvtSubstraitProjectionRoot(draft, { fieldId: 'output:missing' })).toBe(draft);
  });
});
