/**
 * Owned concern: admit PostgreSQL syntax and bind every scalar reference in its lexical scope.
 * @baseline ADR-0064: SQL syntax is derived; canonical/native admission supplies source meaning.
 * @decision Resolve the whole bounded candidate once before any presentation rewrite.
 * @consequence Unknown or unsupported syntax cannot be pruned into an apparently valid query.
 * @version 1.0.0
 */
import type { PostgresAstNode } from '../postgresAst.js';

export type SqlObject = Readonly<Record<string, unknown>>;
export type SqlPath = readonly (string | number)[];
export type SqlDiagnostic = Readonly<{ code: string; path: string; message: string }>;
export type SqlResolutionInput = Readonly<{
  resolvedColumns: readonly Readonly<{
    schema: string;
    table: string;
    columns: readonly string[];
  }>[];
  scalarSemantics?: 'pg_catalog';
}>;
export type SqlResolution = Readonly<{
  sources: ReadonlyMap<string, ReadonlySet<string>>;
  scalarSemantics: boolean;
}>;
export type SqlReference = Readonly<{ input: SqlInput; column: string }>;
export type SqlTarget = Readonly<{
  name: string;
  target: SqlObject;
  value: PostgresAstNode;
  reference: SqlReference;
}>;
export type SqlInput = Readonly<{
  alias: string;
  columns: ReadonlySet<string>;
  node: PostgresAstNode;
  range: SqlObject;
  path: SqlPath;
  select?: SqlSelect;
}>;
export type SqlSelect = Readonly<{
  ast: PostgresAstNode;
  statement: SqlObject;
  path: SqlPath;
  targets: readonly SqlTarget[];
  outputs: ReadonlyMap<string, SqlTarget>;
  inputs: readonly SqlInput[];
  references: ReadonlyMap<PostgresAstNode, SqlReference>;
  joins: readonly Readonly<{ path: SqlPath; payload: SqlObject }>[];
  where?: PostgresAstNode;
}>;

export class SqlAdmissionError extends Error {
  constructor(readonly diagnostic: SqlDiagnostic) {
    super(diagnostic.message);
  }
}

export function sqlPath(path: SqlPath): string {
  return '$' + path.map((part) => (typeof part === 'number' ? `[${part}]` : `.${part}`)).join('');
}

function reject(code: string, path: SqlPath, message: string): never {
  throw new SqlAdmissionError({ code, path: sqlPath(path), message });
}

export function sqlObject(value: unknown): SqlObject | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as SqlObject)
    : undefined;
}

function objectAt(value: unknown, path: SqlPath): SqlObject {
  return (
    sqlObject(value) ?? reject('unsupported_shape', path, 'Expected a PostgreSQL syntax node.')
  );
}

function keys(node: SqlObject, allowed: readonly string[], path: SqlPath): void {
  if (Object.keys(node).some((key) => !allowed.includes(key))) {
    reject('unsupported_shape', path, 'Syntax outside the admitted PostgreSQL profile.');
  }
}

function arrayAt(value: unknown, path: SqlPath): readonly unknown[] {
  if (!Array.isArray(value)) reject('unsupported_shape', path, 'Expected a syntax list.');
  if (value.length > 10000)
    reject('resolution_limit', path, 'Syntax list exceeds its bounded profile.');
  return value;
}

function nameAt(value: unknown, path: SqlPath): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) {
    reject('unsupported_shape', path, 'A bounded SQL name is required.');
  }
  return value;
}

function stringAt(value: unknown, path: SqlPath): string {
  const wrapper = objectAt(value, path);
  keys(wrapper, ['String'], path);
  const string = objectAt(wrapper['String'], path);
  keys(string, ['sval'], path);
  return nameAt(string['sval'], path);
}

function relationKey(schema: string, table: string): string {
  return JSON.stringify([schema, table]);
}

