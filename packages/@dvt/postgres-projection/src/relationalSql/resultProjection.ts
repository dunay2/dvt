/** Publish canonical root names and ordering for physical and logical SQL targets. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';
import { isSchemaTypeNullable, type SubstraitDocument } from '@dvt/substrait-analysis';

import { pgQualifiedColumnRef } from '../postgresAst.js';

import { sortAst } from './ordering.js';
import type { SubstraitPostgresAstProjection } from './project.js';
import { columnName, inputRange, selectAst, unsupported, type SqlInput } from './scope.js';

export function projectSqlResult(
  document: SubstraitDocument,
  rootId: string,
  result: SqlInput,
  inputs: SubstraitPostgresAstProjection['projection']['inputs'] = []
): SubstraitPostgresAstProjection {
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root') return unsupported('Root relation is absent.');
  const names = root.value.names;
  if (
    names.some((name) => !PostgresIdentifierV1Schema.safeParse(name).success) ||
    new Set(names).size !== names.length
  )
    return unsupported('Root outputs require unique PostgreSQL identifiers.');
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
  const order = result.orderBy.map((key) => ({
    ...key,
    name: /^c\d+$/.test(key.name) ? names[Number(key.name.slice(1))] : undefined,
  }));
  return {
    ast,
    orderBy:
      order.length > 0 && order.every((key) => key.name != null)
        ? order.map((key) => ({ ...key, name: key.name! }))
        : null,
    projection: {
      inputs,
      resultRelationId: rootId,
      outputs: result.fields.map((field, outputOrdinal) => ({
        name: names[outputOrdinal]!,
        outputOrdinal,
        dataType: field.type.kind.case === 'unbound' ? 'unknown' : field.type.kind.case!,
        nullable: isSchemaTypeNullable(field.type),
      })),
    },
  };
}
