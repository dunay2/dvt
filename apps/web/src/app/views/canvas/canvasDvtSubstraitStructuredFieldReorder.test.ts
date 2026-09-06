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
import { reorderDvtSubstraitStructuredFieldChildren } from './canvasDvtSubstraitStructuredFieldReorder';

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

describe('reorderDvtSubstraitStructuredFieldChildren', () => {
  it('moves a child inside its parent while preserving field identities', () => {
    const draft = buildStructuredProjectionDraft();
    const reordered = reorderDvtSubstraitStructuredFieldChildren(draft, {
      parentFieldId: 'output:identity',
      fieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      placement: 'before',
    });

    const inspection = inspectDvtSubstraitStructuredFieldDraft(reordered);
    expect(inspection.ok).toBe(true);
    expect(inspection.ok ? inspection.fields[0] : null).toMatchObject({
      fieldId: 'output:identity',
      children: [{ fieldId: 'output:customer' }, { fieldId: 'output:order_id' }],
    });
    const targetRelationId =
      resolveDvtSubstraitStructuredProjectionParts(reordered)?.targetRelation.relationId;
    expect(targetRelationId).toBeDefined();
    expect(
      orderedDvtSubstraitFields(reordered.sidecar.fields, targetRelationId!, 'output:identity').map(
        (field) => field.fieldId
      )
    ).toEqual(['output:customer', 'output:order_id']);
  });

  it('rejects cross-parent and unknown identities without mutation', () => {
    const draft = buildStructuredProjectionDraft();
    expect(
      reorderDvtSubstraitStructuredFieldChildren(draft, {
        parentFieldId: 'output:missing',
        fieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        placement: 'after',
      })
    ).toBe(draft);
  });
});