export function compileSqlResolution(context?: SqlResolutionInput): SqlResolution {
  if (context == null || !Array.isArray(context.resolvedColumns)) {
    reject('missing_resolution', [], 'Resolved scalar columns are required before simplification.');
  }
  const sources = new Map<string, ReadonlySet<string>>();
  let count = 0;
  for (const source of context.resolvedColumns) {
    if (
      source == null ||
      typeof source.schema !== 'string' ||
      typeof source.table !== 'string' ||
      source.schema.length === 0 ||
      source.table.length === 0 ||
      !Array.isArray(source.columns) ||
      source.columns.length === 0
    ) {
      reject(
        'invalid_resolution',
        [],
        'A resolved schema, table and scalar column list are required.'
      );
    }
    const key = relationKey(source.schema, source.table);
    const columns = new Set<string>();
    for (const column of source.columns) {
      if (
        typeof column !== 'string' ||
        column.length === 0 ||
        column.length > 1024 ||
        columns.has(column)
      ) {
        reject('invalid_resolution', [], 'Scalar column evidence must be unambiguous.');
      }
      if (++count > 10000) reject('resolution_limit', [], 'Resolution evidence exceeds its bound.');
      columns.add(column);
    }
    if (sources.has(key))
      reject('invalid_resolution', [], 'A relation has duplicate resolution evidence.');
    sources.set(key, columns);
  }
  if (context.scalarSemantics !== undefined && context.scalarSemantics !== 'pg_catalog') {
    reject('invalid_resolution', [], 'Unknown scalar resolution profile.');
  }
  return { sources, scalarSemantics: context.scalarSemantics === 'pg_catalog' };
}

function inputScope(inputs: readonly SqlInput[], path: SqlPath): ReadonlyMap<string, SqlInput> {
  const scope = new Map<string, SqlInput>();
  for (const input of inputs) {
    if (scope.has(input.alias))
      reject('duplicate_binding', path, 'Input aliases collide in one scope.');
    scope.set(input.alias, input);
  }
  return scope;
}

type Scope = ReadonlyMap<string, SqlInput>;
type References = Map<PostgresAstNode, SqlReference>;
type FromView = Readonly<{ inputs: readonly SqlInput[]; joins: SqlSelect['joins'] }>;
const comparisons = new Set(['=', '<>', '!=', '<', '<=', '>', '>=']);
const literalTypes = new Set(['bigint', 'int8', 'float8', 'text', 'boolean', 'bool']);

class SqlAdmission {
  private nodes = 0;
  private readonly active = new WeakSet<object>();
  readonly selects: SqlSelect[] = [];

  constructor(private readonly resolution: SqlResolution) {}

  private visit<T>(value: unknown, path: SqlPath, depth: number, read: (node: SqlObject) => T): T {
    const node = objectAt(value, path);
    if (depth > 64 || ++this.nodes > 10000 || this.active.has(node)) {
      reject('resolution_limit', path, 'Cyclic or over-budget PostgreSQL syntax is retained.');
    }
    this.active.add(node);
    try {
      return read(node);
    } finally {
      this.active.delete(node);
    }
  }

  private alias(value: unknown, fallback: string | undefined, path: SqlPath): string {
    if (value === undefined)
      return fallback ?? reject('unsupported_shape', path, 'Subquery alias is required.');
    const alias = objectAt(value, path);
    keys(alias, ['aliasname'], path);
    return nameAt(alias['aliasname'], path);
  }

