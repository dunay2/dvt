import { describe, it, expect } from 'vitest';

import { PostgresPrincipalAccessRepository } from '../../../src/infrastructure/auth/postgresPrincipalAccessRepository.js';

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

describe('PostgresPrincipalAccessRepository', () => {
  it('creates the schema before the grants table', async () => {
    const queries: string[] = [];
    const pool = {
      async query(sql: string) {
        queries.push(sql);
        return { rows: [] };
      },
    };

    const repository = new PostgresPrincipalAccessRepository(pool as never, 'authz');
    await repository.migrate();

    expect(queries.length).toBe(2);
    expect(normalizeSql(queries[0]!)).toMatch(/^CREATE SCHEMA IF NOT EXISTS authz;$/i);
    expect(normalizeSql(queries[1]!)).toMatch(
      /^CREATE TABLE IF NOT EXISTS authz\.principal_grants \(/i
    );
  });
});
