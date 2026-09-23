import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

import {
  JoinRel_JoinType,
  SetRel_SetOp,
} from '@buf/substrait_substrait.bufbuild_es/substrait/algebra_pb.js';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compositionalFixture } from '../fixtures/dvtCompositionalSqlFixture.js';

const url = process.env['DVT_PG_URL'];
const database = `dvt_composition_${randomUUID().replaceAll('-', '')}`;
const rows = 'VALUES (NULL::bigint), (-1), (0), (1), (2), (2), (3)';
const left = '(SELECT value FROM raw.items WHERE value < 3)';
const right = '(SELECT value FROM raw.items WHERE value > 1)';
const joins = [
  [JoinRel_JoinType.INNER, `SELECT l.value, r.value FROM ${left} l JOIN ${right} r USING (value)`],
  [
    JoinRel_JoinType.LEFT,
    `SELECT l.value, r.value FROM ${left} l LEFT JOIN ${right} r USING (value)`,
  ],
  [
    JoinRel_JoinType.RIGHT,
    `SELECT l.value, r.value FROM ${left} l RIGHT JOIN ${right} r USING (value)`,
  ],
  [
    JoinRel_JoinType.OUTER,
    `SELECT l.value, r.value FROM ${left} l FULL JOIN ${right} r USING (value)`,
  ],
  [
    JoinRel_JoinType.LEFT_SEMI,
    `SELECT l.value FROM ${left} l WHERE EXISTS (SELECT FROM ${right} r WHERE l.value = r.value)`,
  ],
  [
    JoinRel_JoinType.LEFT_ANTI,
    `SELECT l.value FROM ${left} l WHERE NOT EXISTS (SELECT FROM ${right} r WHERE l.value = r.value)`,
  ],
  [
    JoinRel_JoinType.RIGHT_SEMI,
    `SELECT r.value FROM ${right} r WHERE EXISTS (SELECT FROM ${left} l WHERE l.value = r.value)`,
  ],
  [
    JoinRel_JoinType.RIGHT_ANTI,
    `SELECT r.value FROM ${right} r WHERE NOT EXISTS (SELECT FROM ${left} l WHERE l.value = r.value)`,
  ],
] as const;
const sets = [
  [SetRel_SetOp.UNION_ALL, 'UNION ALL'],
  [SetRel_SetOp.UNION_DISTINCT, 'UNION'],
  [SetRel_SetOp.INTERSECTION_MULTISET, 'INTERSECT'],
  [SetRel_SetOp.INTERSECTION_MULTISET_ALL, 'INTERSECT ALL'],
  [SetRel_SetOp.MINUS_PRIMARY, 'EXCEPT'],
  [SetRel_SetOp.MINUS_PRIMARY_ALL, 'EXCEPT ALL'],
] as const;

function multiset(values: unknown[][]): string[] {
  return values.map((value) => JSON.stringify(value)).sort();
}

describe.skipIf(url == null)('Compositional Substrait SQL on PostgreSQL', () => {
  let admin: Client;
  let client: Client;
  beforeAll(async () => {
    admin = new Client({ connectionString: url });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${database}"`);
    const target = new URL(url!);
    target.pathname = `/${database}`;
    client = new Client({ connectionString: target.toString() });
    await client.connect();
    await client.query('CREATE SCHEMA raw');
    await client.query('CREATE TABLE raw.items (value bigint)');
    await client.query(`INSERT INTO raw.items ${rows}`);
  });
  afterAll(async () => {
    await client?.end();
    if (admin != null) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
      await admin.end();
    }
  });
  it.each(joins)('Composes filtered/projected operands for JOIN %s', async (kind, reference) => {
    const result = await projectSubstraitToPostgresSql(compositionalFixture('join', kind));
    const actual = await client.query({ text: result.sql, rowMode: 'array' });
    const expected = await client.query({ text: reference, rowMode: 'array' });
    expect(multiset(actual.rows)).toEqual(multiset(expected.rows));
    expect(actual.fields.map((field) => field.name)).toEqual(
      result.projection.outputs.map((field) => field.name)
    );
  });
  it('Composes filtered/projected operands for CROSS', async () => {
    const result = await projectSubstraitToPostgresSql(compositionalFixture('cross'));
    const actual = await client.query({ text: result.sql, rowMode: 'array' });
    const expected = await client.query({
      text: `SELECT l.value, r.value FROM ${left} l CROSS JOIN ${right} r`,
      rowMode: 'array',
    });
    expect(multiset(actual.rows)).toEqual(multiset(expected.rows));
  });
  it('Consumes calculated fields from both operands, not their original columns', async () => {
    const result = await projectSubstraitToPostgresSql(
      compositionalFixture('join', JoinRel_JoinType.INNER, true)
    );
    const actual = await client.query({ text: result.sql, rowMode: 'array' });
    const reference = `SELECT l.computed, r.computed FROM
      (SELECT value > 1 AS computed FROM raw.items WHERE value < 3) l JOIN
      (SELECT value > 1 AS computed FROM raw.items WHERE value > 1) r USING (computed)`;
    const expected = await client.query({ text: reference, rowMode: 'array' });
    expect(multiset(actual.rows)).toEqual(multiset(expected.rows));
    expect(actual.rows).toHaveLength(6);
    expect(result.projection.outputs.map((field) => field.dataType)).toEqual(['bool', 'bool']);
  });
  it.each(sets)('Composes filtered/projected operands for SET %s', async (kind, operator) => {
    const document = compositionalFixture('set');
    const root = document.plan.relations[0]!.relType;
    if (root.case !== 'root' || root.value.input?.relType.case !== 'set')
      throw new Error('Fixture has no SET');
    root.value.input.relType.value.op = kind;
    const result = await projectSubstraitToPostgresSql(document);
    const actual = await client.query({ text: result.sql, rowMode: 'array' });
    const expected = await client.query({
      text: `SELECT * FROM ${left} l ${operator} SELECT * FROM ${right} r`,
      rowMode: 'array',
    });
    expect(multiset(actual.rows)).toEqual(multiset(expected.rows));
  });
});
