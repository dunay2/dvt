/** Project unary controls from typed Substrait input facts, never from a SQL profile reader. */
import type { Expression } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 } from '@dvt/contracts';
import type { DvtSubstraitSortDirection } from '@dvt/postgres-projection';
import type { SelectedRelationInput } from './useSelectedRelationInput';
import type { CanvasRelationalOperatorTool } from './canvasRelationalTreeOperatorModel';
import { dvtSubstraitTextComparison } from './canvasDvtSubstraitTextComparison';
import { resolveDvtSubstraitFilterCapabilities } from './canvasFilterCapabilities';
import { readDvtSubstraitFieldReferenceOrdinal } from './canvasDvtSubstraitAggregation';
import { selectedSortDirections } from './canvasSelectedRelationSortFetch';

function inputFields(input: SelectedRelationInput) {
  return input.schema.bindings
    .filter((field) => field.parentFieldId == null)
    .map((field) => ({
      fieldId: field.fieldId,
      name: field.displayName ?? field.fieldId,
      dataType: input.schema.fields[field.outputOrdinal]?.type.kind.case,
      ordinal: field.outputOrdinal,
    }));
}

function filterTool(input: SelectedRelationInput): CanvasRelationalOperatorTool {
  const fields = inputFields(input).filter((field) => field.dataType === 'string');
  const filter = input.target.relation.relType;
  const predicate =
    input.intent === 'edit' && filter.case === 'filter'
      ? dvtSubstraitTextComparison.inspect(input.target.plan, filter.value.condition)
      : null;
  const comparisons = resolveDvtSubstraitFilterCapabilities({ dataType: 'string' });
  return {
    id: 'filter',
    active: input.intent === 'edit',
    fields,
    comparisons,
    enabled:
      fields.length > 0 &&
      comparisons.length > 0 &&
      (input.intent === 'insert' || predicate != null),
    fieldId: fields.find((field) => field.ordinal === predicate?.sourceOrdinal)?.fieldId,
    capabilityId: predicate?.capabilityId,
    value: predicate?.value,
  };
}

function sortTool(input: SelectedRelationInput): CanvasRelationalOperatorTool {
  const fields = inputFields(input);
  const sort = input.target.relation.relType;
  const keys =
    input.intent === 'edit' && sort.case === 'sort'
      ? sort.value.sorts.map((key) => {
          const field = fields.find(
            (item) => item.ordinal === readDvtSubstraitFieldReferenceOrdinal(key.expr)
          );
          return field == null ||
            key.sortKind.case !== 'direction' ||
            !selectedSortDirections.has(key.sortKind.value)
            ? null
            : {
                fieldId: field.fieldId,
                direction: key.sortKind.value as DvtSubstraitSortDirection,
              };
        })
      : [];
  return {
    id: 'sort',
    active: input.intent === 'edit',
    fields,
    enabled:
      fields.length > 0 &&
      (input.intent === 'insert' || (keys.length > 0 && keys.every((key) => key != null))),
    sortKeys: keys.filter((key) => key != null),
  };
}

function fetchValue(expression: Expression | undefined): bigint | null | undefined {
  if (expression == null) return null;
  const literal = expression.rexType;
  if (literal.case !== 'literal') return undefined;
  if (
    literal.value.literalType.case === 'null' &&
    literal.value.literalType.value.kind.case === 'i64'
  )
    return null;
  return literal.value.literalType.case === 'i64' && literal.value.literalType.value >= 0n
    ? literal.value.literalType.value
    : undefined;
}

function fetchTool(input: SelectedRelationInput): CanvasRelationalOperatorTool {
  const fetch = input.target.relation.relType;
  const offset =
    input.intent === 'edit' && fetch.case === 'fetch' ? fetchValue(fetch.value.offsetExpr) : null;
  const count =
    input.intent === 'edit' && fetch.case === 'fetch' ? fetchValue(fetch.value.countExpr) : null;
  return {
    id: 'fetch',
    active: input.intent === 'edit',
    fields: inputFields(input),
    enabled: offset !== undefined && count !== undefined,
    offset,
    count,
  };
}

export const selectedUnaryTools = { filter: filterTool, sort: sortTool, fetch: fetchTool };

export function projectSelectedRelationTool(
  input: SelectedRelationInput | null,
  operation: keyof typeof selectedUnaryTools
): CanvasRelationalOperatorTool | null {
  if (
    input == null ||
    (input.intent === 'edit' && input.target.relation.relType.case !== operation)
  )
    return null;
  const tool = selectedUnaryTools[operation](input);
  const message = { filter: 'FilterRel', sort: 'SortRel', fetch: 'FetchRel' }[operation];
  const admitted = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.some(
    (entry) =>
      entry.profileStatus === 'supported-profile' && entry.entryId.endsWith(`/substrait.${message}`)
  );
  return { ...tool, enabled: tool.enabled && admitted };
}
