/** Owns PostgreSQL AST construction for the admitted N-input JOIN read model. */
import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import {
  pgFunction,
  pgQualifiedColumnRef,
  pgRangeVar,
  pgTimestampTzLiteral,
  pgStringLiteral,
  type PostgresAstNode,
} from './postgresAst.js';
import {
  pgAnd,
  pgOr,
  pgComparison,
  pgNullTest,
  pgBooleanLiteral,
  pgI64Literal,
  pgFp64Literal,
  type PostgresComparisonOperator,
} from './postgresPredicateAst.js';
import { renderPostgresAst } from './renderPostgresAst.js';
import {
  reduceDvtSubstraitJoinConditions,
  isDvtSubstraitJoinNullCondition,
  type DvtSubstraitJoinComparisonOperator,
} from './substraitJoinCondition.js';
import {
  resolveDvtSubstraitJoinUnaryFunction,
  type DvtSubstraitJoinPredicateOperand,
} from './substraitJoinOperandReader.js';
import { inspectDvtSubstraitNInputJoinDraft } from './substraitJoinReader.js';
import type { DvtSubstraitInnerJoinDraft } from './substraitJoinReadModel.js';
import type { DvtSubstraitNInputJoinProjection } from './substraitJoinReadModel.js';

export function nInputJoinAlias(inputIndex: number): string {
  if (inputIndex === 0) return 'left_source';
  if (inputIndex === 1) return 'right_source';
  return `join_source_${inputIndex + 1}`;
}

export async function projectDvtInnerJoinDraftToPostgresSql(
  draft: DvtSubstraitInnerJoinDraft
): Promise<Readonly<{ sql: string; projection: DvtSubstraitNInputJoinProjection }>> {
  const inspection = inspectDvtSubstraitNInputJoinDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires an admitted N-input INNER JOIN shape.'
    );
  }
  return {
    projection: inspection.projection,
    sql: await renderPostgresAst(buildNInputJoinPostgresAst(inspection.projection)),
  };
}

export const POSTGRES_JOIN_COMPARISON: Readonly<
  Record<DvtSubstraitJoinComparisonOperator, PostgresComparisonOperator>
> = {
  equal: '=',
  not_equal: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

export function buildNInputJoinPostgresAst(
  projection: DvtSubstraitNInputJoinProjection
): PostgresAstNode {
  if (projection.outputs.length === 0) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires at least one selected JOIN output.'
    );
  }
  const fieldBindings = new Map<string, Readonly<{ alias: string; name: string }>>();
  projection.inputs.forEach((input, inputIndex) => {
    const alias = nInputJoinAlias(inputIndex);
    input.fields.forEach((field) => fieldBindings.set(field.fieldId, { alias, name: field.name }));
  });
  const requireFieldBinding = (fieldId: string): Readonly<{ alias: string; name: string }> => {
    const binding = fieldBindings.get(fieldId);
    if (binding == null) {
      throw new DvtSubstraitPostgresProjectionError(
        'unsupported_shape',
        'The recursive INNER JOIN references a field outside its admitted inputs.'
      );
    }
    return binding;
  };
  const predicateOperand = (operand: DvtSubstraitJoinPredicateOperand): PostgresAstNode => {
    if (operand.kind === 'field') {
      const field = requireFieldBinding(operand.sourceFieldId);
      return pgQualifiedColumnRef(field.alias, field.name);
    }
    if (operand.kind === 'function') {
      const capability = resolveDvtSubstraitJoinUnaryFunction({
        capabilityId: operand.capabilityId,
        inputDataType: 'string',
      });
      if (capability == null) {
        throw new DvtSubstraitPostgresProjectionError(
          'unsupported_shape',
          'The recursive INNER JOIN contains an unsupported operand function.'
        );
      }
      return pgFunction(capability.name, predicateOperand(operand.input));
    }
    const literal = operand.literal;
    if (literal.dataType === 'string') return pgStringLiteral(literal.value);
    if (literal.dataType === 'bool') return pgBooleanLiteral(literal.value);
    if (literal.dataType === 'i64') return pgI64Literal(literal.value);
    if (literal.dataType === 'fp64') return pgFp64Literal(literal.value);
    return pgTimestampTzLiteral(literal.value);
  };

  const firstInput = projection.inputs[0];
  if (firstInput == null || projection.joins.length !== projection.inputs.length - 1) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'The recursive INNER JOIN tree does not have one predicate per appended input.'
    );
  }
  let joinedInputs = pgRangeVar({
    schema: firstInput.schema,
    table: firstInput.table,
    alias: nInputJoinAlias(0),
  });
  for (let inputIndex = 1; inputIndex < projection.inputs.length; inputIndex += 1) {
    const input = projection.inputs[inputIndex]!;
    const predicate = projection.joins[inputIndex - 1]!;
    const conditionExpression = reduceDvtSubstraitJoinConditions({
      conditions: predicate.conditions,
      comparison: (condition) =>
        isDvtSubstraitJoinNullCondition(condition)
          ? pgNullTest(predicateOperand(condition.left), condition.operator === 'is_not_null')
          : pgComparison(
              POSTGRES_JOIN_COMPARISON[condition.operator ?? 'equal'],
              predicateOperand(condition.left),
              predicateOperand(condition.right)
            ),
      combine: (combination, leftExpression, rightExpression) =>
        combination === 'and'
          ? pgAnd([leftExpression, rightExpression])
          : pgOr([leftExpression, rightExpression]),
    });
    joinedInputs = {
      JoinExpr: {
        jointype: 'JOIN_INNER',
        larg: joinedInputs,
        rarg: pgRangeVar({
          schema: input.schema,
          table: input.table,
          alias: nInputJoinAlias(inputIndex),
        }),
        quals: conditionExpression,
      },
    };
  }

  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => {
        const source = requireFieldBinding(output.source.fieldId);
        return {
          ResTarget: {
            name: output.name,
            val: pgQualifiedColumnRef(source.alias, source.name),
          },
        };
      }),
      fromClause: [joinedInputs],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}
