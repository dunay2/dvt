/**
 * Owned concern: apply one immutable presentation rewrite to already admitted PostgreSQL syntax.
 * @baseline ADR-0064: syntax rewrites preserve canonical Substrait meaning and identity.
 * @decision Share lexical bindings and structural replacement across the ordered rules.
 * @consequence Rules neither invent source facts nor maintain competing scope resolvers.
 * @version 1.0.0
 */
import { pgQualifiedColumnRef, type PostgresAstNode } from '../postgresAst.js';
import { pgAnd } from '../postgresPredicateAst.js';

import {
  sqlObject,
  type SqlInput,
  type SqlObject,
  type SqlPath,
  type SqlReference,
  type SqlSelect,
} from './admission.js';

export type SqlRule =
  | 'SQLREAD1.PROJECTION_FUSION'
  | 'SQLREAD1.PREDICATE_PUSHDOWN'
  | 'SQLREAD1.COLUMN_PRUNING'
  | 'SQLREAD1.TRANSPARENT_SUBQUERY';
export type SqlRewrite = Readonly<{ ast: PostgresAstNode; rule: SqlRule; path: SqlPath }>;
type ReferenceMapper = (reference: SqlReference) => PostgresAstNode;

function invariant(message: string): never {
  throw new Error(`SQL presentation admission invariant: ${message}`);
}

export function replaceSqlNode(
  root: SqlObject,
  path: SqlPath,
  replacement: PostgresAstNode
): PostgresAstNode {
  const replace = (value: unknown, index: number): unknown => {
    if (index === path.length) return replacement;
    const segment = path[index];
    if (
      Array.isArray(value) &&
      typeof segment === 'number' &&
      segment >= 0 &&
      segment < value.length
    ) {
      const result = [...value];
      result[segment] = replace(value[segment], index + 1);
      return result;
    }
    const node = sqlObject(value);
    if (node !== undefined && typeof segment === 'string' && Object.hasOwn(node, segment)) {
      return { ...node, [segment]: replace(node[segment], index + 1) };
    }
    return invariant('structural path no longer identifies its admitted node');
  };
  return sqlObject(replace(root, 0)) ?? invariant('replacement must retain an AST object');
}

function column(reference: SqlReference): PostgresAstNode {
  return pgQualifiedColumnRef(reference.input.alias, reference.column);
}

function projected(input: SqlInput, name: string): SqlReference {
  return (
    input.select?.outputs.get(name)?.reference ?? invariant('subquery output binding is absent')
  );
}

function mapReferences(
  value: PostgresAstNode,
  view: SqlSelect,
  mapper: ReferenceMapper
): PostgresAstNode {
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    const node = sqlObject(value);
    if (node === undefined) return value;
    if (node['ColumnRef'] !== undefined) {
      const reference = view.references.get(node);
      return reference === undefined
        ? invariant('reference belongs to another SELECT scope')
        : mapper(reference);
    }
    return Object.fromEntries(Object.entries(node).map(([key, child]) => [key, rewrite(child)]));
  };
  return sqlObject(rewrite(value)) ?? invariant('an expression must remain an AST object');
}

function targets(view: SqlSelect, mapper: ReferenceMapper): readonly PostgresAstNode[] {
  return view.targets.map((target) => ({
    ResTarget: {
      ...target.target,
      name: target.name,
      val: mapReferences(target.value, view, mapper),
    },
  }));
}

function andTerms(expression: PostgresAstNode): readonly PostgresAstNode[] {
  const bool = sqlObject(expression['BoolExpr']);
  return bool?.['boolop'] === 'AND_EXPR' && Array.isArray(bool['args'])
    ? (bool['args'] as readonly PostgresAstNode[]).flatMap(andTerms)
    : [expression];
}

function conjunction(
  expressions: readonly (PostgresAstNode | undefined)[]
): PostgresAstNode | undefined {
  const terms = expressions.flatMap((expression) =>
    expression === undefined ? [] : andTerms(expression)
  );
  return terms.length > 1 ? pgAnd(terms) : terms[0];
}

function withWhere(statement: SqlObject, where: PostgresAstNode | undefined): SqlObject {
  const result = { ...statement };
  delete result['whereClause'];
  if (where !== undefined) result['whereClause'] = where;
  return result;
}

function selectAst(view: SqlSelect, statement: SqlObject): PostgresAstNode {
  return { ...view.ast, SelectStmt: statement };
}

function rewriteOwn(view: SqlSelect, statement: SqlObject, mapper: ReferenceMapper): SqlObject {
  let result: SqlObject = { ...statement, targetList: targets(view, mapper) };
  if (view.where !== undefined)
    result = { ...result, whereClause: mapReferences(view.where, view, mapper) };
  for (const join of view.joins) {
    const quals = sqlObject(join.payload['quals']);
    if (quals !== undefined)
      result = replaceSqlNode(result, [...join.path, 'quals'], mapReferences(quals, view, mapper));
  }
  return result;
}

