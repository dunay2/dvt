import { describe, expect, it } from 'vitest';

import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import {
  applyDvtSubstraitProjectionFunction,
  createDvtSubstraitProjectionDraft,
  inspectDvtSubstraitProjectionDraft,
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
        { name: 'order_id', dataType: 'bigint' },
        { name: 'customer', dataType: 'text' },
        { name: 'fallback_customer', dataType: 'text' },
        { name: 'last_resort_customer', dataType: 'text' },
      ],
    },
    targetNodeId: 'transform-orders',
    outputs: [
      { fieldId: 'output:order_id', name: 'order_id', sourceFieldName: 'order_id' },
      { fieldId: 'output:customer', name: 'customer', sourceFieldName: 'customer' },
      {
        fieldId: 'output:fallback_customer',
        name: 'fallback_customer',
        sourceFieldName: 'fallback_customer',
      },
      {
        fieldId: 'output:last_resort_customer',
        name: 'last_resort_customer',
        sourceFieldName: 'last_resort_customer',
      },
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
  it('exposes catalogued COALESCE from one selected text operand with an open upper bound', () => {
    const capability = resolveDvtSubstraitColumnFunctions({
      dataType: 'text',
      provider: 'postgres',
      resolution: 'proposal',
    }).find((item) => item.name === 'coalesce');

    expect(capability).toMatchObject({
      name: 'coalesce',
      minimumArgumentCount: 2,
    });
    expect(capability?.maximumArgumentCount).toBeUndefined();
    expect(
      resolveDvtSubstraitColumnFunctions({
        dataTypes: ['text', 'text', 'text'],
        provider: 'postgres',
      }).find((item) => item.name === 'coalesce')?.capabilityId
    ).toBe(capability?.capabilityId);
  });

  it('rejects incomplete COALESCE arity and inspects ordered recursive operands', () => {
    const draft = projectionDraft();
    const upperCapability = upper();
    const upperDraft = applyDvtSubstraitProjectionFunction(draft, {
      fieldId: 'output:last_resort_customer',
      operandFieldIds: ['output:last_resort_customer'],
      capabilityId: upperCapability.capabilityId,
      alias: 'last_resort_customer',
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const coalesce = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((item) => item.name === 'coalesce');
    if (coalesce == null) throw new Error('Expected admitted COALESCE capability.');

    expect(
      applyDvtSubstraitProjectionFunction(upperDraft, {
        fieldId: 'output:customer',
        operandFieldIds: ['output:customer'],
        capabilityId: coalesce.capabilityId,
        alias: 'customer',
        dataTypes: ['text'],
        provider: 'postgres',
      })
    ).toBe(upperDraft);

    const created = createDvtSubstraitProjectionOutput(
      upperDraft,
      {
        alias: 'preferred_customer',
        expression: {
          kind: 'scalar-function',
          operandFieldIds: [
            'output:customer',
            'output:fallback_customer',
            'output:last_resort_customer',
          ],
          capabilityId: coalesce.capabilityId,
        },
      },
      { inputDataTypes: ['text', 'text', 'text'], provider: 'postgres' }
    );
    expect(created.outcome).toBe('applied');
    if (created.outcome !== 'applied') return;
    const inspection = inspectDvtSubstraitProjectionDraft(created.draft);

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(
      inspection.projection.outputs.find((output) => output.name === 'preferred_customer')
    ).toMatchObject({
      operandFieldIds: [
        'output:customer',
        'output:fallback_customer',
        'output:last_resort_customer',
      ],
      scalarExpression: {
        kind: 'scalar-function',
        functionName: 'coalesce',
        arguments: [
          { kind: 'field-reference', sourceFieldName: 'customer' },
          { kind: 'field-reference', sourceFieldName: 'fallback_customer' },
          {
            kind: 'scalar-function',
            functionName: 'upper',
            arguments: [{ kind: 'field-reference', sourceFieldName: 'last_resort_customer' }],
          },
        ],
      },
    });

    const wrongOperandType = structuredClone(created.draft);
    const wrongTypeRoot = wrongOperandType.plan.relations[0]?.relType;
    const wrongTypeProject =
      wrongTypeRoot?.case === 'root' ? wrongTypeRoot.value.input?.relType : undefined;
    const wrongTypeExpression =
      wrongTypeProject?.case === 'project' ? wrongTypeProject.value.expressions.at(-1) : undefined;
    const firstArgument =
      wrongTypeExpression?.rexType.case === 'scalarFunction'
        ? wrongTypeExpression.rexType.value.arguments[0]?.argType
        : undefined;
    const firstReference =
      firstArgument?.case === 'value' && firstArgument.value.rexType.case === 'selection'
        ? firstArgument.value.rexType.value.referenceType
        : undefined;
    if (firstReference?.case !== 'directReference') {
      throw new Error('Expected the first COALESCE field reference.');
    }
    const firstSegment = firstReference.value.referenceType;
    if (firstSegment.case !== 'structField') {
      throw new Error('Expected the first COALESCE field ordinal.');
    }
    firstSegment.value.field = 0;
    expect(inspectDvtSubstraitProjectionDraft(wrongOperandType)).toEqual({ ok: false });

    const driftedBindings = structuredClone(created.draft);
    const outputBinding = driftedBindings.sidecar.fields.find(
      (field) => field.displayName === 'preferred_customer'
    );
    if (outputBinding == null) throw new Error('Expected the COALESCE output binding.');
    outputBinding.operandFieldIds = [
      'output:fallback_customer',
      'output:customer',
      'output:last_resort_customer',
    ];
    expect(inspectDvtSubstraitProjectionDraft(driftedBindings)).toEqual({ ok: false });
  });
});
