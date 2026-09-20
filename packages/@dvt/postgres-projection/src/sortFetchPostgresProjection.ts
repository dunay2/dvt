/** Owns PostgreSQL AST wrappers for the admitted Substrait SortRel and FetchRel profile. */
import { SortField_SortDirection } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import { pgColumnRef, pgRangeSubselect, type PostgresAstNode } from './postgresAst.js';
import { pgI64Literal } from './postgresPredicateAst.js';
import type {
  DvtSubstraitSortDirection,
  DvtSubstraitSortFetchRootInspection,
} from './substraitSortFetch.js';

export type DvtPostgresOrderKey = Readonly<{
  name: string;
  direction: 'ASC' | 'DESC';
  nulls: 'FIRST' | 'LAST';
}>;

type AdmittedInspection = Extract<DvtSubstraitSortFetchRootInspection, { ok: true }>;

export function postgresSortDirection(
  direction: DvtSubstraitSortDirection
): Omit<DvtPostgresOrderKey, 'name'> {
  switch (direction) {
    case SortField_SortDirection.ASC_NULLS_FIRST:
      return { direction: 'ASC', nulls: 'FIRST' };
    case SortField_SortDirection.ASC_NULLS_LAST:
      return { direction: 'ASC', nulls: 'LAST' };
    case SortField_SortDirection.DESC_NULLS_FIRST:
      return { direction: 'DESC', nulls: 'FIRST' };
    case SortField_SortDirection.DESC_NULLS_LAST:
      return { direction: 'DESC', nulls: 'LAST' };
  }
  throw new DvtSubstraitPostgresProjectionError(
    'unsupported_shape',
    'PostgreSQL Sort projection received a direction outside the admitted profile.'
  );
}

function selectColumns(columns: readonly Readonly<{ name: string }>[]): readonly PostgresAstNode[] {
  return columns.map((column) => ({ ResTarget: { val: pgColumnRef(column.name) } }));
}

export function buildDvtSortFetchPostgresAst(
  args: Readonly<{
    inputAst: PostgresAstNode;
    inputColumns: readonly Readonly<{ fieldId: string; name: string }>[];
    operation: AdmittedInspection;
    inheritedOrderBy?: readonly DvtPostgresOrderKey[] | null;
  }>
): Readonly<{ ast: PostgresAstNode; orderBy: readonly DvtPostgresOrderKey[] | null }> {
  if (args.inputColumns.length === 0) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'Sort/Fetch PostgreSQL projection requires at least one input column.'
    );
  }
  if (args.operation.operation === 'sort') {
    const columnByFieldId = new Map(args.inputColumns.map((column) => [column.fieldId, column]));
    const orderBy = args.operation.keys.map((key) => {
      const column = columnByFieldId.get(key.fieldId);
      if (column == null) {
        throw new DvtSubstraitPostgresProjectionError(
          'unsupported_shape',
          'Sort key FieldId is outside the projected input relation.'
        );
      }
      return { name: column.name, ...postgresSortDirection(key.direction) };
    });
    return {
      ast: {
        SelectStmt: {
          targetList: selectColumns(args.inputColumns),
          fromClause: [pgRangeSubselect(args.inputAst, 'sort_input')],
          sortClause: orderBy.map((key) => ({
            SortBy: {
              node: pgColumnRef(key.name),
              sortby_dir: key.direction === 'ASC' ? 'SORTBY_ASC' : 'SORTBY_DESC',
              sortby_nulls: key.nulls === 'FIRST' ? 'SORTBY_NULLS_FIRST' : 'SORTBY_NULLS_LAST',
            },
          })),
          limitOption: 'LIMIT_OPTION_DEFAULT',
          op: 'SETOP_NONE',
        },
      },
      orderBy,
    };
  }
  return {
    ast: {
      SelectStmt: {
        targetList: selectColumns(args.inputColumns),
        fromClause: [pgRangeSubselect(args.inputAst, 'fetch_input')],
        ...(args.inheritedOrderBy == null || args.inheritedOrderBy.length === 0
          ? {}
          : {
              sortClause: args.inheritedOrderBy.map((key) => ({
                SortBy: {
                  node: pgColumnRef(key.name),
                  sortby_dir: key.direction === 'ASC' ? 'SORTBY_ASC' : 'SORTBY_DESC',
                  sortby_nulls: key.nulls === 'FIRST' ? 'SORTBY_NULLS_FIRST' : 'SORTBY_NULLS_LAST',
                },
              })),
            }),
        ...(args.operation.offset == null
          ? {}
          : { limitOffset: pgI64Literal(args.operation.offset) }),
        ...(args.operation.count == null ? {} : { limitCount: pgI64Literal(args.operation.count) }),
        limitOption: 'LIMIT_OPTION_COUNT',
        op: 'SETOP_NONE',
      },
    },
    orderBy: args.inheritedOrderBy ?? null,
  };
}
