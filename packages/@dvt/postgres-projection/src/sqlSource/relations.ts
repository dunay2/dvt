/** Bind FROM and JOIN syntax to prepared input occurrences. */
import {
  JoinRel_JoinType,
  RelSchema,
  type Rel,
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
  type SqlNameBinding,
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

function sourceJoinType(join: PostgresAstNode | undefined): JoinRel_JoinType | null {
  if (join == null) return null;
  const kind = join['jointype'];
  const type = typeof kind === 'string' ? joinTypes[kind] : undefined;
  if (type != null) {
    if (join['quals'] != null) return type;
    if (type === JoinRel_JoinType.INNER) return null;
  }
  return sourceError(
    'unsupported_sql',
    'This JOIN requires an admitted type and explicit ON.',
    join
  );
}

function buildSourceJoin(
  state: SqlCompilationState,
  input: Readonly<{
    left: SqlScope;
    right: SqlScope;
    bindings: readonly SqlNameBinding[];
    relAnchor: number;
  }>,
  join?: PostgresAstNode
): Rel {
  const { left, right, bindings, relAnchor } = input;
  const operands = {
    common: { relAnchor },
    left: left.entry.relation,
    right: right.entry.relation,
  };
  const type = sourceJoinType(join);
  if (type == null) return create(RelSchema, { relType: { case: 'cross', value: operands } });

  // ON sees both input schemas before the outer join applies its NULL extension.
  const schema = [
    ...state.schemas.get(left.entry.binding.relationId)!,
    ...state.schemas.get(right.entry.binding.relationId)!,
  ];
  const expression = sourcePredicate(state, { bindings, schema }, sqlObject(join?.['quals']));
  return create(RelSchema, {
    relType: { case: 'join', value: { ...operands, type, expression } },
  });
}

export function combineSqlSources(
  state: SqlCompilationState,
  left: SqlScope,
  right: SqlScope,
  join?: PostgresAstNode
): SqlScope {
  const bindings = mergeSourceScopes(left, right);
  const identity = nextSourceRelation(state);
  const fields = [...left.entry.fields, ...right.entry.fields];
  const relation = buildSourceJoin(
    state,
    { left, right, bindings, relAnchor: identity.relAnchor },
    join
  );
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

function sourceRange(state: SqlCompilationState, range: PostgresAstNode): SqlScope {
  if (range['inh'] === false)
    return sourceError(
      'unsupported_sql',
      'ONLY is outside the prepared-input source profile.',
      range
    );
  return bindSourceRange(state, range);
}

function assertDirectJoin(join: PostgresAstNode): void {
  if (join['isNatural'] !== true && sqlList(join['usingClause']).length === 0) {
    if (join['join_using_alias'] == null && join['alias'] == null) return;
  }
  sourceError(
    'unsupported_sql',
    'NATURAL, USING and aliased JOINs are outside the source profile.',
    join
  );
}

function sourceSubquery(subquery: PostgresAstNode, select: SelectSource, depth: number): SqlScope {
  if (subquery['lateral'] === true)
    return sourceError('unsupported_sql', 'LATERAL is outside the source profile.', subquery);
  const scope = select(sqlObject(subquery['subquery']), depth);
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

export function sourceFromSyntax(
  state: SqlCompilationState,
  node: PostgresAstNode,
  select: SelectSource,
  depth: number
): SqlScope {
  sourceBudget(state);
  if (depth > 64)
    return sourceError('unsupported_sql', 'Query nesting exceeds the source profile.', node);
  if (node['RangeVar'] != null) return sourceRange(state, sqlObject(node['RangeVar']));
  if (node['JoinExpr'] != null) {
    const join = sqlObject(node['JoinExpr']);
    assertDirectJoin(join);
    return combineSqlSources(
      state,
      sourceFromSyntax(state, sqlObject(join['larg']), select, depth + 1),
      sourceFromSyntax(state, sqlObject(join['rarg']), select, depth + 1),
      join
    );
  }
  if (node['RangeSubselect'] != null)
    return sourceSubquery(sqlObject(node['RangeSubselect']), select, depth + 1);
  return sourceError(
    'unsupported_sql',
    'FROM requires a prepared input, admitted JOIN or uncorrelated SELECT.',
    node
  );
}
