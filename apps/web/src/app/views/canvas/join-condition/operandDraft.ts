import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';

import type { DvtSubstraitJoinPredicateOperand } from '../canvasDvtSubstraitJoinOperand';

export type SemanticWorkbenchJoinOperandDraft = Readonly<{
  kind: 'field' | 'literal';
  fieldId: string;
  rawValue: string;
  functionIds: readonly string[];
}>;

export type SemanticWorkbenchJoinFieldOption = Readonly<{
  fieldId: string;
  label: string;
  dataType: DvtSubstraitJoinDataType;
}>;

export function defaultSemanticWorkbenchJoinLiteralValue(
  dataType: DvtSubstraitJoinDataType
): string {
  return dataType === 'bool' ? 'true' : '';
}

function parseJoinLiteral(
  dataType: DvtSubstraitJoinDataType,
  rawValue: string
): DvtSubstraitJoinPredicateOperand | null {
  if (dataType === 'string') {
    return { kind: 'literal', literal: { dataType: 'string', value: rawValue } };
  }
  if (dataType === 'bool') {
    return rawValue === 'true' || rawValue === 'false'
      ? { kind: 'literal', literal: { dataType: 'bool', value: rawValue === 'true' } }
      : null;
  }
  if (dataType === 'i64') {
    return /^-?\d+$/.test(rawValue)
      ? { kind: 'literal', literal: { dataType: 'i64', value: BigInt(rawValue) } }
      : null;
  }
  if (dataType === 'fp64') {
    const value = Number(rawValue);
    return rawValue.trim().length > 0 && Number.isFinite(value)
      ? { kind: 'literal', literal: { dataType: 'fp64', value } }
      : null;
  }
  const milliseconds = Date.parse(rawValue);
  return Number.isFinite(milliseconds)
    ? {
        kind: 'literal',
        literal: {
          dataType: 'precisionTimestampTz',
          value: new Date(milliseconds).toISOString(),
        },
      }
    : null;
}

export function buildSemanticWorkbenchJoinOperand(args: {
  draft: SemanticWorkbenchJoinOperandDraft;
  dataType: DvtSubstraitJoinDataType;
}): DvtSubstraitJoinPredicateOperand | null {
  const base: DvtSubstraitJoinPredicateOperand | null =
    args.draft.kind === 'field'
      ? { kind: 'field', sourceFieldId: args.draft.fieldId }
      : parseJoinLiteral(args.dataType, args.draft.rawValue);
  return base == null
    ? null
    : args.draft.functionIds.reduce<DvtSubstraitJoinPredicateOperand>(
        (input, capabilityId) => ({ kind: 'function', capabilityId, input }),
        base
      );
}
