export type { DvtSubstraitJoinPredicateOperand } from '@dvt/postgres-projection';
import type { JoinFieldOperand, DvtSubstraitJoinOperand } from '@dvt/postgres-projection';
export {
  type DvtSubstraitJoinOperand,
  resolveDvtSubstraitJoinUnaryFunctions,
  resolveDvtSubstraitJoinOperandDataType,
} from '@dvt/postgres-projection';
/** JOIN authoring compares produced fields/literals; scalar computations belong to Transform. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';

export function dvtSubstraitJoinOperandKey<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>,
  fieldKey: (field: Field) => string
): string {
  if (operand.kind === 'field') return `field:${fieldKey(operand as Field)}`;
  if (operand.kind === 'literal') {
    return `literal:${operand.literal.dataType}:${String(operand.literal.value)}`;
  }
  return `function:${operand.capabilityId}:${dvtSubstraitJoinOperandKey(operand.input, fieldKey)}`;
}

export function buildDvtSubstraitJoinOperandExpression<Field extends JoinFieldOperand>(args: {
  operand: DvtSubstraitJoinOperand<Field>;
  fieldExpression: (field: Field) => Expression;
}): Expression {
  const { operand } = args;
  if (operand.kind === 'field') return args.fieldExpression(operand as Field);
  if (operand.kind === 'literal') return dvtSubstraitExpression.literal(operand.literal);
  throw new SubstraitAnalysisError(
    'invalid_binding',
    'JOIN operands must be produced fields or literals. Create calculations in an upstream Transform.'
  );
}
