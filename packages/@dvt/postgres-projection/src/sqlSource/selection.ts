/** Bind direct SQL targets and aliases, retaining publication order and exact field provenance. */
import { RelSchema } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { create } from '@bufbuild/protobuf';

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
  type SqlScope,
} from './context.js';
import { resolveSourceOrdinal, sqlIdentifier } from './references.js';

export type SqlTargetSelection = Readonly<{ name: string; ordinal: number }>;
export function selectSourceTargets(
  state: SqlCompilationState,
  scope: SqlScope,
  targets: unknown
): readonly SqlTargetSelection[] {
  const selected: SqlTargetSelection[] = [];
  const names = sourceNameScope(state, scope);
  for (const target of sqlList(targets)) {
    const item = sqlObject(sqlObject(target)['ResTarget']);
    if (sqlList(item['indirection']).length > 0)
      sourceError('unsupported_sql', 'Target indirection is outside the source profile.', item);
    const node = sqlObject(item['val']);
    const reference = node['ColumnRef'] == null ? null : sqlObject(node['ColumnRef']);
    const parts = reference == null ? [] : sqlList(reference['fields']);
    if (parts.length > 0 && Object.hasOwn(sqlObject(parts.at(-1)), 'A_Star')) {
      if (item['name'] != null || parts.length > 2)
        sourceError('unsupported_sql', 'Unsupported star projection.', item);
      const qualifier = parts.length === 2 ? sqlIdentifier(parts[0]) : null;
      const fields = scope.bindings.filter(
        (binding) => qualifier == null || qualifier === binding.qualifier
      );
      if (fields.length === 0)
        sourceError('unknown_input', 'Qualified star is outside the prepared scope.', reference!);
      for (const field of fields) {
        consumeSourceOrdinal(state, names, field.ordinal);
        selected.push({ name: field.name, ordinal: field.ordinal });
      }
    } else {
      const ordinal = resolveSourceOrdinal(state, names, node);
      const alias = item['name'];
      if (alias != null && (typeof alias !== 'string' || alias.length === 0))
        sourceError('unsupported_sql', 'Invalid output alias.', item);
      selected.push({
        name: typeof alias === 'string' ? alias : scope.entry.fields[ordinal]!.displayName!,
        ordinal,
      });
    }
  }
  if (
    selected.length === 0 ||
    selected.length > 512 ||
    new Set(selected.map((field) => field.name)).size !== selected.length
  )
    sourceError('ambiguous_reference', 'Model outputs require between 1 and 512 unique names.');
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
