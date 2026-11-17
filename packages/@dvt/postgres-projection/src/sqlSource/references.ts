/** Resolve PostgreSQL lexical names to canonical field ordinals without physical fallback. */
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  consumeSourceOrdinal,
  sourceError,
  sqlList,
  sqlObject,
  type SqlCompilationState,
  type SqlScope,
  type SqlNameScope,
} from './context.js';

export function sqlIdentifier(value: unknown): string {
  const node = sqlObject(value);
  const name = sqlObject(node['String'])['sval'];
  if (typeof name !== 'string' || name.length === 0)
    return sourceError('unsupported_sql', 'Expected an SQL identifier.');
  return name;
}
export function sqlColumnParts(node: PostgresAstNode): readonly string[] {
  if (!Object.hasOwn(node, 'ColumnRef'))
    return sourceError(
      'unsupported_sql',
      'Only direct fields are admitted in this projection.',
      node
    );
  const reference = sqlObject(node['ColumnRef']);
  const parts = sqlList(reference['fields']);
  if (parts.length < 1 || parts.length > 2)
    return sourceError(
      'unknown_column',
      'Use a column or a logical-input-qualified column.',
      reference
    );
  return parts.map(sqlIdentifier);
}
export function resolveSourceOrdinal(
  state: SqlCompilationState,
  scope: SqlNameScope,
  node: PostgresAstNode
): number {
  const parts = sqlColumnParts(node);
  const name = parts.at(-1)!;
  const qualifier = parts.length === 2 ? parts[0] : null;
  const candidates = scope.bindings.filter(
    (binding) => binding.name === name && (qualifier == null || binding.qualifier === qualifier)
  );
  if (candidates.length !== 1)
    return sourceError(
      candidates.length > 1 ? 'ambiguous_reference' : 'unknown_column',
      candidates.length > 1
        ? `Column ${parts.join('.')} is ambiguous.`
        : `Column ${parts.join('.')} is outside the prepared scope.`,
      sqlObject(node['ColumnRef'])
    );
  const ordinal = candidates[0]!.ordinal;
  consumeSourceOrdinal(state, scope, ordinal);
  return ordinal;
}
export function sourceFieldExpression(ordinal: number): Expression {
  return create(ExpressionSchema, {
    rexType: {
      case: 'selection',
      value: {
        rootType: { case: 'rootReference', value: {} },
        referenceType: {
          case: 'directReference',
          value: { referenceType: { case: 'structField', value: { field: ordinal } } },
        },
      },
    },
  });
}
export function sourceAlias(value: unknown): string | null {
  if (value == null) return null;
  const alias = sqlObject(value);
  if (
    sqlList(alias['colnames']).length > 0 ||
    typeof alias['aliasname'] !== 'string' ||
    alias['aliasname'].length === 0
  )
    return sourceError(
      'unsupported_sql',
      'Column-list aliases are outside the source profile.',
      alias
    );
  return alias['aliasname'];
}
export function mergeSourceScopes(
  left: SqlScope,
  right: SqlScope
): readonly SqlScope['bindings'][number][] {
  const qualifiers = new Set(
    left.bindings.map((binding) => binding.qualifier).filter((value) => value != null)
  );
  if (
    right.bindings.some((binding) => binding.qualifier != null && qualifiers.has(binding.qualifier))
  )
    sourceError('ambiguous_reference', 'Input aliases must be unique in their SQL scope.');
  return [
    ...left.bindings,
    ...right.bindings.map((binding) => ({
      ...binding,
      ordinal: binding.ordinal + left.entry.fields.length,
    })),
  ];
}
