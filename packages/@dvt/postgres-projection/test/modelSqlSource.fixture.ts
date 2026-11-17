/** SQL syntax fixtures use the established PostgreSQL AST builders and real canonical types. */
import type { Type } from '@buf/substrait_substrait.bufbuild_es/substrait/type_pb.js';
import {
  deriveSubstraitSchemas,
  type IndexedRelation,
  type SubstraitDocument,
} from '@dvt/substrait-analysis';

import { pgColumnRef, pgRangeVar, pgString, type PostgresAstNode } from '../src/postgresAst.js';
import { sourceFieldType } from '../src/postgresInputType.js';
import type { ModelSqlSourceContext } from '../src/sqlSource/context.js';

export const sqlField = (name: string): PostgresAstNode => pgColumnRef(name);
export const sqlTarget = (value: PostgresAstNode, name?: string): PostgresAstNode => ({
  ResTarget: { val: value, ...(name == null ? {} : { name }) },
});
export const sqlStar = (qualifier?: string): PostgresAstNode => ({
  ColumnRef: { fields: [...(qualifier == null ? [] : [pgString(qualifier)]), { A_Star: {} }] },
});
export function sqlSelect(
  targets: readonly PostgresAstNode[],
  from = [pgRangeVar({ table: 'client' })],
  clauses: PostgresAstNode = {}
): PostgresAstNode {
  return { SelectStmt: { op: 'SETOP_NONE', targetList: targets, fromClause: from, ...clauses } };
}

export function modelSqlContext(): ModelSqlSourceContext {
  const physical = (
    table: string,
    columns: readonly Readonly<{ id: string; name: string; type: Type }>[]
  ): ModelSqlSourceContext['inputs'][number] => ({
    nodeId: table + '-node',
    sqlName: table,
    columns,
    source: {
      names: ['public', table],
      sourceRef: {
        schemaVersion: 'connected-source-ref.v1' as const,
        connectionRef: {
          schemaVersion: 'connection-ref.v1' as const,
          connectionId: 'warehouse',
          provider: 'postgres',
        },
        sourceObjectId: 'relation/database/public/' + table,
      },
    },
  });
  return {
    inputs: [
      physical('client', [
        { id: 'client_id', name: 'client_id', type: sourceFieldType('string', false) },
        { id: 'country', name: 'country', type: sourceFieldType('string', true) },
      ]),
      physical('orders', [
        { id: 'client_id', name: 'client_id', type: sourceFieldType('string', false) },
        { id: 'order_id', name: 'order_id', type: sourceFieldType('i64', false) },
        { id: 'amount', name: 'amount', type: sourceFieldType('fp64', true) },
      ]),
    ],
  };
}

export const rootFields = (document: SubstraitDocument): SubstraitDocument['sidecar']['fields'] => {
  const { index } = deriveSubstraitSchemas(document);
  return index.relations.get(index.rootId)!.fields;
};
export const firstRead = (document: SubstraitDocument): IndexedRelation =>
  [...deriveSubstraitSchemas(document).index.relations.values()].find(
    (entry) => entry.relation.relType.case === 'read'
  )!;
