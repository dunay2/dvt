/** Translate verified physical and Model SQL syntax into the existing logical input namespace. */
import type { PostgresAstNode } from '@dvt/postgres-projection';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

import { parsePostgresTransformSqlStructure } from './postgresTransformSqlPolicy.js';
import {
  mapWorksheetAst as mapAst,
  worksheetAstObject as object,
  worksheetSyntaxIdentity as syntaxIdentity,
  type WorksheetAstObject as AstObject,
} from './worksheetCanvasModelAst.js';
import { readWorksheetSqlRelation as readRelation } from './worksheetCanvasModelSqlBindings.js';

export type WorksheetSqlModel = Readonly<{ alias: string; sql: string; sqlName: string }>;
export type WorksheetSqlRelation = Readonly<{
  key: string;
  catalog?: string;
  schema?: string;
  name: string;
}>;
export type InspectedWorksheetSql = Readonly<{
  ast: PostgresAstNode;
  relations: readonly WorksheetSqlRelation[];
  modelRanges: ReadonlySet<AstObject>;
}>;

async function selectAst(sql: string): Promise<PostgresAstNode> {
  const parsed = await parsePostgresTransformSqlStructure(sql);
  if (parsed.status !== 'valid') throw new CanvasModelSqlUnavailableError('unsupported_sql');
  return parsed.ast;
}

type ModelSyntaxState = Readonly<{
  models: ReadonlyMap<string, WorksheetSqlModel & { identity: string }>;
  seen: Set<string>;
  ranges: Set<AstObject>;
}>;

function replaceObservedModel(node: AstObject, state: ModelSyntaxState): AstObject | undefined {
  const subquery = object(node.RangeSubselect);
  if (subquery == null) return;
  const alias = object(subquery.alias)?.aliasname;
  if (typeof alias !== 'string') return;
  const model = state.models.get(alias);
  if (model == null) return;
  assertObservedModelUnchanged(subquery, alias, state, model.identity);
  state.seen.add(alias);
  const range = {
    RangeVar: {
      relname: model.sqlName,
      inh: true,
      relpersistence: 'p',
      alias: { aliasname: alias },
    },
  };
  state.ranges.add(range);
  return range;
}

function assertObservedModelUnchanged(
  subquery: AstObject,
  alias: string,
  state: ModelSyntaxState,
  identity: string
) {
  if (state.seen.has(alias)) throw new CanvasModelSqlUnavailableError('stale_context');
  if (subquery.lateral === true) throw new CanvasModelSqlUnavailableError('stale_context');
  if (syntaxIdentity(subquery.subquery) !== identity)
    throw new CanvasModelSqlUnavailableError('stale_context');
}

function collectWorksheetRelations(ast: PostgresAstNode, modelRanges: ReadonlySet<AstObject>) {
  const relations = new Map<string, WorksheetSqlRelation>();
  mapAst(ast, (node) => {
    if (modelRanges.has(node)) return node;
    if (node.WithClause != null) throw new CanvasModelSqlUnavailableError('unsupported_sql');
    const range = object(node.RangeVar);
    if (range == null) return;
    const relation = readRelation(range);
    relations.set(relation.key, relation);
  });
  if (relations.size > 128) throw new CanvasModelSqlUnavailableError('unsupported_sql');
  return [...relations.values()];
}

export async function inspectWorksheetModelSql(
  sql: string,
  models: readonly WorksheetSqlModel[]
): Promise<InspectedWorksheetSql> {
  const modelByAlias = new Map(
    await Promise.all(
      models.map(
        async (model) =>
          [model.alias, { ...model, identity: syntaxIdentity(await selectAst(model.sql)) }] as const
      )
    )
  );
  const seen = new Set<string>();
  const modelRanges = new Set<AstObject>();
  const state = { models: modelByAlias, seen, ranges: modelRanges };
  const ast = mapAst(await selectAst(sql), (node) =>
    replaceObservedModel(node, state)
  ) as PostgresAstNode;
  if (seen.size !== models.length) throw new CanvasModelSqlUnavailableError('stale_context');
  return { ast, relations: collectWorksheetRelations(ast, modelRanges), modelRanges };
}
