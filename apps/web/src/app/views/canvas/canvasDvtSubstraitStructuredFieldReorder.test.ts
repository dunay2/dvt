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
import { composeDvtSubstraitProjectionFields } from './canvasDvtSubstraitStructuredFieldMutation';
import {
  reorderDvtSubstraitStructuredFieldChildren,
  reorderDvtSubstraitStructuredFieldRoots,
} from './canvasDvtSubstraitStructuredFieldReorder';

const ORDER_CHILD = 'output:identity:child:output:order_id';
const CUSTOMER_CHILD = 'output:identity:child:output:customer';

function buildStructuredProjectionDraft(): DvtSubstraitProjectionDraft {
  const source = {
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
    ],
  };
  return composeDvtSubstraitProjectionFields(
    createDvtSubstraitProjectionDraft({
      source,
      targetNodeId: 'transform-orders',
      outputs: source.fields.map((field) => ({
        fieldId: `output:${field.name}`,
        name: field.name,
        sourceFieldName: field.name,
      })),
    }),
    {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    }
  );
}

describe('structured projection reordering', () => {
  it('moves a child inside its parent while preserving derived field identities', () => {
    const draft = buildStructuredProjectionDraft();
    const reordered = reorderDvtSubstraitStructuredFieldChildren(draft, {
      parentFieldId: 'output:identity',
      fieldId: CUSTOMER_CHILD,
      targetFieldId: ORDER_CHILD,
      placement: 'before',
    });

    const inspection = inspectDvtSubstraitStructuredFieldDraft(reordered);
    expect(inspection.ok).toBe(true);
    const identity = inspection.ok
      ? inspection.fields.find((field) => field.fieldId === 'output:identity')
      : undefined;
    expect(identity?.children).toMatchObject([
      { fieldId: CUSTOMER_CHILD },
      { fieldId: ORDER_CHILD },
    ]);
    const targetRelationId =
      resolveDvtSubstraitStructuredProjectionParts(reordered)?.targetRelation.relationId;
    expect(
      orderedDvtSubstraitFields(reordered.sidecar.fields, targetRelationId!, 'output:identity').map(
        (field) => field.fieldId
      )
    ).toEqual([CUSTOMER_CHILD, ORDER_CHILD]);
  });

  it('moves a structured root among scalar roots without changing its children', () => {
    const draft = buildStructuredProjectionDraft();
    const reordered = reorderDvtSubstraitStructuredFieldRoots(draft, {
      fieldId: 'output:identity',
      targetFieldId: 'output:order_id',
      placement: 'before',
    });
    const inspection = inspectDvtSubstraitStructuredFieldDraft(reordered);
    expect(inspection.ok && inspection.fields.map((field) => field.fieldId)).toEqual([
      'output:identity',
      'output:order_id',
      'output:customer',
      'output:amount',
    ]);
    const identity = inspection.ok ? inspection.fields[0] : undefined;
    expect(identity?.children?.map((field) => field.fieldId)).toEqual([
      ORDER_CHILD,
      CUSTOMER_CHILD,
    ]);
  });

  it('rejects cross-parent and unknown identities without mutation', () => {
    const draft = buildStructuredProjectionDraft();
    expect(
      reorderDvtSubstraitStructuredFieldChildren(draft, {
        parentFieldId: 'output:missing',
        fieldId: CUSTOMER_CHILD,
        targetFieldId: ORDER_CHILD,
        placement: 'after',
      })
    ).toBe(draft);
  });
});
