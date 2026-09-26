/** Project an explicit scalar-to-output JOIN refactoring without mutating authority. */
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1, DvtSemanticFieldNameV1Schema } from '@dvt/contracts';
import type { SelectedJoin } from './canvasSelectedJoin';
import {
  isDvtSubstraitJoinConditionGroup,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinPredicateCondition,
} from './canvasDvtSubstraitJoinCondition';
import {
  dvtSubstraitJoinOperandKey,
  type DvtSubstraitJoinPredicateOperand,
} from './canvasDvtSubstraitJoinOperand';

export type JoinNormalizationOccurrence = Readonly<{
  conditionPath: readonly number[];
  side: 'left' | 'right';
}>;

export type JoinNormalizationTransformation = Readonly<{
  transformationKey: string;
  inputRelationId: string;
  baseFieldId: string;
  capabilityIds: readonly [string, ...string[]];
  suggestedAlias: string | null;
  occurrences: readonly JoinNormalizationOccurrence[];
}>;

export type JoinNormalizationProposal = Readonly<{
  relationId: string;
  revision: number;
  transformations: readonly JoinNormalizationTransformation[];
}>;

export type JoinNormalizationProjection =
  | Readonly<{ outcome: 'available'; proposal: JoinNormalizationProposal }>
  | Readonly<{
      outcome: 'unavailable';
      reason:
        | 'no_functions'
        | 'uninspectable_predicate'
        | 'non_field_operand'
        | 'unknown_field'
        | 'unsupported_function';
    }>;

type OperandProjection = Omit<JoinNormalizationTransformation, 'occurrences'>;

function capabilityName(capabilityId: string): string | null {
  const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
    (candidate) => candidate.entryId === capabilityId
  );
  return entry?.kind === 'standard' &&
    entry.category === 'scalar-function' &&
    entry.profileStatus === 'supported-profile' &&
    entry.identity.sourceKind === 'simple-extension'
    ? entry.identity.name
    : null;
}

const operandKey = (operand: DvtSubstraitJoinPredicateOperand): string =>
  dvtSubstraitJoinOperandKey(operand, (field) => field.sourceFieldId);

function aliasFor(baseName: string | undefined, functions: readonly string[]): string | null {
  const value = [baseName, ...functions]
    .filter((part): part is string => part != null)
    .join('_')
    .normalize('NFKD')
    .replaceAll(/[^A-Za-z0-9_]/g, '_')
    .replaceAll(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return DvtSemanticFieldNameV1Schema.safeParse(value).success ? value : null;
}

function projectOperand(
  selected: SelectedJoin,
  operand: DvtSubstraitJoinPredicateOperand
): OperandProjection | null | JoinNormalizationProjection {
  if (operand.kind !== 'function') return null;
  const outerCapabilities: string[] = [];
  let terminal: DvtSubstraitJoinPredicateOperand = operand;
  while (terminal.kind === 'function') {
    outerCapabilities.push(terminal.capabilityId);
    terminal = terminal.input;
  }
  if (terminal.kind !== 'field') return { outcome: 'unavailable', reason: 'non_field_operand' };
  const field = selected.fields.find((candidate) => candidate.fieldId === terminal.sourceFieldId);
  const input = field == null ? null : selected.inputs[field.inputIndex];
  if (field == null || input == null) return { outcome: 'unavailable', reason: 'unknown_field' };
  const capabilityIds = outerCapabilities.reverse() as [string, ...string[]];
  const functionNames = capabilityIds.map(capabilityName);
  if (functionNames.some((name) => name == null))
    return { outcome: 'unavailable', reason: 'unsupported_function' };
  const binding = input.bindings.find((candidate) => candidate.fieldId === field.fieldId);
  return {
    transformationKey: `${input.relationId}:${operandKey(operand)}`,
    inputRelationId: input.relationId,
    baseFieldId: field.fieldId,
    capabilityIds,
    suggestedAlias: aliasFor(
      binding?.displayName,
      functionNames.filter((name): name is string => name != null)
    ),
  };
}

export function projectJoinNormalization(selected: SelectedJoin): JoinNormalizationProjection {
  if (selected.conditions == null)
    return { outcome: 'unavailable', reason: 'uninspectable_predicate' };
  const transformations = new Map<string, JoinNormalizationTransformation>();
  let rejection: JoinNormalizationProjection | null = null;
  const visitOperand = (
    operand: DvtSubstraitJoinPredicateOperand,
    conditionPath: readonly number[],
    side: 'left' | 'right'
  ) => {
    const projected = projectOperand(selected, operand);
    if (projected == null) return;
    if ('outcome' in projected) {
      rejection = projected;
      return;
    }
    const occurrence = { conditionPath, side } as const;
    const existing = transformations.get(projected.transformationKey);
    transformations.set(
      projected.transformationKey,
      existing == null
        ? { ...projected, occurrences: [occurrence] }
        : { ...existing, occurrences: [...existing.occurrences, occurrence] }
    );
  };
  const visit = (condition: DvtSubstraitJoinPredicateCondition, path: readonly number[]) => {
    if (isDvtSubstraitJoinConditionGroup(condition)) {
      condition.conditions.forEach((child, index) => visit(child, [...path, index]));
      return;
    }
    visitOperand(condition.left, path, 'left');
    if (!isDvtSubstraitJoinNullCondition(condition)) visitOperand(condition.right, path, 'right');
  };
  selected.conditions.forEach((condition, index) => visit(condition, [index]));
  if (rejection != null) return rejection;
  if (transformations.size === 0) return { outcome: 'unavailable', reason: 'no_functions' };
  return {
    outcome: 'available',
    proposal: {
      relationId: selected.relationId,
      revision: selected.revision,
      transformations: [...transformations.values()],
    },
  };
}
