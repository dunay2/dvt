/** One compositional PostgreSQL target, driven by canonical Substrait analysis. */
import {
  deriveSubstraitSchemas,
  isSchemaTypeNullable,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgQualifiedColumnRef } from '../postgresAst.js';
import type { PostgresAstNode } from '../postgresAst.js';
import { renderPostgresAst } from '../renderPostgresAst.js';
import type { DvtPostgresOrderKey } from '../sortFetchPostgresProjection.js';

import { admitSqlSources, type SqlSource } from './admission.js';
import { sortAst } from './ordering.js';
import { relationSql } from './relations.js';
import { columnName, inputRange, selectAst, unsupported, type SqlInput } from './scope.js';

export type SubstraitPostgresProjection = Readonly<{
  ast: PostgresAstNode;
  sql: string;
  orderBy: readonly DvtPostgresOrderKey[] | null;
  projection: Readonly<{
    inputs: readonly SqlSource[];
    resultRelationId: string;
    outputs: readonly Readonly<{
      name: string;
      outputOrdinal: number;
      dataType: string;
      nullable: boolean;
    }>[];
  }>;
}>;

export async function projectSubstraitToPostgresSql(
  document: SubstraitDocument
): Promise<SubstraitPostgresProjection> {
  const analysis = deriveSubstraitSchemas(document);
  const sources = admitSqlSources(document, analysis);
  const rendered = new Map<string, SqlInput>();
  for (const id of analysis.index.postorder) {
    const entry = analysis.index.relations.get(id)!;
    rendered.set(
      id,
      relationSql(
        document.plan,
        entry,
        entry.inputs.map((input) => rendered.get(input)!),
        analysis.schemas.get(id)!
      )
    );
  }
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root') return unsupported('Root relation is absent.');
  const result = rendered.get(analysis.index.rootId)!;
  const names = root.value.names;
  if (
    names.some((name) => name.length === 0 || name !== name.trim()) ||
    new Set(names).size !== names.length
  )
    return unsupported('Root outputs require unique non-blank names.');
  const ast = selectAst([], [inputRange(result, 'result')], {
    targetList: names.map((name, ordinal) => ({
      ResTarget: { name, val: pgQualifiedColumnRef('result', columnName(ordinal)) },
    })),
    ...(result.orderBy.length === 0
      ? {}
      : {
          sortClause: result.orderBy.map((key) =>
            sortAst(pgQualifiedColumnRef('result', key.name), key)
          ),
        }),
  });
  const publicOrder = result.orderBy.map((key) => ({
    ...key,
    name: /^c\d+$/.test(key.name) ? names[Number(key.name.slice(1))] : undefined,
  }));
  return {
    ast,
    sql: await renderPostgresAst(ast),
    orderBy:
      publicOrder.length > 0 && publicOrder.every((key) => key.name != null)
        ? publicOrder.map((key) => ({ ...key, name: key.name! }))
        : null,
    projection: {
      inputs: sources,
      resultRelationId: analysis.index.rootId,
      outputs: result.fields.map((field, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        outputOrdinal,
        dataType: field.type.kind.case === 'unbound' ? 'unknown' : field.type.kind.case!,
        nullable: isSchemaTypeNullable(field.type),
      })),
    },
  };
}
