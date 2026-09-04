/** Owned concern: construct the bounded PostgreSQL AST vocabulary used by Substrait projection. */
export type PostgresAstNode = Readonly<Record<string, unknown>>;

export function pgString(value: string): PostgresAstNode {
  return { String: { sval: value } };
}

export function pgColumnRef(columnName: string): PostgresAstNode {
  return { ColumnRef: { fields: [pgString(columnName)] } };
}

export function pgQualifiedColumnRef(relationAlias: string, columnName: string): PostgresAstNode {
  return { ColumnRef: { fields: [pgString(relationAlias), pgString(columnName)] } };
}

export function pgRangeVar(args: {
  schema?: string;
  table: string;
  alias?: string;
}): PostgresAstNode {
  return {
    RangeVar: {
      ...(args.schema == null ? {} : { schemaname: args.schema }),
      relname: args.table,
      inh: true,
      relpersistence: 'p',
      ...(args.alias == null ? {} : { alias: { aliasname: args.alias } }),
    },
  };
}

export function pgFunction(name: string, argument: PostgresAstNode): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString(name)],
      args: [argument],
      funcformat: 'COERCE_EXPLICIT_CALL',
    },
  };
}

export function pgCountRows(): PostgresAstNode {
  return { FuncCall: { funcname: [pgString('count')], agg_star: true } };
}

export function pgStringLiteral(value: string): PostgresAstNode {
  return { A_Const: { sval: { sval: value } } };
}

export function pgEquals(left: PostgresAstNode, right: PostgresAstNode): PostgresAstNode {
  return {
    A_Expr: {
      kind: 'AEXPR_OP',
      name: [pgString('=')],
      lexpr: left,
      rexpr: right,
      location: -1,
    },
  };
}

export function pgTimestampTzLiteral(value: string): PostgresAstNode {
  return {
    TypeCast: {
      arg: pgStringLiteral(value),
      typeName: { names: [pgString('timestamptz')], typemod: -1 },
    },
  };
}

export function pgOrderedRowNumber(orderFieldName: string): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString('row_number')],
      over: {
        orderClause: [
          {
            SortBy: {
              node: pgColumnRef(orderFieldName),
              sortby_dir: 'SORTBY_ASC',
              sortby_nulls: 'SORTBY_NULLS_LAST',
            },
          },
        ],
      },
    },
  };
}

export function pgRowNumber(partitionFieldName: string, orderFieldName: string): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString('row_number')],
      over: {
        partitionClause: [pgColumnRef(partitionFieldName)],
        orderClause: [
          {
            SortBy: {
              node: pgColumnRef(orderFieldName),
              sortby_dir: 'SORTBY_ASC',
              sortby_nulls: 'SORTBY_NULLS_LAST',
            },
          },
        ],
      },
    },
  };
}

export function pgRowNumberOverCount(groupExpression: PostgresAstNode): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString('row_number')],
      over: {
        orderClause: [
          {
            SortBy: {
              node: pgCountRows(),
              sortby_dir: 'SORTBY_DESC',
              sortby_nulls: 'SORTBY_NULLS_LAST',
            },
          },
          {
            SortBy: {
              node: groupExpression,
              sortby_dir: 'SORTBY_ASC',
              sortby_nulls: 'SORTBY_NULLS_LAST',
            },
          },
        ],
      },
    },
  };
}
