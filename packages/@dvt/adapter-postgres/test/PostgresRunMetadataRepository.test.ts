import { RunNotFoundError, TenantAccessDeniedError } from '@dvt/engine';
import { ProviderRefProviderMismatchError } from '@dvt/engine';
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

class MissingRunClient extends RecordingClient {
  override async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Array<{ tenant_id?: string }> }> {
    if (sql.includes('WHERE run_id = $1') && !sql.includes('FOR UPDATE')) {
      return { rows: [] };
    }

    return super.query(sql, params);
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
    providerRef: {
      provider: 'mock',
      tenantId: 'tenant-a',
      workflowId: 'wf-run-a',
      runId: 'pr-run-a',
    },
    ...overrides,
  };
}

class ProviderRefUpdateClient extends RecordingClient {
  override async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Array<Record<string, unknown>> }> {
    this.queries.push({ sql, params });

    if (
      sql.includes('SELECT') &&
      sql.includes('FOR UPDATE') &&
      sql.includes('provider_workflow_id')
    ) {
      return {
        rows: [
          {
            tenant_id: 'tenant-a',
            project_id: 'project-a',
            environment_id: 'env-a',
            run_id: 'run-a',
            plan_id: 'plan-a',
            plan_version: '1.0.0',
            logical_attempt_id: 1,
            parent_run_id: null,
            origin_run_id: null,
            provider: 'temporal',
            provider_workflow_id: 'wf-run-a',
            provider_run_id: 'pr-run-a',
            provider_namespace: 'default',
            provider_task_queue: null,
            provider_conductor_url: null,
          },
        ],
      };
    }

    return super.query(sql, params) as Promise<{ rows: Array<Record<string, unknown>> }>;
  }
}

class InvalidTaskQueueRowClient extends RecordingClient {
  override async query(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: Array<Record<string, unknown>> }> {
    this.queries.push({ sql, params });

    if (sql.includes('WHERE tenant_id = $1 AND run_id = $2') && !sql.includes('FOR UPDATE')) {
      return {
        rows: [
          {
            tenant_id: 'tenant-a',
            project_id: 'project-a',
            environment_id: 'env-a',
            run_id: 'run-a',
            plan_id: 'plan-a',
            plan_version: '1.0.0',
            logical_attempt_id: 1,
            parent_run_id: null,
            origin_run_id: null,
            provider: 'temporal',
            provider_workflow_id: 'wf-run-a',
            provider_run_id: 'pr-run-a',
            provider_namespace: 'default',
            provider_task_queue: '',
            provider_conductor_url: null,
          },
        ],
      };
    }

    return super.query(sql, params) as Promise<{ rows: Array<Record<string, unknown>> }>;
  }
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

    await expect(repo.upsertWithClient(client as never, makeMeta())).rejects.toBeInstanceOf(
      TenantAccessDeniedError
    );

    expect(client.queries).toHaveLength(2);
    expect(client.queries[1]?.sql).toContain('FOR UPDATE');
  });

  it('resolveTenantWithClient throws RunNotFoundError when the run is missing', async () => {
    const client = new MissingRunClient();
    const repo = new PostgresRunMetadataRepository('dvt', async (fn) => fn(client as never));

    await expect(
      repo.resolveTenantWithClient(client as never, 'run-missing')
    ).rejects.toBeInstanceOf(RunNotFoundError);
  });

  it('saveProviderRef rejects cross-provider updates before issuing the UPDATE statement', async () => {
    const client = new ProviderRefUpdateClient();
    const repo = new PostgresRunMetadataRepository('dvt', async (fn) => fn(client as never));

    await expect(
      repo.saveProviderRef('tenant-a', 'run-a', {
        provider: 'conductor',
        tenantId: 'tenant-a',
        workflowId: 'wf-run-a',
        runId: 'actual-run-a',
        conductorUrl: 'http://localhost:8080/api',
      })
    ).rejects.toBeInstanceOf(ProviderRefProviderMismatchError);

    expect(client.queries.some((query) => query.sql.includes('UPDATE "dvt".run_metadata'))).toBe(
      false
    );
  });

  it('getByRunId rejects persisted temporal provider refs with empty taskQueue', async () => {
    const client = new InvalidTaskQueueRowClient();
    const repo = new PostgresRunMetadataRepository('dvt', async (fn) => fn(client as never));

    await expect(repo.getByRunId('tenant-a', 'run-a')).rejects.toThrow('RUN_METADATA_ROW_INVALID');
  });
});
