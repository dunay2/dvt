import { describe, expect, it } from 'vitest';

import {
  createDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import {
  decodeDvtSubstraitStructuredFieldDocument,
  encodeDvtSubstraitStructuredFieldDocument,
  inspectDvtSubstraitStructuredFieldDraft,
} from './canvasDvtSubstraitStructuredField';
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

describe('canonical Substrait structured Transform fields', () => {
  it('persists one explicit parent while retaining ordered child identities', () => {
    const composed = composeDvtSubstraitProjectionFields(projectionDraft(), {
      draggedFieldId: 'output:customer',
      targetFieldId: 'output:order_id',
      parentFieldId: 'output:identity',
      parentName: 'identity',
    });
    const reloaded = decodeDvtSubstraitStructuredFieldDocument(
      encodeDvtSubstraitStructuredFieldDocument(composed)
    );

    expect(inspectDvtSubstraitStructuredFieldDraft(reloaded)).toEqual({
      ok: true,
      fields: [
        {
          fieldId: 'output:identity',
          name: 'identity',
          children: [
            { fieldId: 'output:order_id', name: 'order_id' },
            { fieldId: 'output:customer', name: 'customer' },
          ],
        },
        { fieldId: 'output:amount', name: 'amount' },
      ],
    });
  });

  it('fails closed without changing the draft for invalid composition identities', () => {
    const draft = projectionDraft();
    const invalidRequests = [
      {
        draggedFieldId: 'output:order_id',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:missing',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:amount',
        parentName: 'identity',
      },
      {
        draggedFieldId: 'output:customer',
        targetFieldId: 'output:order_id',
        parentFieldId: 'output:identity',
        parentName: 'amount',
      },
    ];

    invalidRequests.forEach((request) => {
      expect(composeDvtSubstraitProjectionFields(draft, request)).toBe(draft);
    });
  });
});
