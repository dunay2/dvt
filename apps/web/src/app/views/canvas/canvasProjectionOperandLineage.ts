/** Validate sidecar dependencies against canonical expression structure, not root argument slots. */
import { equals } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

export function projectionOperandLineageMatches(
  expression: Expression,
  fieldIds: readonly string[],
  resolve: (fieldId: string) => Expression | null
): boolean {
  if (fieldIds.length === 0 || new Set(fieldIds).size !== fieldIds.length) return false;
  const operands = fieldIds.map((fieldId) => ({ fieldId, expression: resolve(fieldId) }));
  if (operands.some((operand) => operand.expression == null)) return false;
  let matched = 0;
  const matches = (index: number, current: Expression): boolean => {
    const candidate = operands[index]?.expression;
    return candidate != null && equals(ExpressionSchema, candidate, current);
  };
  const visit = (current: Expression): boolean => {
    // Separate aliases may resolve to equal expressions. Consume declared dependencies in order.
    if (matches(matched, current)) {
      matched += 1;
      return true;
    }
    if (operands.slice(0, matched).some((_, index) => matches(index, current))) return true;
    // Inline constants add no field dependency. Referenced calculated fields matched above.
    if (current.rexType.case === 'literal') return true;
    if (current.rexType.case !== 'scalarFunction') return false;
    return current.rexType.value.arguments.every(
      (argument) =>
        argument.argType.case === 'enum' ||
        (argument.argType.case === 'value' && visit(argument.argType.value))
    );
  };
  return visit(expression) && matched === fieldIds.length;
}
