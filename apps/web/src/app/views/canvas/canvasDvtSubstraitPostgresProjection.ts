/** Owned concern: project only the #2598 typed Substrait pilot shape to PostgreSQL SQL. */
import { deparse } from 'pgsql-deparser';

import {
  inspectDvtSubstraitPilotDraft,
  type DvtSubstraitPilotDraft,
  type DvtSubstraitPilotProjection,
} from './canvasDvtSubstraitPilot';

export type DvtSubstraitPostgresProjectionErrorCode = 'unsupported_shape' | 'deparse_failed';

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

function pgFunction(name: 'trim' | 'upper', argument: PostgresAstNode): PostgresAstNode {
  return {
    FuncCall: {
      funcname: [pgString(name)],
      args: [argument],
      funcformat: 'COERCE_EXPLICIT_CALL',
    },
  };
}

function requireFinalPilotProjection(
  draft: DvtSubstraitPilotDraft
): DvtSubstraitPilotProjection {
  const inspection = inspectDvtSubstraitPilotDraft(draft);
  if (!inspection.ok || inspection.projection.operations.join(',') !== 'trim,upper') {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the completed VTX2 #2598 pilot recipe.'
    );
  }
  return inspection.projection;
}

function buildPilotPostgresAst(projection: DvtSubstraitPilotProjection): PostgresAstNode {
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
            relname: projection.sourceName,
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

/**
 * Render the single accepted Substrait pilot fixture. Every broader Substrait
 * shape fails closed until a second real use case earns a larger projection.
 */
export async function projectDvtSubstraitPilotToPostgresSql(
  draft: DvtSubstraitPilotDraft
): Promise<string> {
  const projection = requireFinalPilotProjection(draft);
  const postgresAst = buildPilotPostgresAst(projection);
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
