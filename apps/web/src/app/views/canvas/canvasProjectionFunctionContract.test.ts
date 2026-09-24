import { describe, expect, it } from 'vitest';
import { create } from '@bufbuild/protobuf';
import {
  FunctionOptionSchema,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  applyDvtSubstraitProjectionFunction,
  inspectDvtSubstraitProjectionDraft,
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitProjectionDraft,
} from './canvasDvtSubstraitProjection';
import { createDvtSubstraitProjectionOutput } from './canvasDvtSubstraitCalculatedColumn';
import { connectedOrdersProjectionDraft } from './canvasProjectionCommand.test-support';

describe('Canonical scalar authoring contract', () => {
  it('rejects false caller type claims against canonical Substrait source types', () => {
    const concat = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text', 'text'],
      provider: 'postgres',
    }).find((candidate) => candidate.name === 'concat');
    if (concat == null) throw new Error('Expected admitted CONCAT capability.');

    expect(
      createDvtSubstraitProjectionOutput(
        connectedOrdersProjectionDraft(),
        {
          alias: 'invalid_concat',
          expression: {
            kind: 'scalar-function',
            operandFieldIds: ['output:order_id', 'output:amount'],
            capabilityId: concat.capabilityId,
          },
        },
        { inputDataTypes: ['text', 'text'], provider: 'postgres' }
      ).outcome
    ).toBe('rejected');
  });
  it('projects only admitted scalar functions compatible with the field type and target', () => {
    const textFunctions = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text'],
      provider: 'postgres',
    });

    expect(textFunctions.map((item) => item.name)).toEqual(['lower', 'trim', 'upper']);
    expect(textFunctions.every((item) => item.category === 'text')).toBe(true);
    expect(textFunctions.every((item) => item.capabilityId.includes('scalar-function'))).toBe(true);
    expect(
      resolveDvtSubstraitColumnFunctions({ dataType: 'integer', provider: 'postgres' })
    ).toEqual([]);
    expect(
      resolveDvtSubstraitColumnFunctions({ dataType: 'numeric', provider: 'postgres' })
    ).toEqual([]);
    expect(resolveDvtSubstraitColumnFunctions({ dataType: 'text', provider: 'duckdb' })).toEqual(
      []
    );
  });
  it('rejects scalar functions whose return type or behavioral options exceed the profile', () => {
    const trim = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text'],
      provider: 'postgres',
    }).find((item) => item.name === 'trim');
    if (trim == null) throw new Error('Expected admitted trim capability.');
    const applyTrim = (): DvtSubstraitProjectionDraft =>
      applyDvtSubstraitProjectionFunction(connectedOrdersProjectionDraft(), {
        fieldId: 'output:customer',
        operandFieldIds: ['output:customer'],
        capabilityId: trim.capabilityId,
        alias: 'buyer',
        dataTypes: ['text'],
        provider: 'postgres',
      });
    const readScalarFunction = (draft: DvtSubstraitProjectionDraft): Expression_ScalarFunction => {
      const root = draft.plan.relations[0]?.relType;
      const project = root?.case === 'root' ? root.value.input?.relType : undefined;
      const expression = project?.case === 'project' ? project.value.expressions[0] : undefined;
      if (expression?.rexType.case !== 'scalarFunction') {
        throw new Error('Expected one scalar function expression.');
      }
      return expression.rexType.value;
    };

    const invalidReturnType = applyTrim();
    readScalarFunction(invalidReturnType).outputType = undefined;
    expect(inspectDvtSubstraitProjectionDraft(invalidReturnType)).toEqual({ ok: false });

    const unsupportedOptions = applyTrim();
    readScalarFunction(unsupportedOptions).options.push(
      create(FunctionOptionSchema, { name: 'unsupported', preference: ['enabled'] })
    );
    expect(inspectDvtSubstraitProjectionDraft(unsupportedOptions)).toEqual({ ok: false });
  });
  it('applies a function only to the selected output when expressions are shared', () => {
    const functions = resolveDvtSubstraitColumnFunctions({
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const trim = functions.find((item) => item.name === 'trim');
    const upper = functions.find((item) => item.name === 'upper');
    if (trim == null || upper == null) throw new Error('Expected admitted text functions.');
    const withTrim = applyDvtSubstraitProjectionFunction(connectedOrdersProjectionDraft(), {
      fieldId: 'output:customer',
      operandFieldIds: ['output:customer'],
      capabilityId: trim.capabilityId,
      alias: 'buyer',
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const trimInspection = inspectDvtSubstraitProjectionDraft(withTrim);
    if (!trimInspection.ok) throw new Error('Expected admitted trim projection.');
    const sharedSourceFieldId = trimInspection.projection.outputs[1]?.sourceFieldId;
    if (sharedSourceFieldId == null) throw new Error('Expected trim source lineage.');
    const root = withTrim.plan.relations[0]?.relType;
    const project = root?.case === 'root' ? root.value.input?.relType : undefined;
    const emitKind = project?.case === 'project' ? project.value.common?.emitKind : undefined;
    if (emitKind?.case !== 'emit') throw new Error('Expected projection output mapping.');
    emitKind.value.outputMapping[2] = emitKind.value.outputMapping[1]!;
    const sharedTrim: DvtSubstraitProjectionDraft = {
      ...withTrim,
      sidecar: {
        ...withTrim.sidecar,
        fields: withTrim.sidecar.fields.map((field) =>
          field.fieldId === 'output:amount'
            ? { ...field, sourceFieldId: sharedSourceFieldId }
            : field
        ),
      },
    };
    expect(inspectDvtSubstraitProjectionDraft(sharedTrim).ok).toBe(true);

    const withUpper = applyDvtSubstraitProjectionFunction(sharedTrim, {
      fieldId: 'output:customer',
      operandFieldIds: ['output:customer'],
      capabilityId: upper.capabilityId,
      alias: 'buyer',
      dataTypes: ['text'],
      provider: 'postgres',
    });
    const inspection = inspectDvtSubstraitProjectionDraft(withUpper);

    expect(inspection.ok).toBe(true);
    if (!inspection.ok) return;
    expect(inspection.projection.outputs[1]?.operations).toEqual(['trim', 'upper']);
    expect(inspection.projection.outputs[2]?.operations).toEqual(['trim']);
  });
});