  private from(
    value: unknown,
    path: SqlPath,
    queryPath: SqlPath,
    refs: References,
    depth: number
  ): FromView {
    const full = [...queryPath, 'SelectStmt', ...path];
    return this.visit(value, full, depth, (node) => {
      if (node['RangeVar'] !== undefined) {
        keys(node, ['RangeVar'], full);
        const range = objectAt(node['RangeVar'], full);
        keys(range, ['schemaname', 'relname', 'alias', 'inh', 'relpersistence', 'location'], full);
        const schema = nameAt(range['schemaname'], full);
        const table = nameAt(range['relname'], full);
        const columns = this.resolution.sources.get(relationKey(schema, table));
        if (columns === undefined)
          reject(
            'unknown_reference',
            full,
            'The physical input has no scalar resolution evidence.'
          );
        if (
          (range['inh'] !== undefined && typeof range['inh'] !== 'boolean') ||
          (range['relpersistence'] !== undefined && range['relpersistence'] !== 'p')
        ) {
          reject('unsupported_shape', full, 'Unsupported physical range metadata.');
        }
        return {
          inputs: [{ alias: this.alias(range['alias'], table, full), columns, node, range, path }],
          joins: [],
        };
      }
      if (node['RangeSubselect'] !== undefined) {
        keys(node, ['RangeSubselect'], full);
        const range = objectAt(node['RangeSubselect'], full);
        keys(range, ['subquery', 'alias', 'lateral'], full);
        if (range['lateral'] !== undefined && range['lateral'] !== false) {
          reject('unsupported_shape', full, 'LATERAL is outside the admitted profile.');
        }
        const alias = this.alias(range['alias'], undefined, full);
        const select = this.select(
          range['subquery'],
          [...full, 'RangeSubselect', 'subquery'],
          depth + 1
        );
        return {
          inputs: [{ alias, columns: new Set(select.outputs.keys()), node, range, path, select }],
          joins: [],
        };
      }
      keys(node, ['JoinExpr'], full);
      const join = objectAt(node['JoinExpr'], full);
      keys(
        join,
        [
          'jointype',
          'isNatural',
          'larg',
          'rarg',
          'usingClause',
          'join_using_alias',
          'quals',
          'alias',
          'rtindex',
        ],
        full
      );
      if (
        join['jointype'] !== 'JOIN_INNER' ||
        (join['isNatural'] !== undefined && join['isNatural'] !== false) ||
        (join['usingClause'] !== undefined &&
          (!Array.isArray(join['usingClause']) || join['usingClause'].length !== 0)) ||
        join['join_using_alias'] != null ||
        join['alias'] != null ||
        (join['rtindex'] !== undefined && join['rtindex'] !== 0)
      ) {
        reject(
          'unsupported_shape',
          full,
          'Only explicit unaliased INNER/CROSS joins are admitted.'
        );
      }
      const left = this.from(
        join['larg'],
        [...path, 'JoinExpr', 'larg'],
        queryPath,
        refs,
        depth + 1
      );
      const right = this.from(
        join['rarg'],
        [...path, 'JoinExpr', 'rarg'],
        queryPath,
        refs,
        depth + 1
      );
      const inputs = [...left.inputs, ...right.inputs];
      const scope = inputScope(inputs, full);
      if (join['quals'] !== undefined)
        this.predicate(join['quals'], scope, refs, [...full, 'JoinExpr', 'quals'], depth + 1);
      return {
        inputs,
        joins: [...left.joins, ...right.joins, { path: [...path, 'JoinExpr'], payload: join }],
      };
    });
  }

  private column(
    value: unknown,
    scope: Scope,
    refs: References,
    path: SqlPath,
    depth: number
  ): SqlReference {
    return this.visit(value, path, depth, (node) => {
      keys(node, ['ColumnRef'], path);
      const column = objectAt(node['ColumnRef'], path);
      keys(column, ['fields', 'location'], path);
      const fields = arrayAt(column['fields'], path).map((field) => stringAt(field, path));
      if (fields.length < 1 || fields.length > 2)
        reject('unsupported_shape', path, 'Only scalar column references are admitted.');
      const name = fields[fields.length - 1];
      if (name === undefined) reject('unknown_reference', path, 'Column name is absent.');
      const candidates =
        fields.length === 2
          ? [...scope.values()].filter(
              (input) => input.alias === fields[0] && input.columns.has(name)
            )
          : [...scope.values()].filter((input) => input.columns.has(name));
      if (candidates.length > 1)
        reject('ambiguous_reference', path, 'Column reference has multiple input owners.');
      const input = candidates[0];
      if (input === undefined)
        reject('unknown_reference', path, 'Unknown, external or whole-row reference.');
      const reference = { input, column: name };
      refs.set(node, reference);
      return reference;
    });
  }

