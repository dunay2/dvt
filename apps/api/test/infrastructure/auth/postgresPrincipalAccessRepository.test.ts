import assert from 'node:assert/strict';
import test from 'node:test';

import { PostgresPrincipalAccessRepository } from '../../../src/infrastructure/auth/postgresPrincipalAccessRepository.js';

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

await test('PostgresPrincipalAccessRepository creates the schema before the grants table', async () => {
  const queries: string[] = [];
  const pool = {
    async query(sql: string) {
      queries.push(sql);
      return { rows: [] };
    },
  };

  const repository = new PostgresPrincipalAccessRepository(pool as never, 'authz');
  await repository.migrate();

  assert.equal(queries.length, 2);
  assert.match(normalizeSql(queries[0]!), /^CREATE SCHEMA IF NOT EXISTS authz;$/i);
  assert.match(
    normalizeSql(queries[1]!),
    /^CREATE TABLE IF NOT EXISTS authz\.principal_grants \(/i
  );
});
