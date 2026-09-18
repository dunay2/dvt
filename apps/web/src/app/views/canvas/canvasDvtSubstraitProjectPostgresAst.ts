/** Owns PostgreSQL AST construction for admitted connected ProjectRel chains. */
import { DvtSubstraitPostgresProjectionError } from '@dvt/postgres-projection';

import {
  inspectDvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionDraft,
  type DvtSubstraitProjectionSemantics,
  type DvtSubstraitScalarExpression,
} from './canvasDvtSubstraitProjection';
import {
  pgColumnRef,
  pgCoalesce,
  pgConcatAcceptNulls,
  pgExtractYearUtc,
  pgFunction,
  pgOrderedRowNumber,
  pgRangeVar,
  pgRangeSubselect,
  pgStringLiteral,
  pgTimestampTzLiteral,
  type PostgresAstNode,
} from './canvasDvtSubstraitPostgresAst';
import { resolveDvtSubstraitFilterPostgresProjection } from './canvasDvtSubstraitFilterPostgresProjection';

function requireConnectedFieldProjection(
  draft: DvtSubstraitProjectionDraft
): DvtSubstraitProjectionSemantics {
  const inspection = inspectDvtSubstraitProjectionDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection supports only the admitted connected-field Substrait shape.'
    );
  }
  return inspection.projection;
}

function buildScalarExpressionPostgresAst(
  expression: DvtSubstraitScalarExpression
): PostgresAstNode {
  if (expression.kind === 'field-reference') {
    return pgColumnRef(expression.sourceFieldName);
  }
  if (expression.kind === 'timestamp-literal') {
    return pgTimestampTzLiteral(expression.value);
  }
  if (
    expression.kind === 'scalar-function' &&
    (expression.functionName === 'trim' ||
      expression.functionName === 'upper' ||
      expression.functionName === 'lower') &&
    expression.arguments.length === 1
  ) {
    return pgFunction(
      expression.functionName,
      buildScalarExpressionPostgresAst(expression.arguments[0])
    );
  }
  if (
    expression.kind === 'scalar-function' &&
    expression.functionName === 'extract' &&
    expression.arguments.length === 1 &&
    expression.component === 'YEAR' &&
    expression.timezone === 'UTC'
  ) {
    return pgExtractYearUtc(buildScalarExpressionPostgresAst(expression.arguments[0]));
  }
  if (
    expression.kind === 'scalar-function' &&
    expression.functionName === 'coalesce' &&
    expression.arguments.length >= 2
  ) {
    return pgCoalesce(expression.arguments.map(buildScalarExpressionPostgresAst));
  }
  if (
    expression.kind === 'scalar-function' &&
    expression.functionName === 'concat' &&
    expression.arguments.length === 2 &&
    expression.nullHandling === 'ACCEPT_NULLS'
  ) {
    return pgConcatAcceptNulls(
      buildScalarExpressionPostgresAst(expression.arguments[0]),
      buildScalarExpressionPostgresAst(expression.arguments[1])
    );
  }
  throw new DvtSubstraitPostgresProjectionError(
    'unsupported_shape',
    'Projection output contains an unsupported scalar expression.'
  );
}

function buildConnectedFieldPostgresAst(
  projection: DvtSubstraitProjectionSemantics,
  whereClause?: PostgresAstNode
): PostgresAstNode {
  const calculatedExpression = (
    output: DvtSubstraitProjectionSemantics['outputs'][number]
  ): PostgresAstNode | null => {
    const calculation = output.calculation;
    if (calculation?.kind === 'string-literal') return pgStringLiteral(calculation.value);
    if (calculation?.kind === 'timestamp-literal') return pgTimestampTzLiteral(calculation.value);
    if (calculation?.kind === 'row-number') {
      const orderField = projection.source.fields[calculation.orderSourceOrdinal];
      return orderField == null ? null : pgOrderedRowNumber(orderField.name);
    }
    return null;
  };
  const outputExpression = (
    output: DvtSubstraitProjectionSemantics['outputs'][number]
  ): PostgresAstNode => {
    const calculated = calculatedExpression(output);
    if (calculated != null) return calculated;
    if (output.scalarExpression != null) {
      return buildScalarExpressionPostgresAst(output.scalarExpression);
    }
    if (output.sourceFieldName == null) {
      throw new DvtSubstraitPostgresProjectionError(
        'unsupported_shape',
        'Projection output has no admitted source or calculation.'
      );
    }
    return (output.operations ?? []).reduce<PostgresAstNode>(
      (expression, operation) => pgFunction(operation, expression),
      pgColumnRef(output.sourceFieldName)
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
      fromClause: [
        projection.inputProjection == null
          ? pgRangeVar({ schema: projection.source.schema, table: projection.source.table })
          : pgRangeSubselect(
              buildConnectedFieldPostgresAst(projection.inputProjection),
              'projection_input'
            ),
      ],
      ...(whereClause == null ? {} : { whereClause }),
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

export function buildDvtSubstraitProjectionPostgresAst(
  draft: DvtSubstraitProjectionDraft
): PostgresAstNode {
  const filter = resolveDvtSubstraitFilterPostgresProjection(draft);
  return buildConnectedFieldPostgresAst(
    requireConnectedFieldProjection(filter.baseDraft),
    filter.whereClause
  );
}