  private literal(payload: unknown, path: SqlPath): 'value' | 'boolean' {
    const value = objectAt(payload, path);
    keys(value, ['isnull', 'ival', 'fval', 'sval', 'boolval', 'location'], path);
    const present = ['ival', 'fval', 'sval', 'boolval'].filter((key) => value[key] !== undefined);
    if (value['isnull'] === true && present.length === 0) return 'boolean';
    if ((value['isnull'] !== undefined && value['isnull'] !== false) || present.length !== 1) {
      reject('unsupported_shape', path, 'Malformed scalar literal.');
    }
    const kind = present[0];
    if (kind === undefined) reject('unsupported_shape', path, 'Literal value is absent.');
    const inner = objectAt(value[kind], path);
    keys(inner, [kind], path);
    // libpg-query omits protobuf scalar defaults inside the selected literal arm.
    const scalar = inner[kind] ?? (kind === 'ival' ? 0 : kind === 'boolval' ? false : undefined);
    const valid =
      kind === 'ival'
        ? (typeof scalar === 'number' && Number.isSafeInteger(scalar)) ||
          (typeof scalar === 'bigint' &&
            scalar >= -9223372036854775808n &&
            scalar <= 9223372036854775807n)
        : kind === 'fval'
          ? typeof scalar === 'string' &&
            /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(scalar)
          : kind === 'sval'
            ? typeof scalar === 'string'
            : typeof scalar === 'boolean';
    if (!valid) reject('unsupported_shape', path, 'Unsupported scalar literal.');
    return kind === 'boolval' ? 'boolean' : 'value';
  }

  private scalar(
    value: unknown,
    scope: Scope,
    refs: References,
    path: SqlPath,
    depth: number
  ): void {
    const object = objectAt(value, path);
    if (object['ColumnRef'] !== undefined) {
      this.column(value, scope, refs, path, depth);
      return;
    }
    this.visit(value, path, depth, (node) => {
      if (node['A_Const'] !== undefined) {
        keys(node, ['A_Const'], path);
        this.literal(node['A_Const'], path);
        return;
      }
      keys(node, ['TypeCast'], path);
      const cast = objectAt(node['TypeCast'], path);
      keys(cast, ['arg', 'typeName', 'location'], path);
      if (!this.resolution.scalarSemantics)
        reject('missing_resolution', path, 'Literal casts require native builtin resolution.');
      const type = objectAt(cast['typeName'], path);
      keys(type, ['names', 'typemod', 'location'], path);
      const names = arrayAt(type['names'], path).map((part) => stringAt(part, path));
      const name = names[names.length - 1];
      if (
        name === undefined ||
        !literalTypes.has(name) ||
        names.length > 2 ||
        (names.length === 2 && names[0] !== 'pg_catalog') ||
        (type['typemod'] !== undefined && type['typemod'] !== -1)
      ) {
        reject('unsupported_shape', path, 'Only builtin scalar literal casts are admitted.');
      }
      this.visit(cast['arg'], [...path, 'TypeCast', 'arg'], depth + 1, (argument) => {
        keys(argument, ['A_Const'], path);
        this.literal(argument['A_Const'], path);
      });
    });
  }

  private predicate(
    value: unknown,
    scope: Scope,
    refs: References,
    path: SqlPath,
    depth: number
  ): void {
    this.visit(value, path, depth, (node) => {
      if (node['A_Expr'] !== undefined) {
        keys(node, ['A_Expr'], path);
        const expr = objectAt(node['A_Expr'], path);
        keys(expr, ['kind', 'name', 'lexpr', 'rexpr', 'location'], path);
        if (!this.resolution.scalarSemantics)
          reject(
            'missing_resolution',
            path,
            'Comparisons require native builtin scalar resolution.'
          );
        const names = arrayAt(expr['name'], path).map((part) => stringAt(part, path));
        if (
          expr['kind'] !== 'AEXPR_OP' ||
          names.length < 1 ||
          names.length > 2 ||
          !comparisons.has(names[names.length - 1] ?? '') ||
          (names.length === 2 && names[0] !== 'pg_catalog')
        ) {
          reject(
            'unsupported_shape',
            path,
            'Only resolved builtin scalar comparisons are admitted.'
          );
        }
        this.scalar(expr['lexpr'], scope, refs, [...path, 'A_Expr', 'lexpr'], depth + 1);
        this.scalar(expr['rexpr'], scope, refs, [...path, 'A_Expr', 'rexpr'], depth + 1);
        return;
      }
      if (node['BoolExpr'] !== undefined) {
        keys(node, ['BoolExpr'], path);
        const expr = objectAt(node['BoolExpr'], path);
        keys(expr, ['boolop', 'args', 'location'], path);
        const args = arrayAt(expr['args'], path);
        if (
          !(expr['boolop'] === 'NOT_EXPR'
            ? args.length === 1
            : ['AND_EXPR', 'OR_EXPR'].includes(String(expr['boolop'])) && args.length >= 2)
        ) {
          reject('unsupported_shape', path, 'Unsupported Boolean syntax.');
        }
        args.forEach((arg, index) =>
          this.predicate(arg, scope, refs, [...path, 'BoolExpr', 'args', index], depth + 1)
        );
        return;
      }
      if (node['NullTest'] !== undefined) {
        keys(node, ['NullTest'], path);
        const test = objectAt(node['NullTest'], path);
        keys(test, ['arg', 'nulltesttype', 'argisrow', 'location'], path);
        if (
          !['IS_NULL', 'IS_NOT_NULL'].includes(String(test['nulltesttype'])) ||
          (test['argisrow'] !== undefined && test['argisrow'] !== false)
        ) {
          reject('unsupported_shape', path, 'Whole-row null tests are not scalar tests.');
        }
        this.scalar(test['arg'], scope, refs, [...path, 'NullTest', 'arg'], depth + 1);
        return;
      }
      keys(node, ['A_Const'], path);
      if (this.literal(node['A_Const'], path) !== 'boolean')
        reject('unsupported_shape', path, 'Predicate must be Boolean.');
    });
  }

