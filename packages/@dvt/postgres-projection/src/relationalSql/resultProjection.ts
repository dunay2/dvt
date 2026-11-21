/** Publish canonical root names and ordering for physical and logical SQL targets. */
import { PostgresIdentifierV1Schema } from '@dvt/contracts';
import { isSchemaTypeNullable, type SubstraitDocument } from '@dvt/substrait-analysis';

import { pgQualifiedColumnRef } from '../postgresAst.js';

import { sortAst } from './ordering.js';
import type { SubstraitPostgresAstProjection } from './project.js';
import { columnName, inputRange, selectAst, unsupported, type SqlInput } from './scope.js';

function aliasSelectedOutputNames(names: readonly string[]): readonly string[] {
  const reserved = new Set(names);
  const nextSuffix = new Map<string, number>();
  return names.map((name, ordinal) => {
    let suffix = nextSuffix.get(name);
    if (suffix == null) {
      nextSuffix.set(name, 2);
      return name;
    }
    let alias: string;
    do {
      const numbered = `${name}_${suffix}`;
      alias = PostgresIdentifierV1Schema.safeParse(numbered).success
        ? numbered
        : `column_${ordinal + 1}_${suffix}`;
      suffix += 1;
    } while (reserved.has(alias));
    nextSuffix.set(name, suffix);
    reserved.add(alias);
    return alias;
  });
}

export function projectSqlResult(
  document: SubstraitDocument,
  rootId: string,
  result: SqlInput,
  inputs: SubstraitPostgresAstProjection['projection']['inputs'] = [],
  resultMode: 'publication' | 'selected-relation' = 'publication'
): SubstraitPostgresAstProjection {
  const root = document.plan.relations[0]!.relType;
  if (root.case !== 'root') return unsupported('Root relation is absent.');
  const declaredNames = root.value.names;
  if (
    declaredNames.some((name) => !PostgresIdentifierV1Schema.safeParse(name).success) ||
    (resultMode === 'publication' && new Set(declaredNames).size !== declaredNames.length)
  )
    return unsupported('Root outputs require unique PostgreSQL identifiers.');
  const names =
    resultMode === 'selected-relation' ? aliasSelectedOutputNames(declaredNames) : declaredNames;
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
