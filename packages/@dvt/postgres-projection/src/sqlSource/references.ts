/** Resolve PostgreSQL lexical names to canonical field ordinals without physical fallback. */
import {
  ExpressionSchema,
  type Expression,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';
import { buildRelationalSourceObjectId } from '@dvt/contracts';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  consumeSourceOrdinal,
  sourceError,
  sqlList,
  sqlObject,
  type ModelSqlSourceInput,
  type SqlCompilationState,
  type SqlInputBinding,
  type SqlNameBinding,
  type SqlScope,
  type SqlNameScope,
} from './context.js';

function matchesPhysicalPath(input: ModelSqlSourceInput, path: readonly string[]): boolean {
  if (!('sourceRef' in input.source)) return false;
  const { names, sourceRef } = input.source;
  if (
    path.length === 3 &&
    sourceRef.sourceObjectId !==
      buildRelationalSourceObjectId({
        kind: 'relation',
        catalog: path[0]!,
        schema: path[1]!,
        name: path[2]!,
        relationType: 'table',
      })
  )
    return false;
  const object = path.length === 3 ? path.slice(1) : path;
  return object.every((part, index) => part === names[names.length - object.length + index]);
}

export function resolveSourceInput(
  inputs: readonly ModelSqlSourceInput[],
  range: PostgresAstNode,
  alias: string | null
): SqlInputBinding {
  const table = range['relname'];
  if (typeof table !== 'string')
    return sourceError('unknown_input', 'Expected a prepared Model input name.', range);
  const path = [range['catalogname'], range['schemaname'], table].filter(
    (part): part is string => typeof part === 'string'
  );
  const logical = path.length === 1 ? inputs.find((input) => input.sqlName === table) : undefined;
  if (logical != null) return { input: logical, qualifier: alias ?? table };

  const physical = inputs.filter((input) => matchesPhysicalPath(input, path));
  const input =
    physical.length === 1 ? physical[0] : physical.find((item) => item.sqlName === alias);
  if (input == null)
    return sourceError(
      physical.length > 1 ? 'ambiguous_reference' : 'unknown_input',
      physical.length > 1
        ? 'The physical name matches multiple prepared inputs. Use a unique logical name or alias.'
        : 'The SQL input is outside the prepared Model context.',
      range
    );
  return { input, qualifier: alias ?? table, ...(alias == null ? { physicalPath: path } : {}) };
}

export function matchesSqlQualifier(binding: SqlNameBinding, parts: readonly string[]): boolean {
  if (parts.length === 0) return true;
  if (parts.length === 1) return binding.qualifier === parts[0];
  const path = binding.physicalPath;
  return path?.length === parts.length && parts.every((part, index) => part === path[index]);
}

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
  if (parts.length < 1 || parts.length > 4)
    return sourceError(
      'unknown_column',
      'Use a column from a prepared input or its alias.',
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
  const qualifier = parts.slice(0, -1);
  const candidates = scope.bindings.filter(
    (binding) => binding.name === name && matchesSqlQualifier(binding, qualifier)
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
