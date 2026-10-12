/**
 * Owned concern: preserve scalar identity and invocation semantics during dependency retyping.
 * @baseline ADR-0064: admitted canonical functions, not names alone, own meaning.
 * @decision Use the real catalogue and builder for positive and hostile invocations.
 * @consequence Retyping cannot sanitize unsupported functions or lose behavioral options.
 * @version 1.0.0
 */
import { create, clone } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  FunctionOptionSchema,
  FunctionArgumentSchema,
  type Expression,
  type Expression_ScalarFunction,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  TypeSchema,
  Type_Nullability,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { resolveDvtSubstraitColumnFunctions } from '@dvt/postgres-projection';
import {
  indexSubstraitRelations,
  readSubstraitAuthoringGroup,
  type SchemaField,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';
import { describe, expect, it } from 'vitest';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
import { retypeTransformExpression } from './canvasTransformDependencyTypes';
import { TRANSFORM_DEPENDENCY_REJECTION } from './TransformDependencyError';
import { connectedNamesProjectionDraft } from './canvasProjectionCommand.test-support';
import { CanvasRelationAnalysisSession } from './canvasRelationAnalysisSession';
import { applySelectedRelationDerivedOutput } from './canvasSelectedRelationDerivedOutput';
import { readCanvasTransformDependencyModel } from './canvasTransformDependencyModel';

function fields(
  kind: 'string' | 'i64' | 'fp64' | 'precisionTimestampTz',
  count: number
): SchemaField[] {
  return Array.from({ length: count }, () => ({
    type: create(TypeSchema, {
      kind:
        kind === 'precisionTimestampTz'
          ? { case: kind, value: { nullability: Type_Nullability.NULLABLE, precision: 3 } }
          : { case: kind, value: { nullability: Type_Nullability.NULLABLE } },
    }),
    sourceFieldIds: [],
  }));
}

function scalar(
  name: string,
  dataTypes: readonly string[]
): Readonly<{ plan: Plan; expression: Expression; fn: Expression_ScalarFunction }> {
  const plan = create(PlanSchema);
  const capability = resolveDvtSubstraitColumnFunctions({
    dataTypes,
    provider: 'postgres',
    resolution: 'complete',
  }).find((entry) => entry.name === name)!;
  const expression = buildDvtSubstraitScalarFunction({
    plan,
    provider: 'postgres',
    capabilityId: capability.capabilityId,
    dataTypes,
    operands: dataTypes.map((_, ordinal) => dvtSubstraitExpression.field(ordinal)),
  });
  if (expression?.rexType.case !== 'scalarFunction') throw new Error('Expected admitted scalar.');
  return { plan, expression, fn: expression.rexType.value };
}

describe('Transform dependency scalar type reconciliation', () => {
  it('updates a compatible result type while preserving every invocation field', () => {
    const { plan, expression, fn } = scalar('coalesce', ['bigint', 'bigint']);
    const before = clone(ExpressionSchema, expression);
    const result = retypeTransformExpression(expression, fields('string', 2), plan, 'postgres');
    expect(result.rexType.case).toBe('scalarFunction');
    if (result.rexType.case !== 'scalarFunction') throw new Error('Expected scalar.');
    expect(result.rexType.value.outputType?.kind.case).toBe('string');
    expect({ ...result.rexType.value, outputType: fn.outputType }).toEqual(fn);
    expect(expression).toEqual(before);
  });

  it('rejects overload changes that would replace overflow behavior with rounding', () => {
    const { plan, expression } = scalar('add', ['bigint', 'bigint']);
    const before = clone(PlanSchema, plan);
    expect(() =>
      retypeTransformExpression(expression, fields('fp64', 2), plan, 'postgres')
    ).toThrowError(TRANSFORM_DEPENDENCY_REJECTION.typeConflict);
    expect(plan).toEqual(before);
  });

  it('retains admitted enum and fixed literal arguments exactly', () => {
    const { plan, expression } = scalar('extract year (UTC)', ['timestamp with time zone']);
    const before = clone(PlanSchema, plan);
    expect(
      retypeTransformExpression(expression, fields('precisionTimestampTz', 1), plan, 'postgres')
    ).toEqual(expression);
    expect(plan).toEqual(before);
  });

  it.each([
    'foreign urn',
    'unknown signature',
    'changed options',
    'extra enum',
    'unsupported provider',
  ])('rejects %s without rewriting the expression or declarations', (fault) => {
    const { plan, expression, fn } = scalar('trim', ['string']);
    if (fault === 'foreign urn')
      plan.extensionUrns[0]!.urn = 'extension:untrusted:functions_string';
    if (fault === 'unknown signature') {
      const declaration = plan.extensions[0]!.mappingType;
      if (declaration.case === 'extensionFunction') declaration.value.name = 'trim:fp64';
    }
    if (fault === 'changed options')
      fn.options.push(
        create(FunctionOptionSchema, { name: 'unsupported', preference: ['enabled'] })
      );
    if (fault === 'extra enum')
      fn.arguments.unshift(
        create(FunctionArgumentSchema, { argType: { case: 'enum', value: 'UNKNOWN' } })
      );
    const before = clone(PlanSchema, plan);
    const original = clone(ExpressionSchema, expression);
    expect(() =>
      retypeTransformExpression(
        expression,
        fields('string', 1),
        plan,
        fault === 'unsupported provider' ? 'duckdb' : 'postgres'
      )
    ).toThrowError(TRANSFORM_DEPENDENCY_REJECTION.typeConflict);
    expect(plan).toEqual(before);
    expect(expression).toEqual(original);
  });

  it.each(['enum', 'timezone'])('rejects changed EXTRACT %s without normalizing it', (fault) => {
    const { plan, expression, fn } = scalar('extract year (UTC)', ['timestamp with time zone']);
    if (fault === 'enum' && fn.arguments[0]!.argType.case === 'enum')
      fn.arguments[0]!.argType.value = 'MONTH';
    if (fault === 'timezone')
      fn.arguments[2]!.argType = {
        case: 'value',
        value: dvtSubstraitExpression.literal({ dataType: 'string', value: 'Europe/Madrid' }),
      };
    expect(() =>
      retypeTransformExpression(expression, fields('precisionTimestampTz', 1), plan, 'postgres')
    ).toThrowError(TRANSFORM_DEPENDENCY_REJECTION.typeConflict);
  });

  it('retains producer identities when changing a dependency compacts and expands layers', async () => {
    const session = new CanvasRelationAnalysisSession('layer-identities');
    session.receive(connectedNamesProjectionDraft());
    const apply = (
      alias: string,
      formula: string,
      outputFieldId?: string
    ): ReturnType<typeof applySelectedRelationDerivedOutput> =>
      applySelectedRelationDerivedOutput(session, {
        relationId: session.rootId,
        expectedRevision: session.revision,
        intent: 'edit',
        alias,
        formula,
        ...(outputFieldId == null ? {} : { outputFieldId }),
      });
    const inspect = (
      document: SubstraitDocument
    ): Readonly<{
      group: NonNullable<ReturnType<typeof readSubstraitAuthoringGroup>>;
      model: ReturnType<typeof readCanvasTransformDependencyModel>;
      producers: Record<string, string>;
    }> => {
      const indexed = indexSubstraitRelations(document);
      if (!indexed.ok) throw indexed.error;
      const group = readSubstraitAuthoringGroup(indexed.index, session.rootId!)!;
      const model = readCanvasTransformDependencyModel(group.root, (id) =>
        indexed.index.relations.get(id)!
      );
      return {
        group,
        model,
        producers: Object.fromEntries(
          model.definitions.map((definition) => [
            definition.output!.displayName!,
            definition.binding.fieldId,
          ])
        ),
      };
    };
    try {
      await apply('alias_a', 'TRIM("first_name")');
      await apply('alias_b', 'UPPER("alias_a")');
      const initial = inspect(await apply('alias_c', 'LOWER("alias_b")'));
      const middleId = initial.model.definitions.find(
        (definition) => definition.output?.displayName === 'alias_b'
      )!.output!.fieldId;
      for (const [formula, memberCount] of [
        ['UPPER("first_name")', 3],
        ['UPPER("alias_a")', 4],
      ] as const) {
        const document = await apply('alias_b', formula, middleId);
        const next = inspect(document);
        expect(next.group.members).toHaveLength(memberCount);
        expect(next.producers).toEqual(initial.producers);
        expect(next.model.root.fields.map((field) => field.fieldId)).toEqual(
          initial.model.root.fields.map((field) => field.fieldId)
        );
        expect(new Set(document.sidecar.fields.map((field) => field.fieldId)).size).toBe(
          document.sidecar.fields.length
        );
      }
    } finally {
      session.dispose();
    }
  });
});
