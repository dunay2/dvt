/** Lower a validated consumer input against a producer result, not a copied semantic tree. */
import {
  resolveProducerInput,
  type IndexedRelation,
  type SchemaField,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgQualifiedColumnRef, pgRangeSubselect } from '../postgresAst.js';

import type { SubstraitPostgresProjection } from './project.js';
import { columnName, selectAst, type SqlInput } from './scope.js';

export type ProducerSqlBinding = Readonly<{
  document: SubstraitDocument;
  projection: SubstraitPostgresProjection;
}>;

export function producerReadSql(
  entry: IndexedRelation,
  binding: ProducerSqlBinding,
  fields: readonly SchemaField[]
): SqlInput {
  const resolved = resolveProducerInput(entry, binding.document);
  const names = resolved.fields.map(
    (field) => binding.projection.projection.outputs[field.outputOrdinal]!.name
  );
  const targetList = names.map((name, ordinal) => ({
    ResTarget: { name: columnName(ordinal), val: pgQualifiedColumnRef('producer', name) },
  }));
  const orderBy = (binding.projection.orderBy ?? []).map((key, index) => {
    const ordinal = names.indexOf(key.name);
    const name = ordinal < 0 ? `o${index}` : columnName(ordinal);
    if (ordinal < 0)
      targetList.push({ ResTarget: { name, val: pgQualifiedColumnRef('producer', key.name) } });
    return { ...key, name };
  });
  return {
    ast: selectAst([], [pgRangeSubselect(binding.projection.ast, 'producer')], { targetList }),
    fields,
    orderBy,
  };
}
