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

export function pgCoalesce(arguments_: readonly PostgresAstNode[]): PostgresAstNode {
  if (arguments_.length < 2) {
    throw new Error('PostgreSQL COALESCE requires at least two expressions.');
  }
  return {
    FuncCall: {
      funcname: [pgString('coalesce')],
      args: [...arguments_],
      funcformat: 'COERCE_EXPLICIT_CALL',
    },
  };
}

export function pgConcatAcceptNulls(
  left: PostgresAstNode,
  right: PostgresAstNode
): PostgresAstNode {
  return {
    A_Expr: {
      kind: 'AEXPR_OP',
      name: [pgString('||')],
      lexpr: left,
      rexpr: right,
      location: -1,
    },
  };
}

export function pgCountRows(): PostgresAstNode {
  return { FuncCall: { funcname: [pgString('count')], agg_star: true } };
}

export function pgStringLiteral(value: string): PostgresAstNode {
  return { A_Const: { sval: { sval: value } } };
}

export function pgBooleanLiteral(value: boolean): PostgresAstNode {
  return { A_Const: { boolval: { boolval: value } } };
}

export function pgI64Literal(value: bigint): PostgresAstNode {
  return { A_Const: { ival: { ival: value } } };
}

export function pgFp64Literal(value: number): PostgresAstNode {
  return { A_Const: { fval: { fval: String(value) } } };
}

export type PostgresComparisonOperator = '=' | '<>' | '>' | '>=' | '<' | '<=';

export function pgComparison(
  operator: PostgresComparisonOperator,
  left: PostgresAstNode,
  right: PostgresAstNode
): PostgresAstNode {
  return {
    A_Expr: {
      kind: 'AEXPR_OP',
      name: [pgString(operator)],
      lexpr: left,
      rexpr: right,
      location: -1,
    },
  };
}

export function pgEquals(left: PostgresAstNode, right: PostgresAstNode): PostgresAstNode {
  return pgComparison('=', left, right);
}

export function pgAnd(expressions: readonly PostgresAstNode[]): PostgresAstNode {
  if (expressions.length < 2) throw new Error('PostgreSQL AND requires at least two expressions.');
  return { BoolExpr: { boolop: 'AND_EXPR', args: [...expressions], location: -1 } };
}

export function pgOr(expressions: readonly PostgresAstNode[]): PostgresAstNode {
  if (expressions.length < 2) throw new Error('PostgreSQL OR requires at least two expressions.');
  return { BoolExpr: { boolop: 'OR_EXPR', args: [...expressions], location: -1 } };
}

export function pgTimestampTzLiteral(value: string): PostgresAstNode {
  return {
    TypeCast: {
      arg: pgStringLiteral(value),
      typeName: { names: [pgString('timestamptz')], typemod: -1 },
    },
  };
}

export function pgExtractYearUtc(argument: PostgresAstNode): PostgresAstNode {
  return {
    TypeCast: {
      arg: {
        FuncCall: {
          funcname: [pgString('date_part')],
          args: [
            pgStringLiteral('year'),
            {
              FuncCall: {
                funcname: [pgString('timezone')],
                args: [pgStringLiteral('UTC'), argument],
                funcformat: 'COERCE_EXPLICIT_CALL',
              },
            },
          ],
          funcformat: 'COERCE_EXPLICIT_CALL',
        },
      },
      typeName: { names: [pgString('bigint')], typemod: -1 },
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
