/** One compositional PostgreSQL target, driven by canonical Substrait analysis. */
import {
  deriveSubstraitSchemas,
  isSchemaTypeNullable,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgQualifiedColumnRef } from '../postgresAst.js';
import { pgRangeSubselect } from '../postgresAst.js';
import type { PostgresAstNode } from '../postgresAst.js';
import { renderPostgresAst } from '../renderPostgresAst.js';
import type { DvtPostgresOrderKey } from '../sortFetchPostgresProjection.js';

import { admitSqlSources, type SqlSource } from './admission.js';
import { producerReadSql, type ProducerSqlBinding } from './producerRead.js';
import { relationSql } from './relations.js';
import { projectSqlResult } from './resultProjection.js';
import { selectAst, unsupported, type SqlInput } from './scope.js';

export type SubstraitPostgresAstProjection = Readonly<{
  ast: PostgresAstNode;
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

export type SubstraitPostgresProjection = SubstraitPostgresAstProjection &
  Readonly<{ sql: string }>;

/** Bind a server-validated external SELECT to exactly its declared publication fields. */
export function projectExternalProducerAst(
  document: SubstraitDocument,
  ast: PostgresAstNode
): SubstraitPostgresAstProjection {
  const { index, schemas } = deriveSubstraitSchemas(document);
  const root = index.relations.get(index.rootId)!;
  const fields = schemas.get(index.rootId)!;
  if (
    !Object.hasOwn(ast, 'SelectStmt') ||
    index.relations.size !== 1 ||
    root.relation.relType.case !== 'read' ||
    root.binding.sourceRef != null ||
    root.binding.producerRef != null
  )
    return unsupported(
      'An external publication requires a leaf Read signature and a validated SELECT.'
    );
  const names = root.fields
    .filter((field) => field.parentFieldId == null)
    .sort((a, b) => a.outputOrdinal - b.outputOrdinal)
    .map((field) => field.displayName!);
  return {
    ast: selectAst([], [pgRangeSubselect(ast, 'external_model')], {
      targetList: names.map((name) => ({
        ResTarget: { name, val: pgQualifiedColumnRef('external_model', name) },
      })),
    }),
    orderBy: null,
    projection: {
      inputs: [],
      resultRelationId: index.rootId,
      outputs: fields.map((field, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        outputOrdinal,
        dataType: field.type.kind.case!,
        nullable: isSchemaTypeNullable(field.type),
      })),
    },
  };
}

export async function projectSubstraitToPostgresSql(
  document: SubstraitDocument,
  producers: ReadonlyMap<string, ProducerSqlBinding> = new Map()
): Promise<SubstraitPostgresProjection> {
  const result = projectSubstraitToPostgresAst(document, producers);
  return { ...result, sql: await renderPostgresAst(result.ast) };
}

export function projectSubstraitToPostgresAst(
  document: SubstraitDocument,
  producers: ReadonlyMap<string, ProducerSqlBinding> = new Map()
): SubstraitPostgresAstProjection {
  const analysis = deriveSubstraitSchemas(document);
  const sources = admitSqlSources(document, analysis, producers);
  const rendered = new Map<string, SqlInput>();
  for (const id of analysis.index.postorder) {
    const entry = analysis.index.relations.get(id)!;
    rendered.set(
      id,
      entry.binding.producerRef != null
        ? producerReadSql(entry, producers.get(id)!, analysis.schemas.get(id)!)
        : relationSql(
            document.plan,
            entry,
            entry.inputs.map((input) => rendered.get(input)!),
            analysis.schemas.get(id)!
          )
    );
  }
  return projectSqlResult(
    document,
    analysis.index.rootId,
    rendered.get(analysis.index.rootId)!,
    sources
  );
}
