/** Draft conversion and operand defaults are independent of JSX and persistence. */
import type { DvtSubstraitJoinDataType } from '@dvt/postgres-projection';
import {
  isDvtSubstraitJoinNullCondition,
  isDvtSubstraitJoinNullOperator,
  type DvtSubstraitJoinPredicateOperator,
  type DvtSubstraitJoinConditionCombination,
  type DvtSubstraitJoinComparisonCondition,
} from '../canvasDvtSubstraitJoinCondition';
import {
  resolveDvtSubstraitJoinOperandDataType,
  type DvtSubstraitJoinPredicateOperand,
} from '../canvasDvtSubstraitJoinOperand';
import {
  buildSemanticWorkbenchJoinOperand,
  defaultSemanticWorkbenchJoinLiteralValue,
  type SemanticWorkbenchJoinFieldOption,
  type SemanticWorkbenchJoinOperandDraft,
} from './operandDraft';
import type { SemanticWorkbenchJoinConditionRow } from './conditionRows';

export type ConditionFieldOption = SemanticWorkbenchJoinFieldOption &
  Readonly<{ inputIndex: number }>;
export type ConditionDraft = Readonly<{
  conditionKey: string | null;
  dataType: DvtSubstraitJoinDataType;
  left: SemanticWorkbenchJoinOperandDraft;
  right: SemanticWorkbenchJoinOperandDraft;
  operator: DvtSubstraitJoinPredicateOperator;
  combination: DvtSubstraitJoinConditionCombination;
  combinationEditable: boolean;
  groupWithPrevious: boolean;
}>;
export type Comparison = DvtSubstraitJoinComparisonCondition<DvtSubstraitJoinPredicateOperand>;
export type ComparisonRow = Extract<SemanticWorkbenchJoinConditionRow, { kind: 'comparison' }>;

function defaultOperands(
  fields: readonly ConditionFieldOption[],
  dataType: DvtSubstraitJoinDataType
) {
  const compatible = fields.filter((field) => field.dataType === dataType);
  const left = compatible[0];
  if (left == null) return null;
  const right = compatible.find((field) => field.inputIndex !== left.inputIndex) ?? compatible[1];
  return {
    left: { kind: 'field' as const, fieldId: left.fieldId, rawValue: '', functionIds: [] },
    right: {
      kind: right == null ? ('literal' as const) : ('field' as const),
      fieldId: right?.fieldId ?? left.fieldId,
      rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
      functionIds: [],
    },
  };
}

export function newConditionDraft(fields: readonly ConditionFieldOption[]): ConditionDraft | null {
  const dataType = fields[0]?.dataType;
  const operands = dataType == null ? null : defaultOperands(fields, dataType);
  return operands == null || dataType == null
    ? null
    : {
        conditionKey: null,
        dataType,
        ...operands,
        operator: 'equal',
        combination: 'and',
        combinationEditable: true,
        groupWithPrevious: false,
      };
}

export function changeConditionDataType(
  fields: readonly ConditionFieldOption[],
  draft: ConditionDraft,
  dataType: DvtSubstraitJoinDataType
) {
  const operands = defaultOperands(fields, dataType);
  return operands == null ? draft : { ...draft, dataType, ...operands };
}

function operandDraft(
  operand: DvtSubstraitJoinPredicateOperand,
  fallback: string
): SemanticWorkbenchJoinOperandDraft {
  const functionIds: string[] = [];
  let base = operand;
  while (base.kind === 'function') {
    functionIds.unshift(base.capabilityId);
    base = base.input;
  }
  return base.kind === 'field'
    ? { kind: 'field', fieldId: base.sourceFieldId, rawValue: '', functionIds }
    : { kind: 'literal', fieldId: fallback, rawValue: String(base.literal.value), functionIds };
}

export function editConditionDraft(
  fields: readonly ConditionFieldOption[],
  row: ComparisonRow
): ConditionDraft | null {
  const typeFor = (field: { sourceFieldId: string }) =>
    fields.find((candidate) => candidate.fieldId === field.sourceFieldId)?.dataType ?? null;
  const dataType = resolveDvtSubstraitJoinOperandDataType(row.condition.left, typeFor);
  const unary = isDvtSubstraitJoinNullCondition(row.condition);
  const rightType = unary
    ? dataType
    : resolveDvtSubstraitJoinOperandDataType(row.condition.right, typeFor);
  const fallback = fields.find((field) => field.dataType === dataType);
  if (dataType == null || dataType !== rightType || fallback == null) return null;
  return {
    conditionKey: row.conditionKey,
    dataType,
    left: operandDraft(row.condition.left, fallback.fieldId),
    right: unary
      ? {
          kind: 'literal',
          fieldId: fallback.fieldId,
          rawValue: defaultSemanticWorkbenchJoinLiteralValue(dataType),
          functionIds: [],
        }
      : operandDraft(row.condition.right, fallback.fieldId),
    operator: row.condition.operator ?? 'equal',
    combination: row.condition.combination ?? 'and',
    combinationEditable: row.combinationEditable,
    groupWithPrevious: false,
  };
}

export function conditionFromDraft(draft: ConditionDraft | null): Comparison | null {
  if (draft == null) return null;
  const left = buildSemanticWorkbenchJoinOperand({ draft: draft.left, dataType: draft.dataType });
  if (left == null) return null;
  if (isDvtSubstraitJoinNullOperator(draft.operator))
    return { left, operator: draft.operator, combination: draft.combination };
  const right = buildSemanticWorkbenchJoinOperand({ draft: draft.right, dataType: draft.dataType });
  return right == null
    ? null
    : { left, right, operator: draft.operator, combination: draft.combination };
}
