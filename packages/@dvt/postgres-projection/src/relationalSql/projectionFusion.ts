/** Bounded, presentation-only PostgreSQL AST rewriting. Never changes Substrait authority. */
import type { PostgresAstNode } from '../postgresAst.js';
import { renderPostgresAst } from '../renderPostgresAst.js';

type AstObject = Record<string, unknown>;

export type ProjectionFusionStep = Readonly<{
  rule: 'SQLREAD1.PROJECTION_FUSION';
  path: string;
}>;

export type ProjectionFusionResult = Readonly<{
  ast: PostgresAstNode;
  steps: readonly ProjectionFusionStep[];
}>;

function object(value: unknown): AstObject | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as AstObject)
    : null;
}

function sqlName(value: unknown): string | null {
  const field = object(value);
  const stringNode = object(field?.String);
  return typeof stringNode?.sval === 'string' ? stringNode.sval : null;
}

function directColumn(value: unknown): readonly string[] | null {
  const column = object(object(value)?.ColumnRef);
  if (column == null || !Array.isArray(column.fields) || column.fields.length === 0) return null;
  const fields = column.fields.map(sqlName);
  return fields.every((field): field is string => field != null) ? fields : null;
}

function isSimpleSelect(select: AstObject, allowed: ReadonlySet<string>): boolean {
  if (Object.keys(select).some((key) => !allowed.has(key))) return false;
  if (select.op !== undefined && select.op !== 'SETOP_NONE') return false;
  if (select.limitOption !== undefined && select.limitOption !== 'LIMIT_OPTION_DEFAULT')
    return false;
  if (select.all != null && select.all !== false) return false;
  return Array.isArray(select.targetList) && Array.isArray(select.fromClause);
}

const OUTER_KEYS = new Set(['targetList', 'fromClause', 'op', 'limitOption', 'all']);
const INNER_KEYS = new Set([...OUTER_KEYS, 'whereClause']);

function fuse(selectNode: PostgresAstNode): PostgresAstNode | null {
  const outer = object(selectNode.SelectStmt);
  if (outer == null || !isSimpleSelect(outer, OUTER_KEYS)) return null;
  const outerFrom = outer.fromClause as unknown[];
  if (outerFrom.length !== 1) return null;
  const source = object(object(outerFrom[0])?.RangeSubselect);
  const alias = object(source?.alias)?.aliasname;
  if (source == null || typeof alias !== 'string' || alias.length === 0) return null;
  // LATERAL and explicit column alias lists can change binding/scope.
  if (Object.keys(source).some((key) => !['subquery', 'alias', 'lateral'].includes(key)))
    return null;
  if (
    source.lateral === true ||
    Object.keys(object(source.alias) ?? {}).some((key) => key !== 'aliasname')
  )
    return null;
  const innerNode = object(source.subquery);
  const inner = object(innerNode?.SelectStmt);
  if (inner == null || !isSimpleSelect(inner, INNER_KEYS)) return null;
  if ((inner.fromClause as unknown[]).length === 0) return null;

  // Rebinding an inner alias with the same name as the removed outer alias
  // could capture references that originally belonged to the outer scope.
  const aliases = new Set<string>();
  const collectAliases = (value: unknown): boolean => {
    const node = object(value);
    if (node == null) return false;
    const join = object(node.JoinExpr);
    if (join != null) return collectAliases(join.larg) && collectAliases(join.rarg);
    const range = object(node.RangeVar) ?? object(node.RangeSubselect);
    if (range == null) return false;
    const rangeAlias = object(range.alias)?.aliasname;
    const implicitName = object(node.RangeVar)?.relname;
    const name = typeof rangeAlias === 'string' ? rangeAlias : implicitName;
    if (typeof name !== 'string' || aliases.has(name)) return false;
    aliases.add(name);
    return true;
  };
  if (!(inner.fromClause as unknown[]).every(collectAliases) || aliases.has(alias))
    return null;

  const bindings = new Map<string, unknown>();
  for (const entry of inner.targetList as unknown[]) {
    const target = object(object(entry)?.ResTarget);
    if (target == null || typeof target.name !== 'string' || bindings.has(target.name))
      return null;
    if (Object.keys(target).some((key) => !['name', 'val', 'location'].includes(key)))
      return null;
    // First cut: only direct references. Do not duplicate/relocate calculations.
    if (directColumn(target.val) == null) return null;
    bindings.set(target.name, target.val);
  }

  const targets: unknown[] = [];
  for (const entry of outer.targetList as unknown[]) {
    const target = object(object(entry)?.ResTarget);
    if (target == null || typeof target.name !== 'string') return null;
    if (Object.keys(target).some((key) => !['name', 'val', 'location'].includes(key)))
      return null;
    const fields = directColumn(target.val);
    if (fields == null || fields.length !== 2 || fields[0] !== alias) return null;
    const expression = bindings.get(fields[1]!);
    if (expression == null) return null;
    targets.push({ ResTarget: { name: target.name, val: expression } });
  }
  if (targets.length === 0) return null;
  return { SelectStmt: { ...inner, targetList: targets } };
}

