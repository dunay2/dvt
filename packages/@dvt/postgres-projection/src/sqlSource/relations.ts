/** Bind FROM and JOIN syntax to prepared input occurrences. */
import {
  JoinRel_JoinType,
  RelSchema,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
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
import { sourcePredicate } from './predicates.js';
import { mergeSourceScopes, sourceAlias } from './references.js';
import { bindSourceRange } from './sourceBinding.js';

type SelectSource = (node: PostgresAstNode, depth: number) => SqlScope;
const joinTypes: Readonly<Record<string, JoinRel_JoinType>> = {
  JOIN_INNER: JoinRel_JoinType.INNER,
  JOIN_LEFT: JoinRel_JoinType.LEFT,
  JOIN_RIGHT: JoinRel_JoinType.RIGHT,
  JOIN_FULL: JoinRel_JoinType.OUTER,
};
export function combineSqlSources(
  state: SqlCompilationState,
  left: SqlScope,
  right: SqlScope,
  join?: PostgresAstNode
): SqlScope {
  const bindings = mergeSourceScopes(left, right);
  const identity = nextSourceRelation(state);
  const common = { relAnchor: identity.relAnchor };
  const fields = [...left.entry.fields, ...right.entry.fields];
  const cross = join == null || join['quals'] == null;
  const type = join == null ? JoinRel_JoinType.INNER : joinTypes[String(join['jointype'])];
  if (type == null || (cross && type !== JoinRel_JoinType.INNER))
    return sourceError(
      'unsupported_sql',
      'This JOIN requires an admitted type and explicit ON.',
      join
    );
  // ON sees both input schemas before the outer join applies its NULL extension.
  const schema = [
    ...state.schemas.get(left.entry.binding.relationId)!,
    ...state.schemas.get(right.entry.binding.relationId)!,
  ];
  const predicate = cross
    ? null
    : sourcePredicate(state, { bindings, schema }, sqlObject(join!['quals']));
  const relation = cross
    ? create(RelSchema, {
        relType: {
          case: 'cross',
          value: { common, left: left.entry.relation, right: right.entry.relation },
        },
      })
    : create(RelSchema, {
        relType: {
          case: 'join',
          value: {
            common,
            left: left.entry.relation,
            right: right.entry.relation,
            type,
            expression: predicate!,
          },
        },
      });
  const entry = appendSourceRelation(state, {
    relation,
    binding: identity,
    inputs: [left.entry.binding.relationId, right.entry.binding.relationId],
    fields: sourceOutputFields(
      identity.relationId,
      fields.map((field) => field.displayName!),
      fields.map((field) => field.fieldId)
    ),
  });
  return { entry, bindings };
}
export function sourceFromSyntax(
  state: SqlCompilationState,
  node: PostgresAstNode,
  select: SelectSource,
  depth: number
): SqlScope {
  sourceBudget(state);
  if (depth > 64)
    return sourceError('unsupported_sql', 'Query nesting exceeds the source profile.', node);
  if (node['RangeVar'] != null) {
    const range = sqlObject(node['RangeVar']);
    if (range['inh'] === false)
      return sourceError(
        'unsupported_sql',
        'ONLY is outside the logical-input source profile.',
        range
      );
    return bindSourceRange(state, range);
  }
  if (node['JoinExpr'] != null) {
    const join = sqlObject(node['JoinExpr']);
    if (
      join['isNatural'] === true ||
      sqlList(join['usingClause']).length > 0 ||
      join['join_using_alias'] != null ||
      join['alias'] != null
    )
      return sourceError(
        'unsupported_sql',
        'NATURAL, USING and aliased JOINs are outside the source profile.',
        join
      );
    return combineSqlSources(
      state,
      sourceFromSyntax(state, sqlObject(join['larg']), select, depth + 1),
      sourceFromSyntax(state, sqlObject(join['rarg']), select, depth + 1),
      join
    );
  }
  if (node['RangeSubselect'] != null) {
    const subquery = sqlObject(node['RangeSubselect']);
    if (subquery['lateral'] === true)
      return sourceError('unsupported_sql', 'LATERAL is outside the source profile.', subquery);
    const scope = select(sqlObject(subquery['subquery']), depth + 1);
    const qualifier = sourceAlias(subquery['alias']);
    return {
      entry: scope.entry,
      bindings: scope.entry.fields.map((field) => ({
        name: field.displayName!,
        qualifier,
        ordinal: field.outputOrdinal,
      })),
    };
  }
  return sourceError(
    'unsupported_sql',
    'FROM requires a prepared input, admitted JOIN or uncorrelated SELECT.',
    node
  );
}
