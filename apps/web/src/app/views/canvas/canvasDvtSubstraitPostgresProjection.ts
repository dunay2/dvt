/** Owned concern: project only the admitted pilot and two-source INNER JOIN shapes to PostgreSQL. */
import { deparse } from 'pgsql-deparser';

import {
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
  type DvtSubstraitPilotProjection,
} from './canvasDvtSubstraitPilot';
import {
  inspectDvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinDraft,
  type DvtSubstraitInnerJoinProjection,
} from './canvasDvtSubstraitJoinComposition';

export type DvtSubstraitPostgresProjectionErrorCode =
  'unsupported_shape' | 'invalid_source_binding' | 'deparse_failed';

export type DvtSubstraitPostgresSourceBinding = Readonly<{
  schema: string;
  table: string;
}>;

export class DvtSubstraitPostgresProjectionError extends Error {
  constructor(
    public readonly code: DvtSubstraitPostgresProjectionErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DvtSubstraitPostgresProjectionError';
  }
}

type PostgresAstNode = Readonly<Record<string, unknown>>;

function pgString(value: string): PostgresAstNode {
  return { String: { sval: value } };
}

function pgColumnRef(columnName: string): PostgresAstNode {
  return {
    ColumnRef: {
      fields: [pgString(columnName)],
    },
  };
}

function pgQualifiedColumnRef(relationAlias: string, columnName: string): PostgresAstNode {
  return {
    ColumnRef: {
      fields: [pgString(relationAlias), pgString(columnName)],
    },
  };
}

function pgRangeVar(args: { schema: string; table: string; alias?: string }): PostgresAstNode {
  return {
    RangeVar: {
      schemaname: args.schema,
      relname: args.table,
      inh: true,
      relpersistence: 'p',
      ...(args.alias == null ? {} : { alias: { aliasname: args.alias } }),
    },
  };
}

function pgFunction(name: 'trim' | 'upper', argument: PostgresAstNode): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString(name)],
      args: [argument],
      funcformat: 'COERCE_EXPLICIT_CALL',
    },
  };
}

function requireFinalPilotProjection(draft: DvtSubstraitPilotDraft): DvtSubstraitPilotProjection {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok || inspection.projection.operations.join(',') !== 'trim,upper') {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the completed VTX2 #2598 pilot recipe.'
    );
  }
  return inspection.projection;
}

function requirePhysicalSourceBinding(
  sourceBinding: DvtSubstraitPostgresSourceBinding
): DvtSubstraitPostgresSourceBinding {
  const schema = sourceBinding.schema.trim();
  const table = sourceBinding.table.trim();
  if (!schema || !table) {
    throw new DvtSubstraitPostgresProjectionError(
      'invalid_source_binding',
      'PostgreSQL projection requires one complete physical source binding.'
    );
  }
  return { schema, table };
}

function buildPilotPostgresAst(
  projection: DvtSubstraitPilotProjection,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  const transformedInput = pgFunction(
    'upper',
    pgFunction('trim', pgColumnRef(projection.inputFieldName))
  );
  const targetList: PostgresAstNode[] = [
    {
      ResTarget: {
        name: projection.outputName,
        val: transformedInput,
      },
    },
    ...projection.outputs.slice(1).map((output) => ({
      ResTarget: {
        val: pgColumnRef(output.name),
      },
    })),
  ];

  return {
    SelectStmt: {
      targetList,
      fromClause: [
        {
          RangeVar: {
            ...(physicalSource == null ? {} : { schemaname: physicalSource.schema }),
            relname: physicalSource?.table ?? projection.sourceName,
            inh: true,
            relpersistence: 'p',
          },
        },
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

function requireInnerJoinProjection(
  draft: DvtSubstraitInnerJoinDraft
): DvtSubstraitInnerJoinProjection {
  const inspection = inspectDvtSubstraitInnerJoinDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted VTX2 two-source INNER JOIN.'
    );
  }
  return inspection.projection;
}

function buildInnerJoinPostgresAst(projection: DvtSubstraitInnerJoinProjection): PostgresAstNode {
  const leftAlias = 'left_source';
  const rightAlias = 'right_source';
  const [customerId, name, orderId] = projection.outputs;
  if (customerId == null || name == null || orderId == null) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL INNER JOIN projection requires the exact three admitted outputs.'
    );
  }

  return {
    SelectStmt: {
      targetList: [
        {
          ResTarget: {
            name: customerId.name,
            val: pgQualifiedColumnRef(leftAlias, customerId.name),
          },
        },
        {
          ResTarget: {
            name: name.name,
            val: pgQualifiedColumnRef(leftAlias, name.name),
          },
        },
        {
          ResTarget: {
            name: orderId.name,
            val: pgQualifiedColumnRef(rightAlias, orderId.name),
          },
        },
      ],
      fromClause: [
        {
          JoinExpr: {
            jointype: 'JOIN_INNER',
            larg: pgRangeVar({
              schema: projection.left.schema,
              table: projection.left.table,
              alias: leftAlias,
            }),
            rarg: pgRangeVar({
              schema: projection.right.schema,
              table: projection.right.table,
              alias: rightAlias,
            }),
            quals: {
              A_Expr: {
                kind: 'AEXPR_OP',
                name: [pgString('=')],
                lexpr: pgQualifiedColumnRef(leftAlias, projection.leftKey),
                rexpr: pgQualifiedColumnRef(rightAlias, projection.rightKey),
              },
            },
          },
        },
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

async function deparseBoundedPostgresAst(postgresAst: PostgresAstNode): Promise<string> {
  try {
    return await deparse(postgresAst as Parameters<typeof deparse>[0]);
  } catch (error) {
    throw new DvtSubstraitPostgresProjectionError(
      'deparse_failed',
      'The bounded PostgreSQL AST could not be rendered.',
      { cause: error }
    );
  }
}

/**
 * Render the single accepted Substrait pilot fixture. Every broader Substrait
 * shape fails closed until a second real use case earns a larger projection.
 */
export async function projectDvtSubstraitPilotToPostgresSql(
  draft: DvtSubstraitPilotDraft,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): Promise<string> {
  const projection = requireFinalPilotProjection(draft);
  const postgresAst = buildPilotPostgresAst(projection, sourceBinding);
  return deparseBoundedPostgresAst(postgresAst);
}

export async function projectDvtSubstraitInnerJoinToPostgresSql(
  draft: DvtSubstraitInnerJoinDraft
): Promise<string> {
  return deparseBoundedPostgresAst(buildInnerJoinPostgresAst(requireInnerJoinProjection(draft)));
}
