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
import type { ListRunsOptions, RetryAttemptReservation, RunId, RunMetadata } from './types.js';

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
  logical_attempt_id: number;
  parent_run_id: string | null;
  origin_run_id: string | null;
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
  logical_attempt_id,
  parent_run_id,
  origin_run_id,
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
    logicalAttemptId: row.logical_attempt_id,
    parentRunId: row.parent_run_id ?? undefined,
    originRunId: row.origin_run_id ?? undefined,
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
          logical_attempt_id,
          parent_run_id,
          origin_run_id,
          next_retry_attempt_id,
          provider,
          provider_workflow_id,
          provider_run_id,
          provider_namespace,
          provider_task_queue,
          provider_conductor_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        meta.runId,
        meta.tenantId,
        meta.projectId,
        meta.environmentId,
        meta.planId,
        meta.planVersion,
        meta.logicalAttemptId,
        meta.parentRunId ?? null,
        meta.originRunId ?? meta.runId,
        meta.logicalAttemptId + 1,
        meta.provider,
        meta.providerWorkflowId,
        meta.providerRunId,
        meta.providerNamespace ?? null,
        meta.providerTaskQueue ?? null,
        meta.providerConductorUrl ?? null,
      ]
    );

    // When inserting a retry child, advance the origin run's counter so that
    // the next reserveRetryAttempt sees the correct next slot.
    if (meta.originRunId && meta.originRunId !== meta.runId) {
      await client.query(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_metadata
          SET next_retry_attempt_id = GREATEST(next_retry_attempt_id, $1)
          WHERE run_id = $2 AND tenant_id = $3
        `,
        [meta.logicalAttemptId + 1, meta.originRunId, meta.tenantId]
      );
    }
  }

  /** Transaction-scoped metadata upsert used by canonical write paths. */
  async upsertWithClient(client: PoolClient, meta: RunMetadata): Promise<void> {
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
            m.logical_attempt_id,
            m.parent_run_id,
            m.origin_run_id,
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

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    return this.withTransaction(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);

      const sourceResult = await client.query<{ run_id: string; origin_run_id: string | null }>(
        `
          SELECT run_id, origin_run_id
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $1 AND run_id = $2
          LIMIT 1
        `,
        [tenantId, sourceRunId]
      );

      const source = sourceResult.rows[0];
      if (!source) {
        throw new Error(`RUN_NOT_FOUND: ${sourceRunId}`);
      }

      const originRunId = source.origin_run_id ?? source.run_id;
      const reservation = await client.query<{ logical_attempt_id: number }>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_metadata
          SET next_retry_attempt_id = next_retry_attempt_id + 1
          WHERE tenant_id = $1 AND run_id = $2
          RETURNING next_retry_attempt_id - 1 AS logical_attempt_id
        `,
        [tenantId, originRunId]
      );

      const logicalAttemptId = reservation.rows[0]?.logical_attempt_id;
      if (!logicalAttemptId) {
        throw new Error(`RUN_NOT_FOUND: ${originRunId}`);
      }

      return {
        parentRunId: source.run_id,
        originRunId,
        logicalAttemptId,
      };
    });
  }
}
