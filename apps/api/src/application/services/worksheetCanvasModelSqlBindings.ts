/** Rebind verified SQL identifiers to the current prepared logical namespace. */
import { deparse } from 'pgsql-deparser';
import { z } from 'zod';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

import {
  mapWorksheetAst as mapAst,
  worksheetAstObject as object,
  type WorksheetAstObject as AstObject,
} from './worksheetCanvasModelAst.js';
import type { InspectedWorksheetSql, WorksheetSqlRelation } from './worksheetCanvasModelSql.js';

const RelationSyntaxSchema = z
  .object({
    relname: z.string().min(1),
    catalogname: z.string().optional(),
    schemaname: z.string().optional(),
    inh: z.literal(true).optional(),
  })
  .passthrough();

export function readWorksheetSqlRelation(range: AstObject): WorksheetSqlRelation {
  const parsed = RelationSyntaxSchema.safeParse(range);
  if (!parsed.success) throw new CanvasModelSqlUnavailableError('unknown_input');
  const { catalogname: catalog, schemaname: schema, relname: name } = parsed.data;
  return {
    key: JSON.stringify([catalog ?? null, schema ?? null, name]),
    ...(catalog == null ? {} : { catalog }),
    ...(schema == null ? {} : { schema }),
    name,
  };
}

function bindRange(node: AstObject, names: ReadonlyMap<string, string>): AstObject | undefined {
  const range = object(node.RangeVar);
  if (range == null) return;
  const relation = readWorksheetSqlRelation(range);
  const sqlName = names.get(relation.key);
  if (sqlName == null) throw new CanvasModelSqlUnavailableError('unknown_input');
  const { catalogname: _catalog, schemaname: _schema, ...rest } = range;
  return {
    RangeVar: { ...rest, relname: sqlName, alias: range.alias ?? { aliasname: relation.name } },
  };
}

function bindColumn(
  node: AstObject,
  relations: readonly WorksheetSqlRelation[]
): AstObject | undefined {
  const column = object(node.ColumnRef);
  if (!Array.isArray(column?.fields) || column.fields.length < 3) return;
  const parts = column.fields.map(worksheetColumnIdentifier);
  const key = JSON.stringify(parts.slice(0, -1));
  const matches = relations.filter(
    (relation) =>
      JSON.stringify(
        parts.length === 3
          ? [relation.schema, relation.name]
          : [relation.catalog, relation.schema, relation.name]
      ) === key
  );
  if (matches.length !== 1) throw new CanvasModelSqlUnavailableError('ambiguous_reference');
  return { ColumnRef: { ...column, fields: column.fields.slice(-2) } };
}

function worksheetColumnIdentifier(field: unknown) {
  const parsed = z.object({ String: z.object({ sval: z.string() }) }).safeParse(field);
  return parsed.success ? parsed.data.String.sval : undefined;
}

export async function bindWorksheetModelSql(
  parsed: InspectedWorksheetSql,
  names: ReadonlyMap<string, string>,
  modelNames: ReadonlyMap<string, string> = new Map()
): Promise<string> {
  const ast = mapAst(parsed.ast, (node) => {
    if (!parsed.modelRanges.has(node))
      return bindRange(node, names) ?? bindColumn(node, parsed.relations);
    const range = object(node.RangeVar)!;
    const alias = object(range.alias)?.aliasname;
    return {
      RangeVar: {
        ...range,
        relname:
          typeof alias === 'string' ? (modelNames.get(alias) ?? range.relname) : range.relname,
      },
    };
  });
  return deparse({ stmts: [{ stmt: ast }] } as Parameters<typeof deparse>[0]);
}
