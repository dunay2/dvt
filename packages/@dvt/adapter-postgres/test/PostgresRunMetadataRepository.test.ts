import { describe, expect, it } from 'vitest';

import { PostgresRunMetadataRepository } from '../src/PostgresRunMetadataRepository.js';
import type { RunMetadata } from '../src/types.js';

class RecordingClient {
  readonly queries: Array<{ sql: string; params?: unknown[] }> = [];

  constructor(private readonly existingTenantId?: string) {}

  async query(sql: string, params?: unknown[]): Promise<{ rows: Array<{ tenant_id?: string }> }> {
    this.queries.push({ sql, params });

    if (sql.includes('SELECT tenant_id') && sql.includes('FOR UPDATE')) {
      return {
        rows: this.existingTenantId === undefined ? [] : [{ tenant_id: this.existingTenantId }],
      };
    }

    return { rows: [] };
  }
}

function makeMeta(overrides: Partial<RunMetadata> = {}): RunMetadata {
  return {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
    runId: 'run-a',
    planId: 'plan-a',
    planVersion: '1.0.0',
    logicalAttemptId: 1,
    provider: 'mock',
    providerWorkflowId: 'wf-run-a',
    providerRunId: 'pr-run-a',
    ...overrides,
  };
}

describe('PostgresRunMetadataRepository upsertWithClient', () => {
  it('writes tenant context and upserts run metadata inside the provided client', async () => {
    const client = new RecordingClient();
    const repo = new PostgresRunMetadataRepository('dvt', async (fn) => fn(client as never));

    await repo.upsertWithClient(client as never, makeMeta());

    const sqls = client.queries.map((query) => query.sql);

    expect(sqls[0]).toContain("set_config('dvt.tenant_id'");
    expect(sqls[1]).toContain('SELECT tenant_id');
    expect(sqls[1]).toContain('FOR UPDATE');
    expect(sqls[2]).toContain('INSERT INTO "dvt".run_metadata');
    expect(sqls[2]).toContain('ON CONFLICT (run_id) DO UPDATE SET');
    expect(client.queries[0]?.params).toEqual(['tenant-a']);
  });

  it('rejects cross-tenant upserts before issuing the INSERT/UPDATE statement', async () => {
    const client = new RecordingClient('tenant-b');
    const repo = new PostgresRunMetadataRepository('dvt', async (fn) => fn(client as never));

    await expect(repo.upsertWithClient(client as never, makeMeta())).rejects.toThrow(
      /TENANT_SCOPE_VIOLATION: run-a/
    );

    expect(client.queries).toHaveLength(2);
    expect(client.queries[1]?.sql).toContain('FOR UPDATE');
  });
});
