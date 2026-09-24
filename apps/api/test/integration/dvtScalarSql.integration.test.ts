import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { decodeDvtSubstraitPlanV1, DvtSubstraitSemanticDocumentV1Schema } from '@dvt/contracts';
import { projectSubstraitToPostgresSql } from '@dvt/postgres-projection';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const url = process.env['DVT_PG_URL'];
const documents: unknown[] = JSON.parse(
  readFileSync(
    new URL(
      '../../../../packages/@dvt/postgres-projection/test/fixtures/scalar-documents.json',
      import.meta.url
    ),
    'utf8'
  )
);
describe.skipIf(url == null)('Canonical scalar results on PostgreSQL', () => {
  let client: Client;
  beforeAll(async () => {
    client = new Client({ connectionString: url });
    await client.connect();
  });
  afterAll(async () => {
    await client?.end();
  });
  it.each([
    {
      ordinal: 0,
      type: 'text',
      values: [null, ' Ada', '', 'Áda'],
      expected: [
        [null, null, 'fallback'],
        [' Ada!', 'ADA!', ' Ada'],
        ['!', '!', ''],
        ['Áda!', 'ÁDA!', 'Áda'],
      ],
    },
    {
      ordinal: 1,
      type: 'timestamptz',
      values: [null, '2027-01-01T00:30:00+01:00', '2026-12-31T23:30:00-01:00'],
      expected: [[null], ['2026'], ['2027']],
    },
  ])(
    'preserves nulls, argument order and UTC semantics ($type)',
    async ({ ordinal, type, values, expected }) => {
      const encoded = DvtSubstraitSemanticDocumentV1Schema.parse(documents[ordinal]);
      const document = { plan: decodeDvtSubstraitPlanV1(encoded), sidecar: encoded.sidecar };
      // A session-local table avoids touching existing schemas or user data.
      const root = document.plan.relations[0]!.relType;
      if (root.case !== 'root' || root.value.input?.relType.case !== 'project')
        throw new Error('Expected Project');
      const read = root.value.input.relType.value.input?.relType;
      if (read?.case !== 'read' || read.value.readType.case !== 'namedTable')
        throw new Error('Expected Read');
      read.value.readType.value.names = ['pg_temp', 'scalar_items'];
      const { encodeDvtSubstraitPlanV1 } = await import('@dvt/contracts');
      document.sidecar.semanticPlanSha256 = encodeDvtSubstraitPlanV1(document.plan).sha256;
      await client.query('BEGIN');
      try {
        await client.query(`CREATE TEMP TABLE scalar_items (value ${type}) ON COMMIT DROP`);
        for (const value of values)
          await client.query('INSERT INTO scalar_items VALUES ($1)', [value]);
        await client.query("SET LOCAL TIME ZONE 'Pacific/Honolulu'");
        const { sql } = await projectSubstraitToPostgresSql(document);
        const result = await client.query({ text: sql, rowMode: 'array' });
        const multiset = (rows: unknown[][]) => rows.map((row) => JSON.stringify(row)).sort();
        expect(multiset(result.rows)).toEqual(multiset(expected));
      } finally {
        await client.query('ROLLBACK');
      }
    }
  );
});
