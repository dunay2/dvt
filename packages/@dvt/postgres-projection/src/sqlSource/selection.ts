/** Bind direct SQL targets and aliases, retaining publication order and exact field provenance. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';

import type { PostgresAstNode } from '../postgresAst.js';

import {
  appendSourceRelation,
  consumeSourceOrdinal,
  nextSourceRelation,
  sourceError,
  sourceNameScope,
  sourceOutputFields,
  sqlList,
  sqlObject,
  type SqlCompilationState,
  type SqlNameScope,
  type SqlScope,
} from './context.js';
import { matchesSqlQualifier, resolveSourceOrdinal, sqlIdentifier } from './references.js';

export type SqlTargetSelection = Readonly<{ name: string; ordinal: number }>;

type StarTarget = Readonly<{ reference: PostgresAstNode; parts: readonly unknown[] }>;

function readStarTarget(node: PostgresAstNode): StarTarget | null {
  const column = node['ColumnRef'];
  if (column == null) return null;
  const reference = sqlObject(column);
  const parts = sqlList(reference['fields']);
  if (parts.length === 0) return null;
  if (!Object.hasOwn(sqlObject(parts.at(-1)), 'A_Star')) return null;
  return { reference, parts };
}

function selectStarTarget(
  state: SqlCompilationState,
  names: SqlNameScope,
  item: PostgresAstNode,
  { reference, parts }: StarTarget
): readonly SqlTargetSelection[] {
  if (item['name'] != null || parts.length > 4)
    sourceError('unsupported_sql', 'Unsupported star projection.', item);
  const qualifier = parts.slice(0, -1).map(sqlIdentifier);
  const fields = names.bindings.filter((binding) => matchesSqlQualifier(binding, qualifier));
  if (fields.length === 0)
    sourceError('unknown_input', 'Qualified star is outside the prepared scope.', reference);
  return fields.map(({ name, ordinal }) => {
    consumeSourceOrdinal(state, names, ordinal);
    return { name, ordinal };
  });
}

function readOutputAlias(item: PostgresAstNode): string | null {
  const alias = item['name'];
  if (alias == null) return null;
  if (typeof alias !== 'string' || alias.length === 0)
    sourceError('unsupported_sql', 'Invalid output alias.', item);
  return alias;
}

function assertOutputNames(selected: readonly SqlTargetSelection[]): void {
  const count = selected.length;
  const withinLimit = count > 0 && count <= 512;
  if (withinLimit && new Set(selected.map((field) => field.name)).size === count) return;
  sourceError('ambiguous_reference', 'Model outputs require between 1 and 512 unique names.');
}

export function selectSourceTargets(
  state: SqlCompilationState,
  scope: SqlScope,
  targets: unknown
): readonly SqlTargetSelection[] {
  const names = sourceNameScope(state, scope);
  const selected = sqlList(targets).flatMap((target) => {
    const item = sqlObject(sqlObject(target)['ResTarget']);
    if (sqlList(item['indirection']).length > 0)
      sourceError('unsupported_sql', 'Target indirection is outside the source profile.', item);
    const node = sqlObject(item['val']);
    const star = readStarTarget(node);
    if (star != null) return selectStarTarget(state, names, item, star);
    const ordinal = resolveSourceOrdinal(state, names, node);
    const name = readOutputAlias(item) ?? scope.entry.fields[ordinal]!.displayName!;
    return [{ name, ordinal }];
  });
  assertOutputNames(selected);
  return selected;
}
export function projectSourceTargets(
  state: SqlCompilationState,
  scope: SqlScope,
  selected: readonly SqlTargetSelection[]
): SqlScope {
  const binding = nextSourceRelation(state);
  const names = selected.map((field) => field.name);
  const entry = appendSourceRelation(state, {
    relation: create(RelSchema, {
      relType: {
        case: 'project',
        value: {
          common: {
            relAnchor: binding.relAnchor,
            emitKind: {
              case: 'emit',
              value: { outputMapping: selected.map((field) => field.ordinal) },
            },
          },
          input: scope.entry.relation,
        },
      },
    }),
    binding,
    inputs: [scope.entry.binding.relationId],
    fields: sourceOutputFields(
      binding.relationId,
      names,
      selected.map((field) => scope.entry.fields[field.ordinal]!.fieldId)
    ),
  });
  return { entry, bindings: names.map((name, ordinal) => ({ name, qualifier: null, ordinal })) };
}
