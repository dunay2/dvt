import {
  pgColumnRef,
  pgFunction,
  pgOrderedRowNumber,
  pgRangeVar,
  pgStringLiteral,
  pgTimestampTzLiteral,
  type PostgresAstNode,
} from './postgresAst.js';

export type DvtSubstraitPostgresProjectionErrorCode =
  'unsupported_shape' | 'invalid_source_binding' | 'deparse_failed';

export type DvtSubstraitPostgresSourceBinding = Readonly<{
  schema: string;
  table: string;
}>;

export class DvtSubstraitPostgresProjectionError extends Error {
  public constructor(
    public readonly code: DvtSubstraitPostgresProjectionErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DvtSubstraitPostgresProjectionError';
  }
}

type CalculatedExpression =
  | Readonly<{ kind: 'string-literal'; value: string }>
  | Readonly<{ kind: 'timestamp-literal'; value: string }>
  | Readonly<{ kind: 'row-number'; orderSourceOrdinal: number }>;

type ConnectedFieldProjection = Readonly<{
  source: Readonly<{
    schema: string;
    table: string;
    fields: readonly Readonly<{ name: string }>[];
  }>;
  outputs: readonly Readonly<{
    name: string;
    sourceFieldName?: string;
    calculation?: CalculatedExpression;
    operations?: readonly string[];
  }>[];
}>;

type PilotProjection = Readonly<{
  sourceName: string;
  inputFieldName: string;
  outputName: string;
  operations: readonly string[];
  outputs: readonly Readonly<{ name: string }>[];
}>;

export function buildPilotOutputExpression(projection: PilotProjection): PostgresAstNode {
  return projection.operations.reduce<PostgresAstNode>(
    (expression, operation) => pgFunction(operation, expression),
    pgColumnRef(projection.inputFieldName)
  );
}

export function requirePhysicalSourceBinding(
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

export function buildConnectedFieldPostgresAst(
  projection: ConnectedFieldProjection
): PostgresAstNode {
  const outputExpression = (
    output: ConnectedFieldProjection['outputs'][number]
  ): PostgresAstNode => {
    const calculation = output.calculation;
    if (calculation?.kind === 'string-literal') return pgStringLiteral(calculation.value);
    if (calculation?.kind === 'timestamp-literal') return pgTimestampTzLiteral(calculation.value);
    if (calculation?.kind === 'row-number') {
      const orderField = projection.source.fields[calculation.orderSourceOrdinal];
      if (orderField != null) return pgOrderedRowNumber(orderField.name);
    }
    if (output.sourceFieldName != null) {
      return (output.operations ?? []).reduce<PostgresAstNode>(
        (expression, operation) => pgFunction(operation, expression),
        pgColumnRef(output.sourceFieldName)
      );
    }
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'Projection output has no admitted source or calculation.'
    );
  };

  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => ({
        ResTarget: {
          ...(output.name === output.sourceFieldName ? {} : { name: output.name }),
          val: outputExpression(output),
        },
      })),
      fromClause: [pgRangeVar(projection.source)],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

export function buildPilotPostgresAst(
  projection: PilotProjection,
  sourceBinding?: DvtSubstraitPostgresSourceBinding
): PostgresAstNode {
  const physicalSource = sourceBinding == null ? null : requirePhysicalSourceBinding(sourceBinding);
  return {
    SelectStmt: {
      targetList: [
        {
          ResTarget: {
            name: projection.outputName,
            val: buildPilotOutputExpression(projection),
          },
        },
        ...projection.outputs.slice(1).map((output) => ({
          ResTarget: { val: pgColumnRef(output.name) },
        })),
      ],
      fromClause: [
        pgRangeVar({
          ...(physicalSource == null ? {} : { schema: physicalSource.schema }),
          table: physicalSource?.table ?? projection.sourceName,
        }),
      ],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}
