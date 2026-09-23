/** SQL lowering dispatch over the pinned protobuf, independent of subtree shape. */
import type { Rel } from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import type { Plan } from '@buf/substrait_substrait.bufbuild_es/substrait/plan_pb.js';
import type { IndexedRelation, SchemaField } from '@dvt/substrait-analysis';

import {
  pgColumnRef,
  pgCountRows,
  pgQualifiedColumnRef,
  pgRangeVar,
  type PostgresAstNode,
} from '../postgresAst.js';
import type { DvtPostgresOrderKey } from '../sortFetchPostgresProjection.js';
import { countProfile } from '../substrait-profile/count.js';
import { inspectFunctionProfile } from '../substrait-profile/functions.js';

import { expressionSql, predicateSql } from './expressions.js';
import { joinSql } from './joins.js';
import { orderClause, sortDirection } from './ordering.js';
import {
  columnName,
  inputColumns,
  inputRange,
  selectAst,
  unsupported,
  type ExpressionScope,
  type SqlInput,
} from './scope.js';
import { setSql } from './sets.js';

type OrderExpression = Omit<DvtPostgresOrderKey, 'name'> & { expression: PostgresAstNode };
type Body = Readonly<{
  columns: readonly PostgresAstNode[];
  from: readonly PostgresAstNode[];
  clauses?: PostgresAstNode;
  order?: readonly OrderExpression[];
}>;
type Context = Readonly<{
  inputs: readonly SqlInput[];
  scope: ExpressionScope;
  order: readonly OrderExpression[];
}>;
type Variant = Exclude<Rel['relType'], { case: undefined }>;
type Handlers = {
  [K in Variant['case']]?: (
    message: Extract<Variant, { case: K }>['value'],
    context: Context
  ) => Body;
};
const handlers = {
  read: (read) => {
    if (read.readType.case !== 'namedTable')
      return unsupported('Only named PostgreSQL tables are admitted.');
    return {
      columns: read.baseSchema!.names.map(pgColumnRef),
      from: [
        pgRangeVar({ schema: read.readType.value.names[0]!, table: read.readType.value.names[1]! }),
      ],
    };
  },
  project: (project, { inputs, scope, order }) => ({
    columns: [
      ...scope.columns,
      ...project.expressions.map((expression) => expressionSql(expression, scope).ast),
    ],
    from: [inputRange(inputs[0]!, 'i0')],
    order,
  }),
  filter: (filter, { inputs, scope, order }) => ({
    columns: scope.columns,
    from: [inputRange(inputs[0]!, 'i0')],
    clauses: { whereClause: predicateSql(filter.condition, scope) },
    order,
  }),
  cross: (cross, { inputs, scope }) => joinSql(cross, inputs, scope),
  join: (join, { inputs, scope }) => joinSql(join, inputs, scope),
  set: (set, { inputs }) => {
    const result = setSql(set, inputs);
    return { columns: inputColumns(result, 's'), from: [inputRange(result, 's')] };
  },
  aggregate: (aggregate, { inputs, scope }) => {
    const groups = aggregate.groupingExpressions.map(
      (expression) => expressionSql(expression, scope).ast
    );
    const measures = aggregate.measures.map((measure) => {
      if (measure.filter != null || measure.measure == null)
        return unsupported('Filtered aggregates are outside the admitted profile.');
      const profile = inspectFunctionProfile(scope.plan, measure.measure);
      if (!profile.ok || profile.value !== countProfile)
        return unsupported('Aggregate function is outside the admitted profile.');
      return pgCountRows();
    });
    return {
      columns: [...groups, ...measures],
      from: [inputRange(inputs[0]!, 'i0')],
      clauses: groups.length === 0 ? {} : { groupClause: groups },
    };
  },
  sort: (sort, { inputs, scope }) => {
    if (sort.sorts.length === 0) return unsupported('Sort must declare its ordering.');
    return {
      columns: scope.columns,
      from: [inputRange(inputs[0]!, 'i0')],
      order: sort.sorts.map((key) => ({
        ...sortDirection(key),
        expression: expressionSql(key.expr, scope).ast,
      })),
    };
  },
  fetch: (fetch, { inputs, scope, order }) => {
    const limits: Record<string, PostgresAstNode> = {};
    for (const [name, expr] of [
      ['limitOffset', fetch.offsetExpr],
      ['limitCount', fetch.countExpr],
    ] as const) {
      if (expr == null) continue;
      if (
        expr.rexType.case !== 'literal' ||
        expr.rexType.value.literalType.case !== 'i64' ||
        expr.rexType.value.literalType.value < 0n ||
        expr.rexType.value.literalType.value > 9_223_372_036_854_775_807n
      )
        return unsupported('Fetch bounds must be non-negative signed i64 literals.');
      limits[name] = expressionSql(expr, scope).ast;
    }
    return {
      columns: scope.columns,
      from: [inputRange(inputs[0]!, 'i0')],
      clauses: { ...limits, limitOption: 'LIMIT_OPTION_COUNT' },
      order,
    };
  },
} satisfies Handlers;

export function relationSql(
  plan: Plan,
  entry: IndexedRelation,
  inputs: readonly SqlInput[],
  fields: readonly SchemaField[]
): SqlInput {
  const variant = entry.relation.relType;
  if (variant.case === undefined || !Object.hasOwn(handlers, variant.case))
    return unsupported('Relation has no PostgreSQL lowering.');
  const message = variant.value;
  if (!('common' in message)) return unsupported('Relation common is absent.');
  const common = message.common;
  if (
    common?.hint != null ||
    common?.advancedExtension != null ||
    ('advancedExtension' in message && message.advancedExtension != null)
  )
    return unsupported('Relation extensions are outside the admitted profile.');
  const columns = inputs.flatMap((input, index) => inputColumns(input, `i${index}`));
  const scope = { plan, fields: inputs.flatMap((input) => input.fields), columns };
  const order =
    inputs.length === 1
      ? inputs[0]!.orderBy.map((key) => ({
          ...key,
          expression: /^c\d+$/.test(key.name)
            ? columns[Number(key.name.slice(1))]!
            : pgQualifiedColumnRef('i0', key.name),
        }))
      : [];
  const handler = handlers[variant.case as keyof typeof handlers] as (
    message: Variant['value'],
    context: Context
  ) => Body;
  const body = handler(message, { inputs, scope, order });
  const selected =
    common?.emitKind.case === 'emit'
      ? common.emitKind.value.outputMapping.map(
          (ordinal) =>
            body.columns[ordinal] ?? unsupported('Emit ordinal is outside the SQL input.')
        )
      : body.columns;
  if (selected.length !== fields.length || selected.length === 0)
    return unsupported('SQL output schema differs from Substrait or has no fields.');
  const targets = selected.map((val, ordinal) => ({
    ResTarget: { name: columnName(ordinal), val },
  }));
  const orderBy = (body.order ?? []).map(({ expression, direction, nulls }, ordinal) => {
    const visible = selected.indexOf(expression);
    const name = visible >= 0 ? columnName(visible) : `o${ordinal}`;
    if (visible < 0) targets.push({ ResTarget: { name, val: expression } });
    return { name, direction, nulls };
  });
  const ast = selectAst(selected, body.from, {
    ...body.clauses,
    targetList: targets,
    ...(orderBy.length === 0 ? {} : { sortClause: orderClause(orderBy) }),
  });
  return { ast, fields, orderBy };
}