type Rewrite = Readonly<{ ast: PostgresAstNode; step: ProjectionFusionStep }>;

function rewriteFrom(value: unknown, path: string): Rewrite | null {
  const node = object(value);
  if (node == null) return null;
  const sub = object(node.RangeSubselect);
  if (sub != null) {
    const query = object(sub.subquery);
    if (query == null || object(query.SelectStmt) == null) return null;
    const next = rewriteOnce(query, `${path}.RangeSubselect.subquery`);
    return next == null
      ? null
      : { ...next, ast: { ...node, RangeSubselect: { ...sub, subquery: next.ast } } };
  }
  const join = object(node.JoinExpr);
  if (join == null) return null;
  for (const side of ['larg', 'rarg'] as const) {
    const next = rewriteFrom(join[side], `${path}.JoinExpr.${side}`);
    if (next != null)
      return { ...next, ast: { ...node, JoinExpr: { ...join, [side]: next.ast } } };
  }
  return null;
}

function rewriteOnce(ast: PostgresAstNode, path: string): Rewrite | null {
  const select = object(ast.SelectStmt);
  if (select == null) return null;
  if (Array.isArray(select.fromClause)) {
    for (const [index, input] of select.fromClause.entries()) {
      const next = rewriteFrom(input, `${path}.SelectStmt.fromClause[${index}]`);
      if (next == null) continue;
      const fromClause = [...select.fromClause];
      fromClause[index] = next.ast;
      return { ...next, ast: { ...ast, SelectStmt: { ...select, fromClause } } };
    }
  }
  const joined = fuse(ast);
  return joined == null
    ? null
    : { ast: joined, step: { rule: 'SQLREAD1.PROJECTION_FUSION', path } };
}

/** Exactly one safe projection fusion, traversing nested FROM inputs first. */
export function fusePostgresProjectionOnce(ast: PostgresAstNode): ProjectionFusionResult {
  const rewritten = rewriteOnce(ast, '$');
  return rewritten == null
    ? { ast, steps: [] }
    : { ast: rewritten.ast, steps: [rewritten.step] };
}

/** Repeat the one-step rewrite until stable, bounded by maxSteps. */
export function fusePostgresProjections(
  ast: PostgresAstNode,
  maxSteps = 64
): ProjectionFusionResult {
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 1)
    throw new RangeError('maxSteps must be a positive safe integer.');
  let current = ast;
  const steps: ProjectionFusionStep[] = [];
  for (let index = 0; index < maxSteps; index += 1) {
    const next = fusePostgresProjectionOnce(current);
    if (next.steps.length === 0) return { ast: current, steps };
    current = next.ast;
    steps.push(next.steps[0]!);
  }
  // A limit is not a fixed point: do not return a falsely complete simplification.
  if (fusePostgresProjectionOnce(current).steps.length > 0)
    throw new RangeError('Projection fusion exceeded maxSteps before reaching a fixed point.');
  return { ast: current, steps };
}

/** Render a derived readable SQL statement without modifying the input AST. */
export async function renderFusedPostgresProjections(
  ast: PostgresAstNode
): Promise<ProjectionFusionResult & Readonly<{ sql: string }>> {
  const result = fusePostgresProjections(ast);
  return { ...result, sql: await renderPostgresAst(result.ast) };
}
