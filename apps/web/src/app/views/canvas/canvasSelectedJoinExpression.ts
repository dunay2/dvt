/** Pure canonical expression builder shared by preview and commit; no document traversal or mutation. */
import { clone } from '@bufbuild/protobuf';
import { PlanSchema, type Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { JoinConditionField } from './canvasSelectedJoin';
import {
  reduceDvtSubstraitJoinConditions,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  buildDvtSubstraitJoinOperandExpression,
  resolveDvtSubstraitJoinOperandDataType,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';
import {
  comparisonFunctionIdentity,
  booleanFunctionIdentity,
} from './canvasDvtSubstraitJoinConditionInspection';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { sourceFieldType } from './canvasSourceRelation';

export function buildSelectedJoinExpression(
  selected: Readonly<{ plan: Plan; relationId: string; fields: readonly JoinConditionField[] }>,
  conditions: readonly DvtSubstraitJoinPredicateCondition[]
) {
  const fields = new Map(selected.fields.map((field) => [field.fieldId, field]));
  const plan = clone(PlanSchema, { ...selected.plan, relations: [] });
  const scalar = (
    identity: Readonly<{ urn: string; name: string }>,
    operands: readonly Expression[],
    nullable = true
  ) =>
    dvtSubstraitExpression.scalarFunction({
      functionReference: dvtSubstraitExpression.ensureScalarFunction(plan, identity).functionAnchor,
      arguments: operands,
      outputType: sourceFieldType('bool', nullable),
    });
  const typeOf = (operand: DvtSubstraitJoinPredicateOperand) =>
    resolveDvtSubstraitJoinOperandDataType(
      operand,
      (field) => fields.get(field.sourceFieldId)?.dataType ?? null
    );
  const expressionOf = (operand: DvtSubstraitJoinPredicateOperand) =>
    buildDvtSubstraitJoinOperandExpression({
      plan,
      operand,
      fieldExpression: (field) => {
        const binding = fields.get(field.sourceFieldId);
        if (binding == null)
          throw new SubstraitAnalysisError(
            'invalid_binding',
            'Predicate field is outside the selected inputs.',
            selected.relationId
          );
        return dvtSubstraitExpression.field(binding.ordinal);
      },
    });
  const expression = reduceDvtSubstraitJoinConditions({
    conditions,
    comparison: (condition) => {
      const nullable = !isDvtSubstraitJoinNullCondition(condition);
      const left = typeOf(condition.left);
      if (left == null || (nullable && left !== typeOf(condition.right!)))
        throw new SubstraitAnalysisError(
          'invalid_binding',
          'Predicate operands must have compatible types in the selected input scope.',
          selected.relationId
        );
      return scalar(
        comparisonFunctionIdentity(condition.operator ?? 'equal'),
        [expressionOf(condition.left), ...(nullable ? [expressionOf(condition.right!)] : [])],
        nullable
      );
    },
    combine: (combination, left, right) =>
      scalar(booleanFunctionIdentity(combination), [left, right]),
  });
  return { plan, expression };
}
