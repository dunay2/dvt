/**
 * Owned concern: compile one requested calculation against the canonical Transform symbol scope.
 * @baseline ADR-0064: formula syntax is transient; the persisted expression is Substrait.
 * @decision Reuse the existing admitted formula, scalar and window builders.
 * @consequence All authoring entry points preserve the same dependency semantics.
 * @version 1.0.0
 */
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { SelectedRelationDerivedOutputRequest } from './canvasSelectedRelationDerivedOutput';
import type { readTransformFormulaScope } from './canvasTransformFormulaScope';
import { compileDerivedOutputFormula } from './canvasDerivedOutputFormula';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { buildDvtSubstraitCalculatedExpression } from './canvasDvtSubstraitCalculatedExpression';
import { buildScalarChain, derivedOutputDataType } from './canvasDerivedOutputExpression';
import {
  TransformDependencyError,
  TRANSFORM_DEPENDENCY_REJECTION,
} from './TransformDependencyError';

export function compileTransformCommandExpression(
  request: SelectedRelationDerivedOutputRequest,
  scope: Awaited<ReturnType<typeof readTransformFormulaScope>>,
  plan: Plan,
  provider: string
) {
  if ('formula' in request)
    return compileDerivedOutputFormula({
      formula: request.formula,
      fields: scope.fields,
      plan,
      provider,
    }).expression;
  const operand = (fieldId: string) => {
    const symbol = scope.aliases.get(fieldId);
    const ordinal = scope.symbols.indexOf(symbol!);
    const type = symbol == null ? null : derivedOutputDataType(scope.schemas.get(symbol)!.type);
    if (ordinal < 0 || type == null || !scope.fields.some((field) => field.fieldId === symbol))
      throw new TransformDependencyError(TRANSFORM_DEPENDENCY_REJECTION.unavailable);
    return { expression: dvtSubstraitExpression.field(ordinal), type, ordinal };
  };
  if ('capabilityIds' in request) {
    const operands = request.operandFieldIds.map(operand);
    return buildScalarChain({
      plan,
      provider,
      capabilityIds: request.capabilityIds,
      operands: operands.map((item) => item.expression),
      dataTypes: operands.map((item) => item.type),
    });
  }
  if (request.expression.kind === 'field-ref')
    return operand(request.expression.inputFieldId).expression;
  return buildDvtSubstraitCalculatedExpression(
    plan,
    request.expression.kind === 'row-number'
      ? { kind: 'row-number', orderSourceOrdinal: operand(request.expression.orderFieldId).ordinal }
      : request.expression
  );
}
