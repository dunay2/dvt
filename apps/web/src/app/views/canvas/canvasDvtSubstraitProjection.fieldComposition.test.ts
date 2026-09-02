import { describe, expect, it } from 'vitest';

import { projectDvtSubstraitProjectionToPostgresSql } from './canvasDvtSubstraitPostgresProjection';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';

describe('Substrait field function composition', () => {
  it('preserves the target identity while applying a function to another output expression', async () => {
    const draft = createDvtSubstraitProjectionDraft({
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
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    }).find((item) => item.name === 'upper');
    if (upper == null) throw new Error('Expected admitted upper capability.');

    const composed = applyDvtSubstraitProjectionFunction(draft, {
      fieldId: 'output:order_id',
      inputFieldId: 'output:customer',
      capabilityId: upper.capabilityId,
      alias: 'order_id',
      dataType: 'text',
      provider: 'postgres',
    });
    const inspection = inspectDvtSubstraitProjectionDraft(composed);

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[0]).toMatchObject({
      fieldId: 'output:order_id',
      name: 'order_id',
      sourceFieldName: 'customer',
      operations: ['upper'],
    });
    await expect(projectDvtSubstraitProjectionToPostgresSql(composed)).resolves.toMatch(
      /upper\(customer\) AS order_id/i
    );
  });

  it('does not mutate when the dragged field identity is unknown', () => {
    const draft = createDvtSubstraitProjectionDraft({
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
        fields: [{ name: 'customer', dataType: 'text' }],
      },
      targetNodeId: 'transform-orders',
      outputs: [{ fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' }],
    });
    const upper = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
    })[1]!;

    expect(
      applyDvtSubstraitProjectionFunction(draft, {
        fieldId: 'output:customer',
        inputFieldId: 'output:missing',
        capabilityId: upper.capabilityId,
        alias: 'customer',
        dataType: 'text',
        provider: 'postgres',
      })
    ).toBe(draft);
  });
});
