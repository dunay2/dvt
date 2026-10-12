/**
 * Owned concern: adapt the selected JOIN input scope to the shared scalar formula compiler.
 * @baseline GH-3612: a scalar predicate may depend on both input rows.
 * @decision Compile to the existing canonical expression, never a JOIN-specific formula AST.
 * @consequence Input ordinals, provider admission and boolean result are enforced before mutation.
 * @version 1.0.0
 */
import { clone } from '@bufbuild/protobuf';
import { PlanSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { SelectedJoin } from './canvasSelectedJoin';
import {
  compileDerivedOutputFormula,
  describeDerivedOutputFormula,
} from './canvasDerivedOutputFormula';
import { derivedOutputDataType } from './canvasDerivedOutputExpression';
import { sourceFieldType } from './canvasSourceRelation';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export const JOIN_PREDICATE_FORMULA_REJECTION = {
  invalid: 'invalid',
  booleanRequired: 'booleanRequired',
} as const;

export class JoinPredicateFormulaError extends Error {
  constructor(
    readonly reason: keyof typeof JOIN_PREDICATE_FORMULA_REJECTION,
    cause?: unknown
  ) {
    super(reason, { cause });
    this.name = 'JoinPredicateFormulaError';
  }
}

export function joinPredicateFormulaScope(selected: SelectedJoin) {
  const fields = selected.fields.map((field) => ({
    fieldId: field.fieldId,
    name: `${field.inputIndex === 0 ? 'L' : 'R'}.${field.label}`,
    dataType: derivedOutputDataType(sourceFieldType(field.dataType, true))!,
    expression: dvtSubstraitExpression.field(field.ordinal),
  }));
  const names: string[] = [];
  selected.fields.forEach((field, index) => {
    names[field.ordinal] = fields[index]!.name;
  });
  const expression =
    selected.target.relation.relType.case === 'join'
      ? selected.target.relation.relType.value.expression
      : undefined;
  return {
    fields,
    formula:
      expression == null
        ? null
        : describeDerivedOutputFormula(selected.target.plan, expression, names),
    references: selected.fields.map((field, index) => ({
      relationId: selected.inputs[field.inputIndex]!.relationId,
      fieldId: field.fieldId,
      name: fields[index]!.name,
    })),
  };
}

export function compileJoinPredicateFormula(
  selected: SelectedJoin,
  formula: string,
  provider: string
) {
  const plan = clone(PlanSchema, { ...selected.target.plan, relations: [] });
  let result: ReturnType<typeof compileDerivedOutputFormula>;
  try {
    result = compileDerivedOutputFormula({
      formula,
      fields: joinPredicateFormulaScope(selected).fields,
      provider,
      plan,
    });
  } catch (cause) {
    throw new JoinPredicateFormulaError(JOIN_PREDICATE_FORMULA_REJECTION.invalid, cause);
  }
  if (result.dataType !== 'boolean')
    throw new JoinPredicateFormulaError(JOIN_PREDICATE_FORMULA_REJECTION.booleanRequired);
  return { plan, expression: result.expression };
}
