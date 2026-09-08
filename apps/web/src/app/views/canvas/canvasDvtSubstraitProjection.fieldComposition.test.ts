import { describe, expect, it } from 'vitest';

import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';

function projectionDraft(): ReturnType<typeof createDvtSubstraitProjectionDraft> {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-orders',
      schema: 'raw',
      table: 'orders',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.orders',
      },
      fields: [
        { name: 'order_id', dataType: 'integer' },
        { name: 'customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
    ],
  });
}

describe('Substrait field function composition hard cut', () => {
  const upper = (): ReturnType<typeof resolveDvtSubstraitColumnFunctions>[number] => {
    const capability = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((item) => item.name === 'upper');
    if (capability == null) throw new Error('Expected admitted upper capability.');
    return capability;
  };

  it('rejects an unknown operand FieldId without mutation', () => {
    const draft = projectionDraft();

    expect(
      applyDvtSubstraitProjectionFunction(draft, {
        fieldId: 'output:customer',
        operandFieldIds: ['output:missing'],
        capabilityId: upper().capabilityId,
        alias: 'customer',
        dataTypes: ['text'],
        provider: 'postgres',
      })
    ).toBe(draft);
  });
});