  select(value: unknown, path: SqlPath, depth: number): SqlSelect {
    return this.visit(value, path, depth, (ast) => {
      keys(ast, ['SelectStmt'], path);
      const statement = objectAt(ast['SelectStmt'], path);
      keys(
        statement,
        ['targetList', 'fromClause', 'whereClause', 'op', 'limitOption', 'all'],
        path
      );
      if (
        (statement['op'] !== undefined && statement['op'] !== 'SETOP_NONE') ||
        (statement['limitOption'] !== undefined &&
          statement['limitOption'] !== 'LIMIT_OPTION_DEFAULT') ||
        (statement['all'] !== undefined && statement['all'] !== false)
      ) {
        reject('unsupported_shape', path, 'Semantic SELECT barriers are retained.');
      }
      const references: References = new Map();
      const from = arrayAt(statement['fromClause'], path).map((input, index) =>
        this.from(input, ['fromClause', index], path, references, depth + 1)
      );
      if (from.length === 0) reject('unsupported_shape', path, 'A resolved input is required.');
      const inputs = from.flatMap((item) => item.inputs);
      const scope = inputScope(inputs, path);
      const outputs = new Map<string, SqlTarget>();
      const targets = arrayAt(statement['targetList'], path).map((value, index) => {
        const targetPath = [...path, 'SelectStmt', 'targetList', index];
        const node = objectAt(value, targetPath);
        keys(node, ['ResTarget'], targetPath);
        const target = objectAt(node['ResTarget'], targetPath);
        keys(target, ['name', 'val', 'location'], targetPath);
        const reference = this.column(
          target['val'],
          scope,
          references,
          [...targetPath, 'ResTarget', 'val'],
          depth + 1
        );
        const name =
          target['name'] === undefined ? reference.column : nameAt(target['name'], targetPath);
        if (outputs.has(name))
          reject('duplicate_binding', targetPath, 'Output names must be unambiguous.');
        const result = { name, target, value: objectAt(target['val'], targetPath), reference };
        outputs.set(name, result);
        return result;
      });
      if (targets.length === 0) reject('unsupported_shape', path, 'A scalar output is required.');
      const where = statement['whereClause'];
      if (where !== undefined)
        this.predicate(where, scope, references, [...path, 'SelectStmt', 'whereClause'], depth + 1);
      const select: SqlSelect = {
        ast,
        statement,
        path,
        targets,
        outputs,
        inputs,
        references,
        joins: from.flatMap((item) => item.joins),
        ...(where === undefined ? {} : { where: objectAt(where, path) }),
      };
      this.selects.push(select);
      return select;
    });
  }
}

export function admitSqlAst(ast: PostgresAstNode, resolution: SqlResolution): readonly SqlSelect[] {
  const admission = new SqlAdmission(resolution);
  admission.select(ast, [], 0);
  return admission.selects;
}
