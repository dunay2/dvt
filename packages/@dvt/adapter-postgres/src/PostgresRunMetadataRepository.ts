/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Run metadata persistence extracted from PostgresStateStoreAdapter
 * @consequence Single-responsibility class for run_metadata table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import type { PoolClient } from 'pg';

import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { quoteIdentifier } from './sqlUtils.js';
import type { ListRunsOptions, RunId, RunMetadata } from './types.js';

// ---------------------------------------------------------------------------
// Row shapes (internal)
// ---------------------------------------------------------------------------

interface RunMetadataRow {
  tenant_id: string;
  project_id: string;
  environment_id: string;
  run_id: string;
  plan_id: string;
  plan_version: string;
  provider: RunMetadata['provider'];
  provider_workflow_id: string;
  provider_run_id: string;
  provider_namespace: string | null;
  provider_task_queue: string | null;
  provider_conductor_url: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RUN_METADATA_COLUMNS = `
  tenant_id,
  project_id,
  environment_id,
  run_id,
  plan_id,
  plan_version,
  provider,
  provider_workflow_id,
  provider_run_id,
  provider_namespace,
  provider_task_queue,
  provider_conductor_url
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toRunMetadata(row: RunMetadataRow): RunMetadata {
  return {
    tenantId: row.tenant_id,
    projectId: row.project_id,
    environmentId: row.environment_id,
    runId: row.run_id,
    planId: row.plan_id,
    planVersion: row.plan_version,
    // Phase 1: column not yet in schema. Phase 2: read from row.logical_attempt_id.
    logicalAttemptId: 1,
    provider: row.provider,
    providerWorkflowId: row.provider_workflow_id,
    providerRunId: row.provider_run_id,
    providerNamespace: row.provider_namespace ?? undefined,
    providerTaskQueue: row.provider_task_queue ?? undefined,
    providerConductorUrl: row.provider_conductor_url ?? undefined,
  } as RunMetadata;
}

// ---------------------------------------------------------------------------
// PostgresRunMetadataRepository
// ---------------------------------------------------------------------------

export class PostgresRunMetadataRepository {
  constructor(
    private readonly schema: string,
    private readonly withTransaction: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>,
    private readonly withClient: <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>
  ) {}

  async insertWithClient(client: PoolClient, meta: RunMetadata): Promise<void> {
    await client.query(
      `
        INSERT INTO ${quoteIdentifier(this.schema)}.run_metadata (
          run_id,
          tenant_id,
          project_id,
          environment_id,
          plan_id,
          plan_version,
          provider,
          provider_workflow_id,
          provider_run_id,
          provider_namespace,
          provider_task_queue,
          provider_conductor_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
      [
        meta.runId,
        meta.tenantId,
        meta.projectId,
        meta.environmentId,
        meta.planId,
        meta.planVersion,
        meta.provider,
        meta.providerWorkflowId,
        meta.providerRunId,
        meta.providerNamespace ?? null,
        meta.providerTaskQueue ?? null,
        meta.providerConductorUrl ?? null,
      ]
    );
  }

  async resolveTenantWithClient(client: PoolClient, runId: RunId): Promise<string> {
    const result = await client.query<{ tenant_id: string }>(
      `
        SELECT tenant_id
        FROM ${quoteIdentifier(this.schema)}.run_metadata
        WHERE run_id = $1
        LIMIT 1
      `,
      [runId]
    );
    const tenantId = result.rows[0]?.tenant_id;
    if (!tenantId) {
      throw new Error(`RUN_NOT_FOUND: ${runId}`);
    }
    return tenantId;
  }

  /**
   * @deprecated Use bootstrapRunTx. This upsert bypasses the atomic
   * metadata + first-event + snapshot guarantee and may cause
   * IRunStateStore.getSnapshot to return null for the run. Scheduled for
   * removal in Phase 3.
   */
  async saveRunMetadata(meta: RunMetadata): Promise<void> {
    await this.withTransaction(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, meta.tenantId);

      const existing = await client.query<{ tenant_id: string }>(
        `
          SELECT tenant_id
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE run_id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [meta.runId]
      );
      const existingTenantId = existing.rows[0]?.tenant_id;
      if (existingTenantId && existingTenantId !== meta.tenantId) {
        throw new Error(`TENANT_SCOPE_VIOLATION: ${meta.runId}`);
      }

      await client.query(
        `
          INSERT INTO ${quoteIdentifier(this.schema)}.run_metadata (
            run_id,
            tenant_id,
            project_id,
            environment_id,
            plan_id,
            plan_version,
            provider,
            provider_workflow_id,
            provider_run_id,
            provider_namespace,
            provider_task_queue,
            provider_conductor_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (run_id) DO UPDATE SET
            tenant_id = EXCLUDED.tenant_id,
            project_id = EXCLUDED.project_id,
            environment_id = EXCLUDED.environment_id,
            plan_id = EXCLUDED.plan_id,
            plan_version = EXCLUDED.plan_version,
            provider = EXCLUDED.provider,
            provider_workflow_id = EXCLUDED.provider_workflow_id,
            provider_run_id = EXCLUDED.provider_run_id,
            provider_namespace = EXCLUDED.provider_namespace,
            provider_task_queue = EXCLUDED.provider_task_queue,
            provider_conductor_url = EXCLUDED.provider_conductor_url
        `,
        [
          meta.runId,
          meta.tenantId,
          meta.projectId,
          meta.environmentId,
          meta.planId,
          meta.planVersion,
          meta.provider,
          meta.providerWorkflowId,
          meta.providerRunId,
          meta.providerNamespace ?? null,
          meta.providerTaskQueue ?? null,
          meta.providerConductorUrl ?? null,
        ]
      );
    });
  }

  async getByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const result = await this.withClient((client) =>
      client.query<RunMetadataRow>(
        `
          SELECT ${RUN_METADATA_COLUMNS}
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $1 AND run_id = $2
        `,
        [tenantId, runId]
      )
    );

    const row = result.rows[0];
    if (!row) return null;

    return toRunMetadata(row);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = Math.min(options.limit ?? 50, 500);
    const params: unknown[] = [limit, options.tenantId];

    return this.withClient(async (client) => {
      if (options.status === undefined) {
        const result = await client.query<RunMetadataRow>(
          `
            SELECT ${RUN_METADATA_COLUMNS}
            FROM ${quoteIdentifier(this.schema)}.run_metadata
            WHERE tenant_id = $2
            ORDER BY created_at DESC
            LIMIT $1
          `,
          params
        );
        return result.rows.map(toRunMetadata);
      }

      params.push(options.status);
      const statusParam = `$${params.length}`;
      const result = await client.query<RunMetadataRow>(
        `
          SELECT
            m.tenant_id,
            m.project_id,
            m.environment_id,
            m.run_id,
            m.plan_id,
            m.plan_version,
            m.provider,
            m.provider_workflow_id,
            m.provider_run_id,
            m.provider_namespace,
            m.provider_task_queue,
            m.provider_conductor_url
          FROM ${quoteIdentifier(this.schema)}.run_metadata m
          INNER JOIN ${quoteIdentifier(this.schema)}.run_snapshots s ON s.run_id = m.run_id
          WHERE m.tenant_id = $2
            AND s.snapshot_status = ${statusParam}
          ORDER BY m.created_at DESC
          LIMIT $1
        `,
        params
      );
      return result.rows.map(toRunMetadata);
    });
  }

  async saveProviderRef(
    tenantId: string,
    runId: RunId,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    const result = await this.withClient((client) =>
      client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_metadata
          SET provider_workflow_id = $2,
              provider_run_id = $3,
              provider_namespace = $4,
              provider_task_queue = $5,
              provider_conductor_url = $6
          WHERE run_id = $1 AND tenant_id = $7
        `,
        [
          runId,
          runRef.providerWorkflowId,
          runRef.providerRunId,
          runRef.providerNamespace ?? null,
          runRef.providerTaskQueue ?? null,
          runRef.providerConductorUrl ?? null,
          tenantId,
        ]
      )
    );
    if (!result.rowCount) {
      throw new Error(`RUN_NOT_FOUND_OR_FORBIDDEN: ${runId}`);
    }
  }
}
