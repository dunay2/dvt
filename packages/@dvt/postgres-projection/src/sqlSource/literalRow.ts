/** Own the bounded, explicitly aliased one-row SELECT with no physical source. */
import {
  ExpressionSchema,
  RelSchema,
  type Expression,
  type Expression_Literal,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import {
  TypeSchema,
  Type_Nullability,
  type Type,
} from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import { create } from '@bufbuild/protobuf';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  appendSourceRelation,
  nextSourceRelation,
  sourceBudget,
  sourceError,
  sourceOutputFields,
  sqlList,
  sqlObject,
  type SqlCompilationState,
  type SqlScope,
} from './context.js';

function integerLiteral(value: unknown): Expression_Literal['literalType'] {
  const integer = value === undefined ? 0 : value;
  if (
    typeof integer !== 'number' ||
    !Number.isInteger(integer) ||
    integer < -2147483648 ||
    integer > 2147483647
  )
    return sourceError('unsupported_sql', 'A literal integer must fit PostgreSQL int4.');
  return { case: 'i32', value: integer };
}

function scalarLiteral(kind: string, value: unknown): Expression_Literal['literalType'] {
  if (kind === 'ival') return integerLiteral(value);
  if (kind === 'boolval') {
    const flag = value === undefined ? false : value;
    if (typeof flag === 'boolean') return { case: 'boolean', value: flag };
  }
  if (kind === 'sval') {
    const text = value === undefined ? '' : value;
    if (typeof text === 'string') return { case: 'string', value: text };
  }
  return sourceError('unsupported_sql', 'Only int4, Boolean and text literals are admitted.');
}

function readLiteral(node: PostgresAstNode): Expression_Literal['literalType'] {
  if (Object.keys(node).length !== 1 || node['A_Const'] == null)
    return sourceError('unsupported_sql', 'A source-free output requires a literal.', node);
  const constant = sqlObject(node['A_Const']);
  const kinds = ['ival', 'boolval', 'sval'].filter((kind) => Object.hasOwn(constant, kind));
  if (
    kinds.length !== 1 ||
    (Object.hasOwn(constant, 'isnull') && constant['isnull'] !== false) ||
    Object.keys(constant).some(
      (key) => !['ival', 'boolval', 'sval', 'isnull', 'location'].includes(key)
    )
  )
    return sourceError(
      'unsupported_sql',
      'A source-free literal must have exactly one admitted value.',
      node
    );
  const kind = kinds[0]!;
  const scalar = sqlObject(constant[kind]);
  if (Object.keys(scalar).some((key) => key !== kind))
    return sourceError('unsupported_sql', 'The literal value contains unsupported facts.', node);
  return scalarLiteral(kind, scalar[kind]);
}

function literalType(literal: Expression_Literal['literalType']): Type {
  const attributes = { nullability: Type_Nullability.REQUIRED };
  switch (literal.case) {
    case 'i32':
    case 'string':
      return create(TypeSchema, { kind: { case: literal.case, value: attributes } });
    case 'boolean':
      return create(TypeSchema, { kind: { case: 'bool', value: attributes } });
    default:
      return sourceError('unsupported_sql', 'Unsupported source-free literal type.');
  }
}

function literalTarget(syntax: unknown): PostgresAstNode {
  const target = sqlObject(syntax);
  if (Object.keys(target).length !== 1)
    return sourceError(
      'unsupported_sql',
      'A literal output must contain exactly one target.',
      target
    );
  const item = sqlObject(target['ResTarget']);
  if (
    Object.keys(item).some((key) => !['name', 'val', 'indirection', 'location'].includes(key)) ||
    sqlList(item['indirection']).length > 0
  )
    return sourceError(
      'unsupported_sql',
      'Literal output indirection is outside the source profile.',
      item
    );
  return item;
}

function literalColumn(
  state: SqlCompilationState,
  syntax: unknown
): Readonly<{ name: string; type: Type; expression: Expression }> {
  sourceBudget(state);
  const item = literalTarget(syntax);
  if (typeof item['name'] !== 'string' || item['name'].length === 0)
    return sourceError(
      'unsupported_sql',
      'Literal outputs require explicit nonempty aliases.',
      item
    );
  const literal = readLiteral(sqlObject(item['val']));
  return {
    name: item['name'],
    type: literalType(literal),
    expression: create(ExpressionSchema, {
      rexType: { case: 'literal', value: { literalType: literal, nullable: false } },
    }),
  };
}

function admitLiteralStatement(select: PostgresAstNode, depth: number): void {
  if (depth !== 0)
    sourceError('unsupported_sql', 'A literal row must be the complete Model SELECT.', select);
  if (['whereClause', 'limitOffset', 'limitCount'].some((key) => select[key] != null))
    sourceError('unsupported_sql', 'A literal row cannot filter or limit its one row.', select);
  if (
    sqlList(select['sortClause']).length > 0 ||
    ![undefined, 'LIMIT_OPTION_DEFAULT'].includes(select['limitOption'] as string | undefined)
  )
    return sourceError(
      'unsupported_sql',
      'A literal row must be the complete Model SELECT.',
      select
    );
}

export function compileLiteralRow(
  state: SqlCompilationState,
  select: PostgresAstNode,
  depth: number
): SqlScope {
  admitLiteralStatement(select, depth);
  const targets = sqlList(select['targetList']);
  if (targets.length === 0 || targets.length > 512)
    return sourceError(
      'ambiguous_reference',
      'Model outputs require between 1 and 512 unique names.'
    );
  const columns = targets.map((target) => literalColumn(state, target));
  const names = columns.map((column) => column.name);
  if (new Set(names).size !== names.length)
    return sourceError('ambiguous_reference', 'Literal output aliases must be unique.');
  const binding = nextSourceRelation(state);
  const entry = appendSourceRelation(state, {
    binding,
    inputs: [],
    fields: sourceOutputFields(binding.relationId, names),
    relation: create(RelSchema, {
      relType: {
        case: 'read',
        value: {
          common: { relAnchor: binding.relAnchor },
          baseSchema: {
            names,
            struct: {
              types: columns.map((column) => column.type),
              nullability: Type_Nullability.REQUIRED,
            },
          },
          readType: {
            case: 'virtualTable',
            value: { expressions: [{ fields: columns.map((column) => column.expression) }] },
          },
        },
      },
    }),
  });
  return { entry, bindings: names.map((name, ordinal) => ({ name, qualifier: null, ordinal })) };
}
