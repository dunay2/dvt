/** Owns PostgreSQL AST construction for the admitted N-input JOIN read model. */
import { JoinRel_JoinType } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';

import { DvtSubstraitPostgresProjectionError } from './dvtProjection.js';
import {
  pgFunction,
  pgQualifiedColumnRef,
  pgRangeSubselect,
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
import { inspectDvtSubstraitJoinDraft } from './substraitJoinReader.js';
import type { DvtSubstraitJoinDraft } from './substraitJoinReadModel.js';
import {
  isDvtSubstraitSemiAntiJoin,
  type DvtSubstraitNInputJoinProjection,
} from './substraitJoinReadModel.js';

export function nInputJoinAlias(inputIndex: number): string {
  if (inputIndex === 0) return 'left_source';
  if (inputIndex === 1) return 'right_source';
  return `join_source_${inputIndex + 1}`;
}

export async function projectDvtJoinDraftToPostgresSql(draft: DvtSubstraitJoinDraft): Promise<
  Readonly<{
    sql: string;
    projection: DvtSubstraitNInputJoinProjection;
    ast: PostgresAstNode;
  }>
> {
  const inspection = inspectDvtSubstraitJoinDraft(draft);
  if (!inspection.ok) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires an admitted N-input JOIN shape.'
    );
  }
  const ast = buildNInputJoinPostgresAst(inspection.projection);
  return { projection: inspection.projection, ast, sql: await renderPostgresAst(ast) };
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

function postgresJoinType(
  joinType: number
): 'JOIN_INNER' | 'JOIN_LEFT' | 'JOIN_RIGHT' | 'JOIN_FULL' {
  if (joinType === JoinRel_JoinType.INNER) return 'JOIN_INNER';
  if (joinType === JoinRel_JoinType.LEFT) return 'JOIN_LEFT';
  if (joinType === JoinRel_JoinType.RIGHT) return 'JOIN_RIGHT';
  if (joinType === JoinRel_JoinType.OUTER) return 'JOIN_FULL';
  throw new DvtSubstraitPostgresProjectionError(
    'unsupported_shape',
    'The recursive JOIN contains an unsupported JOIN type.'
  );
}

type PostgresJoinFieldBinding = Readonly<{ alias: string; name: string }>;

function semiAntiExists(
  from: PostgresAstNode,
  predicate: PostgresAstNode,
  negated: boolean
): PostgresAstNode {
  const exists: PostgresAstNode = {
    SubLink: {
      subLinkType: 'EXISTS_SUBLINK',
      subselect: {
        SelectStmt: {
          targetList: [{ ResTarget: { val: pgI64Literal(1n) } }],
          fromClause: [from],
          whereClause: predicate,
          limitOption: 'LIMIT_OPTION_DEFAULT',
          op: 'SETOP_NONE',
        },
      },
      location: -1,
    },
  };
  return negated ? { BoolExpr: { boolop: 'NOT_EXPR', args: [exists], location: -1 } } : exists;
}

