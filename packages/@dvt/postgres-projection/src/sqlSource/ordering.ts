/** Preserve SQL output-name precedence, hidden sort fields and exact Fetch bounds. */
import {
  ExpressionSchema,
  RelSchema,
  SortField_SortDirection,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';

import {
  appendSourceRelation,
  consumeSourceOrdinal,
  nextSourceRelation,
  sourceError,
  sourceNameScope,
  sourceOutputFields,
  sqlList,
  sqlObject,
  type SqlCompilationState,
  type SqlScope,
} from './context.js';
import { resolveSourceOrdinal, sourceFieldExpression, sqlColumnParts } from './references.js';
import type { SqlTargetSelection } from './selection.js';

function exactFetchBound(value: unknown): bigint | null {
  if (value == null) return null;
  const node = sqlObject(sqlObject(value)['A_Const']);
  if (node['isnull'] === true) return null;
  // A present Integer node with no scalar property denotes native protobuf zero.
  const integer = node['ival'] == null ? undefined : (sqlObject(node['ival'])['ival'] ?? 0);
  const decimal = node['fval'] == null ? undefined : sqlObject(node['fval'])['fval'];
  const text =
    typeof integer === 'number' && Number.isSafeInteger(integer) ? String(integer) : decimal;
  if (typeof text !== 'string' || !/^\d+$/u.test(text))
    return sourceError(
      'unsupported_sql',
      'Fetch bounds require nonnegative integer constants.',
      node
    );
  const bound = BigInt(text);
  if (bound > 9_223_372_036_854_775_807n)
    return sourceError('unsupported_sql', 'Fetch bound exceeds signed i64.', node);
  return bound;
}
export function orderSqlSource(
  state: SqlCompilationState,
  scope: SqlScope,
  selected: readonly SqlTargetSelection[],
  clause: unknown
): SqlScope {
  const syntax = sqlList(clause);
  if (syntax.length === 0) return scope;
  const names = sourceNameScope(state, scope);
  const sorts = syntax.map((item) => {
    const sort = sqlObject(sqlObject(item)['SortBy']);
    if (
      sqlList(sort['useOp']).length > 0 ||
      ![undefined, 'SORTBY_DEFAULT', 'SORTBY_ASC', 'SORTBY_DESC'].includes(
        sort['sortby_dir'] as string | undefined
      ) ||
      ![undefined, 'SORTBY_NULLS_DEFAULT', 'SORTBY_NULLS_FIRST', 'SORTBY_NULLS_LAST'].includes(
        sort['sortby_nulls'] as string | undefined
      )
    )
      return sourceError('unsupported_sql', 'Custom sorting is outside the source profile.', sort);
    const node = sqlObject(sort['node']);
    let ordinal: number;
    if (node['A_Const'] != null) {
      const position = exactFetchBound(node);
      if (position == null || position < 1n || position > BigInt(selected.length))
        return sourceError('unknown_column', 'ORDER BY position is outside the output.', sort);
      ordinal = selected[Number(position - 1n)]!.ordinal;
    } else {
      const parts = sqlColumnParts(node);
      const output =
        parts.length === 1 ? selected.find((field) => field.name === parts[0]) : undefined;
      ordinal = output?.ordinal ?? resolveSourceOrdinal(state, names, node);
    }
    consumeSourceOrdinal(state, names, ordinal);
    const descending = sort['sortby_dir'] === 'SORTBY_DESC';
    const nullsFirst =
      sort['sortby_nulls'] === 'SORTBY_NULLS_FIRST' ||
      (sort['sortby_nulls'] !== 'SORTBY_NULLS_LAST' && descending);
    const direction = descending
      ? nullsFirst
        ? SortField_SortDirection.DESC_NULLS_FIRST
        : SortField_SortDirection.DESC_NULLS_LAST
      : nullsFirst
        ? SortField_SortDirection.ASC_NULLS_FIRST
        : SortField_SortDirection.ASC_NULLS_LAST;
    return {
      expr: sourceFieldExpression(ordinal),
      sortKind: { case: 'direction' as const, value: direction },
    };
  });
  const binding = nextSourceRelation(state);
  return {
    bindings: scope.bindings,
    entry: appendSourceRelation(state, {
      relation: create(RelSchema, {
        relType: {
          case: 'sort',
          value: { common: { relAnchor: binding.relAnchor }, input: scope.entry.relation, sorts },
        },
      }),
      binding,
      inputs: [scope.entry.binding.relationId],
      fields: sourceOutputFields(
        binding.relationId,
        scope.entry.fields.map((field) => field.displayName!),
        scope.entry.fields.map((field) => field.fieldId)
      ),
    }),
  };
}
export function fetchSqlSource(
  state: SqlCompilationState,
  scope: SqlScope,
  offsetValue: unknown,
  countValue: unknown
): SqlScope {
  const offset = exactFetchBound(offsetValue);
  const count = exactFetchBound(countValue);
  if (offset == null && count == null) return scope;
  const literal = (value: bigint): Expression =>
    create(ExpressionSchema, {
      rexType: { case: 'literal', value: { literalType: { case: 'i64', value } } },
    });
  const binding = nextSourceRelation(state);
  return {
    bindings: scope.bindings,
    entry: appendSourceRelation(state, {
      relation: create(RelSchema, {
        relType: {
          case: 'fetch',
          value: {
            common: { relAnchor: binding.relAnchor },
            input: scope.entry.relation,
            ...(offset == null ? {} : { offsetExpr: literal(offset) }),
            ...(count == null ? {} : { countExpr: literal(count) }),
          },
        },
      }),
      binding,
      inputs: [scope.entry.binding.relationId],
      fields: sourceOutputFields(
        binding.relationId,
        scope.entry.fields.map((field) => field.displayName!),
        scope.entry.fields.map((field) => field.fieldId)
      ),
    }),
  };
}