function fuse(view: SqlSelect): SqlRewrite | undefined {
  const input = view.inputs[0];
  if (view.inputs.length !== 1 || input?.select === undefined) return undefined;
  const child = input.select;
  const mapper: ReferenceMapper = (reference) => {
    if (reference.input !== input) return invariant('projection reference escaped its sole input');
    return column(projected(input, reference.column));
  };
  const where = conjunction([
    child.where,
    view.where === undefined ? undefined : mapReferences(view.where, view, mapper),
  ]);
  return {
    ast: selectAst(view, {
      ...withWhere(child.statement, where),
      targetList: targets(view, mapper),
    }),
    rule: 'SQLREAD1.PROJECTION_FUSION',
    path: view.path,
  };
}

function referencedInputs(expression: PostgresAstNode, view: SqlSelect): ReadonlySet<SqlInput> {
  const inputs = new Set<SqlInput>();
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }
    const node = sqlObject(value);
    if (node === undefined) return;
    const reference = view.references.get(node);
    if (reference !== undefined) inputs.add(reference.input);
    else Object.values(node).forEach(collect);
  };
  collect(expression);
  return inputs;
}

function push(view: SqlSelect): SqlRewrite | undefined {
  if (view.where === undefined) return undefined;
  const terms = andTerms(view.where);
  for (const [index, term] of terms.entries()) {
    const inputs = referencedInputs(term, view);
    if (inputs.size !== 1) continue;
    const input = inputs.values().next().value;
    if (input?.select === undefined) continue;
    const child = input.select;
    const moved = mapReferences(term, view, (reference) =>
      column(projected(input, reference.column))
    );
    const nested = selectAst(child, withWhere(child.statement, conjunction([child.where, moved])));
    const nextInput = { ...input.node, RangeSubselect: { ...input.range, subquery: nested } };
    const statement = replaceSqlNode(view.statement, input.path, nextInput);
    return {
      ast: selectAst(
        view,
        withWhere(statement, conjunction(terms.filter((_term, position) => position !== index)))
      ),
      rule: 'SQLREAD1.PREDICATE_PUSHDOWN',
      path: [...view.path, 'SelectStmt', ...input.path],
    };
  }
  return undefined;
}

function prune(view: SqlSelect): SqlRewrite | undefined {
  for (const input of view.inputs) {
    const child = input.select;
    if (child === undefined) continue;
    const used = new Set(
      [...view.references.values()]
        .filter((reference) => reference.input === input)
        .map((reference) => reference.column)
    );
    const retained = child.targets.filter((target) => used.has(target.name));
    if (retained.length === 0) {
      const first = child.targets[0] ?? invariant('admitted subquery has no output');
      retained.push(first);
    }
    if (retained.length === child.targets.length) continue;
    const nested = selectAst(child, {
      ...child.statement,
      targetList: retained.map((target) => ({ ResTarget: target.target })),
    });
    const next = { ...input.node, RangeSubselect: { ...input.range, subquery: nested } };
    return {
      ast: selectAst(view, replaceSqlNode(view.statement, input.path, next)),
      rule: 'SQLREAD1.COLUMN_PRUNING',
      path: [...view.path, 'SelectStmt', ...input.path],
    };
  }
  return undefined;
}

function unwrap(view: SqlSelect): SqlRewrite | undefined {
  for (const input of view.inputs) {
    const child = input.select;
    const base = child?.inputs[0];
    if (
      child === undefined ||
      child.inputs.length !== 1 ||
      base === undefined ||
      base.select !== undefined
    )
      continue;
    const next = { RangeVar: { ...base.range, alias: { aliasname: input.alias } } };
    const mapper: ReferenceMapper = (reference) =>
      reference.input === input
        ? pgQualifiedColumnRef(input.alias, projected(input, reference.column).column)
        : column(reference);
    const replaced = replaceSqlNode(view.statement, input.path, next);
    const own = rewriteOwn(view, replaced, mapper);
    const filter =
      child.where === undefined
        ? undefined
        : mapReferences(child.where, child, (reference) =>
            pgQualifiedColumnRef(input.alias, reference.column)
          );
    return {
      ast: selectAst(view, withWhere(own, conjunction([sqlObject(own['whereClause']), filter]))),
      rule: 'SQLREAD1.TRANSPARENT_SUBQUERY',
      path: [...view.path, 'SelectStmt', ...input.path],
    };
  }
  return undefined;
}

/** Postorder comes from the single admission pass; rule priority is fixed here. */
export function rewriteAdmittedSql(selects: readonly SqlSelect[]): SqlRewrite | undefined {
  for (const select of selects) {
    const rewrite = fuse(select) ?? push(select) ?? prune(select) ?? unwrap(select);
    if (rewrite !== undefined)
      return {
        ...rewrite,
        ast: replaceSqlNode(
          selects[selects.length - 1]?.ast ?? invariant('root SELECT is absent'),
          select.path,
          rewrite.ast
        ),
      };
  }
  return undefined;
}
