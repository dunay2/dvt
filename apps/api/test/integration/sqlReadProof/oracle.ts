import { isDeepStrictEqual } from 'node:util';

import type { Client, FieldDef } from 'pg';

export type SqlColumnShape = Pick<
  FieldDef,
  'name' | 'dataTypeID' | 'dataTypeSize' | 'dataTypeModifier'
>;
export type SqlEquivalence = Readonly<{
  equivalent: boolean;
  reason: 'equal' | 'columns' | 'bag' | 'order';
  differences: number | null;
}>;

export function sameSqlColumns(
  left: readonly SqlColumnShape[],
  right: readonly SqlColumnShape[]
): boolean {
  return (
    left.length === right.length &&
    left.every((column, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        column.name === other.name &&
        column.dataTypeID === other.dataTypeID &&
        column.dataTypeSize === other.dataTypeSize &&
        column.dataTypeModifier === other.dataTypeModifier
      );
    })
  );
}

function statement(sql: string): string {
  const trimmed = sql.trim();
  return trimmed.endsWith(';') ? trimmed.slice(0, -1) : trimmed;
}

/** Query failures propagate: a syntax/connection error is never a successful negative control. */
export async function comparePostgresSql(
  client: Client,
  original: string,
  derived: string,
  ordered = false
): Promise<SqlEquivalence> {
  const before = await client.query({ text: original, rowMode: 'array' });
  const after = await client.query({ text: derived, rowMode: 'array' });
  if (!sameSqlColumns(before.fields, after.fields))
    return { equivalent: false, reason: 'columns', differences: null };
  const left = statement(original);
  const right = statement(derived);
  const difference = await client.query<{ differences: number }>(
    `SELECT count(*)::int AS differences FROM (((${left}) EXCEPT ALL (${right})) UNION ALL ((${right}) EXCEPT ALL (${left}))) AS sqlread_difference`
  );
  const count = difference.rows[0]?.differences;
  if (!Number.isSafeInteger(count) || count === undefined || count < 0)
    throw new Error('PostgreSQL differential returned an invalid count.');
  if (count !== 0) return { equivalent: false, reason: 'bag', differences: count };
  if (ordered && !isDeepStrictEqual(before.rows, after.rows))
    return { equivalent: false, reason: 'order', differences: 0 };
  return { equivalent: true, reason: 'equal', differences: 0 };
}
