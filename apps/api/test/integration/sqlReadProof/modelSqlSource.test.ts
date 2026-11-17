/** Compare real parser → canonical source compilation → SQL with an independent PostgreSQL oracle. */
import { createRequire } from 'node:module';

import { jcsCanonicalize } from '@dvt/crypto';
import {
  compileModelSqlSource,
  projectModelSqlSource,
  projectSubstraitToPostgresSql,
  type ModelSqlSourceContext,
} from '@dvt/postgres-projection';
import { deriveSubstraitSchemas } from '@dvt/substrait-analysis';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { parsePostgresTransformSqlStructure } from '../../../src/application/services/postgresTransformSqlPolicy.js';

import {
  createModelSqlSourceFixtures,
  modelSqlSourceCases,
  modelSqlSourceDatasets,
  seedModelSqlSourceFixtures,
} from './modelSqlSource.fixtures.js';
import { comparePostgresSql } from './oracle.js';

type Lease = Readonly<{ url: string; dispose(): Promise<void> }>;
const { allocateDisposablePostgresDatabase } = createRequire(import.meta.url)(
  '../../../../../scripts/disposable-postgres-database.cjs'
) as {
  allocateDisposablePostgresDatabase(url: string, label: string): Promise<Lease>;
};
const adminUrl = process.env['DVT_PG_URL'];

describe.skipIf(adminUrl === undefined)('Model SQL source native PostgreSQL equivalence', () => {
  let lease: Lease | undefined;
  let client: Client | undefined;
  let context: ModelSqlSourceContext;
  beforeAll(async () => {
    if (adminUrl === undefined)
      throw new Error('DVT_PG_URL is required for native Model SQL source proof.');
    lease = await allocateDisposablePostgresDatabase(adminUrl, 'model_sql_3944');
    client = new Client({ connectionString: lease.url, query_timeout: 3000 });
    await client.connect();
    context = await createModelSqlSourceFixtures(client);
  });
  afterAll(async () => {
    try {
      await client?.end();
    } finally {
      await lease?.dispose();
    }
  });

  for (const dataset of modelSqlSourceDatasets) {
    describe(dataset.name, () => {
      for (const scenario of modelSqlSourceCases) {
        it(scenario.sql, async () => {
          await seedModelSqlSourceFixtures(client!, dataset);
          const parsed = await parsePostgresTransformSqlStructure(scenario.sql);
          if (parsed.status !== 'valid')
            throw new Error('Native source fixture did not parse: ' + scenario.sql);
          const inputs = context.inputs.map((input) => ({
            ...input,
            sqlName:
              'quotedInput' in scenario && scenario.quotedInput && input.sqlName === 'client'
                ? 'ClientModels'
                : input.sqlName,
          }));
          let currentDocument;
          if ('publicationSubset' in scenario && scenario.publicationSubset) {
            const full = await parsePostgresTransformSqlStructure('SELECT * FROM client');
            if (full.status !== 'valid') throw new Error('Expected the native saved Read fixture.');
            currentDocument = compileModelSqlSource(full.ast, { inputs }).document;
            const read = [...deriveSubstraitSchemas(currentDocument).index.relations.values()].find(
              (entry) => entry.relation.relType.case === 'read'
            )!;
            const input = inputs[0]!;
            inputs.splice(0, inputs.length, {
              ...input,
              columns: input.columns.filter((column) => column.name === 'country'),
              source: { ...input.source, columns: input.columns },
              retainedRead: read,
            });
          }
          const result = compileModelSqlSource(parsed.ast, {
            inputs,
            ...(currentDocument == null ? {} : { currentDocument }),
          });
          const projected = await projectSubstraitToPostgresSql(result.document);
          expect(
            await comparePostgresSql(
              client!,
              scenario.sql,
              projected.sql,
              'ordered' in scenario && scenario.ordered === true
            )
          ).toEqual({ equivalent: true, reason: 'equal', differences: 0 });
          const analysis = deriveSubstraitSchemas(result.document);
          const occurrences = [...analysis.index.relations.values()]
            .filter((entry) => entry.relation.relType.case === 'read')
            .map((entry, ordinal) => {
              const original = inputs.find(
                (input) =>
                  'sourceRef' in input.source &&
                  jcsCanonicalize(input.source.sourceRef) ===
                    jcsCanonicalize(entry.binding.sourceRef)
              );
              if (original == null)
                throw new Error('Native oracle Read must belong to a declared physical fixture.');
              return { ...original, sqlName: `logical_${ordinal}`, retainedRead: entry };
            });
          const seed = await projectModelSqlSource(result.document, occurrences);
          const seedSyntax = await parsePostgresTransformSqlStructure(seed);
          if (seedSyntax.status !== 'valid')
            throw new Error('Canonical logical source did not parse.');
          const roundtrip = compileModelSqlSource(seedSyntax.ast, {
            inputs: occurrences,
            currentDocument: result.document,
          });
          const repeated = await projectSubstraitToPostgresSql(roundtrip.document);
          expect(
            await comparePostgresSql(
              client!,
              scenario.sql,
              repeated.sql,
              'ordered' in scenario && scenario.ordered === true
            )
          ).toEqual({ equivalent: true, reason: 'equal', differences: 0 });
        });
      }
    });
  }

  it.each([
    'SELECT country FROM public.client',
    'WITH c AS (SELECT * FROM client) SELECT * FROM c',
    'SELECT DISTINCT country FROM client',
    'SELECT c.country FROM client c CROSS JOIN (SELECT upper(country) AS hidden FROM client) s',
    'SELECT c.country FROM client c JOIN orders o USING (client_id)',
    'SELECT country FROM client ORDER BY country FETCH FIRST 2 ROWS WITH TIES',
  ])('rejects a whole unsupported native statement: %s', async (sql) => {
    const parsed = await parsePostgresTransformSqlStructure(sql);
    if (parsed.status === 'valid')
      expect(() => compileModelSqlSource(parsed.ast, context)).toThrow();
    else expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });
});