function buildSemiAntiJoinPostgresAst(
  projection: DvtSubstraitNInputJoinProjection
): PostgresAstNode {
  const firstInput = projection.inputs[0];
  if (
    firstInput == null ||
    projection.joins.length !== projection.inputs.length - 1 ||
    projection.joinRelations.length !== projection.joins.length
  ) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'The recursive JOIN tree does not have one typed predicate per appended input.'
    );
  }
  let currentFrom = pgRangeVar({
    schema: firstInput.schema,
    table: firstInput.table,
    alias: nInputJoinAlias(0),
  });
  let currentBindings = new Map<string, PostgresJoinFieldBinding>(
    firstInput.fields.map((field) => [
      field.fieldId,
      { alias: nInputJoinAlias(0), name: field.name },
    ])
  );

  for (let inputIndex = 1; inputIndex < projection.inputs.length; inputIndex += 1) {
    const input = projection.inputs[inputIndex]!;
    const stage = projection.joinRelations[inputIndex - 1]!;
    const predicate = projection.joins[inputIndex - 1]!;
    const rightAlias = nInputJoinAlias(inputIndex);
    const rightFrom = pgRangeVar({ schema: input.schema, table: input.table, alias: rightAlias });
    const rightBindings = new Map<string, PostgresJoinFieldBinding>(
      input.fields.map((field) => [field.fieldId, { alias: rightAlias, name: field.name }])
    );
    const predicateBindings = new Map([...currentBindings, ...rightBindings]);
    const requireBinding = (fieldId: string): PostgresJoinFieldBinding => {
      const binding = predicateBindings.get(fieldId);
      if (binding == null) {
        throw new DvtSubstraitPostgresProjectionError(
          'unsupported_shape',
          'The recursive JOIN references a field outside its effective stage inputs.'
        );
      }
      return binding;
    };
    const operand = (value: DvtSubstraitJoinPredicateOperand): PostgresAstNode => {
      if (value.kind === 'field') {
        const binding = requireBinding(value.sourceFieldId);
        return pgQualifiedColumnRef(binding.alias, binding.name);
      }
      if (value.kind === 'function') {
        const capability = resolveDvtSubstraitJoinUnaryFunction({
          capabilityId: value.capabilityId,
          inputDataType: 'string',
        });
        if (capability == null) {
          throw new DvtSubstraitPostgresProjectionError(
            'unsupported_shape',
            'The recursive JOIN contains an unsupported operand function.'
          );
        }
        return pgFunction(capability.name, operand(value.input));
      }
      const literal = value.literal;
      if (literal.dataType === 'string') return pgStringLiteral(literal.value);
      if (literal.dataType === 'bool') return pgBooleanLiteral(literal.value);
      if (literal.dataType === 'i64') return pgI64Literal(literal.value);
      if (literal.dataType === 'fp64') return pgFp64Literal(literal.value);
      return pgTimestampTzLiteral(literal.value);
    };
    const condition = reduceDvtSubstraitJoinConditions({
      conditions: predicate.conditions,
      comparison: (comparison) =>
        isDvtSubstraitJoinNullCondition(comparison)
          ? pgNullTest(operand(comparison.left), comparison.operator === 'is_not_null')
          : pgComparison(
              POSTGRES_JOIN_COMPARISON[comparison.operator ?? 'equal'],
              operand(comparison.left),
              operand(comparison.right)
            ),
      combine: (combination, left, right) =>
        combination === 'and' ? pgAnd([left, right]) : pgOr([left, right]),
    });
    const retainsLeft =
      stage.joinType === JoinRel_JoinType.LEFT_SEMI ||
      stage.joinType === JoinRel_JoinType.LEFT_ANTI;
    const retainsRight =
      stage.joinType === JoinRel_JoinType.RIGHT_SEMI ||
      stage.joinType === JoinRel_JoinType.RIGHT_ANTI;
    const negated =
      stage.joinType === JoinRel_JoinType.LEFT_ANTI ||
      stage.joinType === JoinRel_JoinType.RIGHT_ANTI;
    const stageFrom = retainsLeft
      ? currentFrom
      : retainsRight
        ? rightFrom
        : {
            JoinExpr: {
              jointype: postgresJoinType(stage.joinType),
              larg: currentFrom,
              rarg: rightFrom,
              quals: condition,
            },
          };
    const stageWhere = retainsLeft
      ? semiAntiExists(rightFrom, condition, negated)
      : retainsRight
        ? semiAntiExists(currentFrom, condition, negated)
        : undefined;
    const stageAlias = `join_stage_${inputIndex}`;
    const stageOutputs = projection.stageOutputs[inputIndex - 1];
    if (stageOutputs == null) {
      throw new DvtSubstraitPostgresProjectionError(
        'unsupported_shape',
        'The recursive JOIN stage output is unavailable.'
      );
    }
    const stageColumns = stageOutputs.map((field, ordinal) => {
      const source = requireBinding(field.sourceFieldId);
      return {
        sourceFieldId: field.sourceFieldId,
        name: `field_${ordinal}`,
        expression: pgQualifiedColumnRef(source.alias, source.name),
      };
    });
    const stageSelect: PostgresAstNode = {
      SelectStmt: {
        targetList: stageColumns.map((field) => ({
          ResTarget: { name: field.name, val: field.expression },
        })),
        fromClause: [stageFrom],
        ...(stageWhere == null ? {} : { whereClause: stageWhere }),
        limitOption: 'LIMIT_OPTION_DEFAULT',
        op: 'SETOP_NONE',
      },
    };
    currentFrom = pgRangeSubselect(stageSelect, stageAlias);
    currentBindings = new Map(
      stageColumns.map((field) => [field.sourceFieldId, { alias: stageAlias, name: field.name }])
    );
  }

  return {
    SelectStmt: {
      targetList: projection.outputs.map((output) => {
        const source = currentBindings.get(output.source.fieldId);
        if (source == null) {
          throw new DvtSubstraitPostgresProjectionError(
            'unsupported_shape',
            'The recursive JOIN output is not present in its effective final stage.'
          );
        }
        return {
          ResTarget: { name: output.name, val: pgQualifiedColumnRef(source.alias, source.name) },
        };
      }),
      fromClause: [currentFrom],
      limitOption: 'LIMIT_OPTION_DEFAULT',
      op: 'SETOP_NONE',
    },
  };
}

export function buildNInputJoinPostgresAst(
  projection: DvtSubstraitNInputJoinProjection
): PostgresAstNode {
  if (projection.outputs.length === 0) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'PostgreSQL projection requires at least one selected JOIN output.'
    );
  }
  if (projection.joinRelations.some((stage) => isDvtSubstraitSemiAntiJoin(stage.joinType))) {
    return buildSemiAntiJoinPostgresAst(projection);
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
        'The recursive JOIN references a field outside its admitted inputs.'
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
          'The recursive JOIN contains an unsupported operand function.'
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
  if (
    firstInput == null ||
    projection.joins.length !== projection.inputs.length - 1 ||
    projection.joinRelations.length !== projection.joins.length
  ) {
    throw new DvtSubstraitPostgresProjectionError(
      'unsupported_shape',
      'The recursive JOIN tree does not have one typed predicate per appended input.'
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
    const joinRelation = projection.joinRelations[inputIndex - 1]!;
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
        jointype: postgresJoinType(joinRelation.joinType),
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
