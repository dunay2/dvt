/** Owns shared JOIN operand inspection and mapping; no Canvas or runtime dependency. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';

import {
  resolveDvtSubstraitColumnFunctions,
  type DvtSubstraitColumnFunction,
} from './substraitColumnFunctionCatalog.js';
import {
  dvtSubstraitExpressionReader as dvtSubstraitExpression,
  type DvtSubstraitLiteralValue,
} from './substraitExpressionReader.js';

export type JoinFieldOperand = Readonly<{ kind: 'field' }>;

export type DvtSubstraitJoinOperand<Field extends JoinFieldOperand> =
  | Field
  | Readonly<{ kind: 'literal'; literal: DvtSubstraitLiteralValue }>
  | Readonly<{
      kind: 'function';
      capabilityId: string;
      input: DvtSubstraitJoinOperand<Field>;
    }>;

export type DvtSubstraitInspectedJoinOperand = DvtSubstraitJoinOperand<
  Readonly<{ kind: 'field'; ordinal: number }>
>;

export type DvtSubstraitJoinUnaryFunction = DvtSubstraitColumnFunction &
  Readonly<{ inputDataType: 'string'; outputDataType: 'string' }>;

export function resolveDvtSubstraitJoinUnaryFunctions(args: {
  dataType: string;
  provider: string;
}): readonly DvtSubstraitJoinUnaryFunction[] {
  return resolveDvtSubstraitColumnFunctions(args).flatMap((capability) =>
    capability.category === 'text' &&
    capability.minimumArgumentCount === 1 &&
    capability.maximumArgumentCount === 1
      ? [{ ...capability, inputDataType: 'string' as const, outputDataType: 'string' as const }]
      : []
  );
}

export function resolveDvtSubstraitJoinUnaryFunction(args: {
  capabilityId: string;
  inputDataType: string;
}): DvtSubstraitJoinUnaryFunction | null {
  return (
    resolveDvtSubstraitJoinUnaryFunctions({
      dataType: args.inputDataType,
      provider: 'postgres',
    }).find((capability) => capability.capabilityId === args.capabilityId) ?? null
  );
}

export function functionIdentity(
  capability: DvtSubstraitJoinUnaryFunction
): Readonly<{ urn: string; name: string }> | null {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === capability.capabilityId
  );
  if (
    entry?.kind !== 'standard' ||
    entry.category !== 'scalar-function' ||
    entry.identity.sourceKind !== 'simple-extension'
  ) {
    return null;
  }
  return {
    urn: entry.identity.urn,
    name: entry.invocation?.signature ?? `${entry.identity.name}:str`,
  } as const;
}

export function mapDvtSubstraitJoinOperandFields<
  SourceField extends JoinFieldOperand,
  TargetField extends JoinFieldOperand,
>(
  operand: DvtSubstraitJoinOperand<SourceField>,
  mapField: (field: SourceField) => TargetField | null
): DvtSubstraitJoinOperand<TargetField> | null {
  if (operand.kind === 'field') return mapField(operand as SourceField);
  if (operand.kind === 'literal') return operand;
  const input = mapDvtSubstraitJoinOperandFields(operand.input, mapField);
  return input == null ? null : { ...operand, input };
}

export function resolveDvtSubstraitJoinOperandDataType<Field extends JoinFieldOperand>(
  operand: DvtSubstraitJoinOperand<Field>,
  fieldDataType: (field: Field) => DvtSubstraitLiteralValue['dataType'] | null
): DvtSubstraitLiteralValue['dataType'] | null {
  if (operand.kind === 'field') return fieldDataType(operand as Field);
  if (operand.kind === 'literal') return operand.literal.dataType;
  const inputDataType = resolveDvtSubstraitJoinOperandDataType(operand.input, fieldDataType);
  if (inputDataType == null) return null;
  return (
    resolveDvtSubstraitJoinUnaryFunction({
      capabilityId: operand.capabilityId,
      inputDataType,
    })?.outputDataType ?? null
  );
}

export function inspectDvtSubstraitJoinOperandExpression(
  plan: Plan,
  expression: Expression
): DvtSubstraitInspectedJoinOperand | null {
  const ordinal = dvtSubstraitExpression.fieldOrdinal(expression);
  if (ordinal != null) return { kind: 'field', ordinal };
  const literal = dvtSubstraitExpression.literalValue(expression);
  if (literal != null) return { kind: 'literal', literal };
  for (const capability of resolveDvtSubstraitJoinUnaryFunctions({
    dataType: 'string',
    provider: 'postgres',
  })) {
    const identity = functionIdentity(capability);
    if (identity == null) continue;
    const scalar = dvtSubstraitExpression.inspectScalarFunction(plan, expression, identity);
    if (
      scalar?.arguments.length !== 1 ||
      scalar.outputType?.kind.case !== capability.outputDataType
    ) {
      continue;
    }
    const input = inspectDvtSubstraitJoinOperandExpression(plan, scalar.arguments[0]!);
    if (input != null) return { kind: 'function', capabilityId: capability.capabilityId, input };
  }
  return null;
}

export type DvtSubstraitJoinPredicateOperand = DvtSubstraitJoinOperand<
  Readonly<{ kind: 'field'; sourceFieldId: string }>
>;
