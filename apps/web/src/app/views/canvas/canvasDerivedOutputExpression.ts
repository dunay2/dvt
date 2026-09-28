/** Resolve reusable operands and build scalar chains for the canonical Transform command. */
import { clone } from '@bufbuild/protobuf';
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import {
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { SubstraitAnalysisError } from '@dvt/substrait-analysis';
import type { prepareSelectedRelationUnary } from './canvasSelectedRelationUnary';
import { relationOutputMapping } from './canvasRelationOutputBindings';
import { dvtSubstraitExpression } from './canvasDvtSubstraitExpression';
import { buildDvtSubstraitScalarFunction } from './canvasDvtSubstraitScalarFunction';
export type DvtSubstraitOutputExpressionCandidate =
  | Readonly<{ kind: 'field-ref'; inputFieldId: string }>
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{
      kind: 'scalar-function';
      operandFieldIds: readonly [string, ...string[]];
      capabilityId: string;
    }>
  | Readonly<{ kind: 'row-number'; orderFieldId: string }>;

/** Capability labels for admitted scalar operands; do not alter their semantic types. */
export function derivedOutputDataType(type: Type): string | null {
  const kind = type.kind;
  if (kind.case === 'unbound') return 'unknown';
  if (
    kind.case !== 'string' &&
    kind.case !== 'i64' &&
    kind.case !== 'fp64' &&
    kind.case !== 'bool' &&
    kind.case !== 'precisionTimestampTz'
  )
    return null;
  if (
    kind.value.typeVariationReference !== 0 ||
    (kind.value.nullability !== Type_Nullability.NULLABLE &&
      kind.value.nullability !== Type_Nullability.REQUIRED)
  )
    return null;
  const labels = {
    string: 'string',
    i64: 'bigint',
    fp64: 'double precision',
    bool: 'boolean',
    precisionTimestampTz: 'timestamp with time zone',
  };
  return labels[kind.case];
}

export function rootFields<T extends Readonly<{ parentFieldId?: string; outputOrdinal: number }>>(
  fields: readonly T[]
): readonly T[] {
  return fields
    .filter((field) => field.parentFieldId == null)
    .sort((left, right) => left.outputOrdinal - right.outputOrdinal);
}

export function resolveOperandExpression(
  prepared: Awaited<ReturnType<typeof prepareSelectedRelationUnary>>,
  fieldId: string
): Expression | null {
  const inputs = rootFields(prepared.schema.bindings);
  const inputOrdinal = inputs.findIndex((field) => field.fieldId === fieldId);
  if (inputOrdinal >= 0) return dvtSubstraitExpression.field(inputOrdinal);
  if (prepared.request.intent !== 'edit' || prepared.target.relation.relType.case !== 'project')
    return null;
  const output = rootFields(prepared.target.fields).find((field) => field.fieldId === fieldId);
  if (output == null) return null;
  const project = prepared.target.relation.relType.value;
  const mapping = relationOutputMapping(
    prepared.target.relation,
    inputs.length + project.expressions.length
  )[output.outputOrdinal];
  if (mapping == null) return null;
  if (mapping < inputs.length) return dvtSubstraitExpression.field(mapping);
  const expression = project.expressions[mapping - inputs.length];
  return expression == null ? null : clone(ExpressionSchema, expression);
}

export function reject(message: string, relationId: string): never {
  throw new SubstraitAnalysisError('invalid_binding', message, relationId);
}

export function buildScalarChain(
  args: Readonly<{
    plan: Plan;
    capabilityIds: readonly [string, ...string[]];
    dataTypes: readonly string[];
    operands: readonly Expression[];
    provider: string;
  }>
): Expression | null {
  let dataTypes = args.dataTypes;
  let operands = args.operands;
  let expression: Expression | null = null;
  for (const capabilityId of args.capabilityIds) {
    expression = buildDvtSubstraitScalarFunction({
      plan: args.plan,
      capabilityId,
      dataTypes,
      operands,
      provider: args.provider,
    });
    if (expression?.rexType.case !== 'scalarFunction') return null;
    const outputType = expression.rexType.value.outputType;
    if (outputType == null) return null;
    const outputDataType = derivedOutputDataType(outputType);
    if (outputDataType == null) return null;
    dataTypes = [outputDataType];
    operands = [expression];
  }
  return expression;
}

export function referencedInputField(
  expression: Expression,
  fields: readonly Readonly<{ fieldId: string; parentFieldId?: string; outputOrdinal: number }>[]
): string | undefined {
  let operand = expression;
  while (
    operand.rexType.case === 'scalarFunction' &&
    operand.rexType.value.arguments.length === 1
  ) {
    const argument = operand.rexType.value.arguments[0]!.argType;
    if (argument.case !== 'value') return undefined;
    operand = argument.value;
  }
  const ordinal = dvtSubstraitExpression.fieldOrdinal(operand);
  return ordinal == null ? undefined : rootFields(fields)[ordinal]?.fieldId;
}
