import { describe, expect, it } from 'vitest';

import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
} from './canvasDvtSubstraitProjection';

function bigintProjection() {
  return createDvtSubstraitProjectionDraft({
    source: {
      nodeId: 'source-metrics',
      schema: 'raw',
      table: 'metrics',
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'warehouse-main',
          provider: 'postgres',
        },
        sourceObjectId: 'raw.metrics',
      },
      fields: [
        { name: 'left_value', dataType: 'bigint' },
        { name: 'right_value', dataType: 'bigint' },
      ],
    },
    targetNodeId: 'transform-metrics',
    outputs: [
      { fieldId: 'output:left', name: 'left_value', sourceFieldName: 'left_value' },
      { fieldId: 'output:right', name: 'right_value', sourceFieldName: 'right_value' },
    ],
  });
}

describe('Canvas i64 arithmetic projection', () => {
  it.each(['add', 'subtract', 'multiply', 'divide'] as const)(
    'authors and re-inspects %s as canonical bigint arithmetic',
    (name) => {
      const capability = resolveDvtSubstraitColumnFunctions({
        dataTypes: ['bigint', 'bigint'],
        provider: 'postgres',
        resolution: 'complete',
      }).find((candidate) => candidate.name === name);
      if (capability == null) throw new Error(`Expected admitted ${name} capability.`);

      const result = createDvtSubstraitProjectionOutput(
        bigintProjection(),
        {
          alias: `${name}_result`,
          expression: {
            kind: 'scalar-function',
            capabilityId: capability.capabilityId,
            operandFieldIds: ['output:left', 'output:right'],
          },
        },
        { inputDataTypes: ['bigint', 'bigint'], provider: 'postgres' }
      );

      expect(result.outcome).toBe('applied');
      if (result.outcome !== 'applied') throw new Error(result.reason);
      const inspection = inspectDvtSubstraitProjectionDraft(result.draft);
      expect(inspection.ok).toBe(true);
      if (!inspection.ok) return;

      expect(inspection.projection.outputs.at(-1)).toMatchObject({
        name: `${name}_result`,
        dataType: 'bigint',
        operandFieldIds: ['output:left', 'output:right'],
        scalarExpression: {
          kind: 'scalar-function',
          functionName: name,
          arguments: [
            { kind: 'field-reference', sourceFieldName: 'left_value' },
            { kind: 'field-reference', sourceFieldName: 'right_value' },
          ],
        },
      });
    }
  );

  it('fails closed for mixed bigint/text operands', () => {
    const add = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['bigint', 'bigint'],
      provider: 'postgres',
      resolution: 'complete',
    }).find((candidate) => candidate.name === 'add');
    if (add == null) throw new Error('Expected admitted add capability.');

    const draft = createDvtSubstraitProjectionDraft({
      source: {
        nodeId: 'source-mixed',
        schema: 'raw',
        table: 'mixed_values',
        sourceRef: {
          schemaVersion: 'connected-source-ref.v1',
          connectionRef: {
            schemaVersion: 'connection-ref.v1',
            connectionId: 'warehouse-main',
            provider: 'postgres',
          },
          sourceObjectId: 'raw.mixed_values',
        },
        fields: [
          { name: 'number_value', dataType: 'bigint' },
          { name: 'text_value', dataType: 'text' },
        ],
      },
      targetNodeId: 'transform-mixed',
      outputs: [
        { fieldId: 'output:number', name: 'number_value', sourceFieldName: 'number_value' },
        { fieldId: 'output:text', name: 'text_value', sourceFieldName: 'text_value' },
      ],
    });

    expect(
      createDvtSubstraitProjectionOutput(
        draft,
        {
          alias: 'invalid_sum',
          expression: {
            kind: 'scalar-function',
            capabilityId: add.capabilityId,
            operandFieldIds: ['output:number', 'output:text'],
          },
        },
        { inputDataTypes: ['bigint', 'text'], provider: 'postgres' }
      )
    ).toEqual({ outcome: 'rejected', reason: 'unsupported_capability' });
  });
});
