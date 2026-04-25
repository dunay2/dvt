/**
 * Owned concern: persist and hydrate canonical run metadata with contract-
 * validated provider references, without storage-local provider variants.
 *
 * @file packages/@dvt/adapter-postgres/src/PostgresRunMetadataRepository.ts
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Run metadata persistence extracted from PostgresStateStoreAdapter
 * @consequence Single-responsibility class for run_metadata table operations
 * @version 1.0.0
 * @date 2026-03-15
 */
import { parseEngineRunRef, type EngineRunRef } from '@dvt/contracts';
import {
  ProviderRefProviderMismatchError,
  RunNotFoundError,
  TenantAccessDeniedError,
} from '@dvt/engine';
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
  provider: RunMetadata['providerRef']['provider'];
  provider_workflow_id: string;
  provider_run_id: string;
  provider_namespace: string | null;
  provider_task_queue: string | null;
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
  provider_task_queue
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateInputProviderRef(
  providerRef: RunMetadata['providerRef'],
  runId: string
): RunMetadata['providerRef'] {
  try {
    return normalizeEngineRunRefShape(parseEngineRunRef(providerRef));
  } catch (error) {
    throw new Error(`RUN_METADATA_INVALID_PROVIDER_REF: ${runId}`, { cause: error });
  }
}

function parsePersistedProviderRef(
  providerRef: unknown,
  runId: string
): RunMetadata['providerRef'] {
  try {
    return normalizeEngineRunRefShape(parseEngineRunRef(providerRef));
  } catch (error) {
    throw new Error(`RUN_METADATA_ROW_INVALID: ${runId}:providerRef`, { cause: error });
  }
}

function normalizeEngineRunRefShape(input: ReturnType<typeof parseEngineRunRef>): EngineRunRef {
  const runRef: EngineRunRef = {
    provider: 'temporal',
    tenantId: input.tenantId,
    namespace: input.namespace,
    workflowId: input.workflowId,
    runId: input.runId,
  };
  if (input.taskQueue !== undefined) {
    runRef.taskQueue = input.taskQueue;
  }
  return runRef;
}

function toRunMetadata(row: RunMetadataRow): RunMetadata {
  const rawProviderRef = rawProviderRefFromRow(row);
  const providerRef = parsePersistedProviderRef(rawProviderRef, row.run_id);

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
    providerRef,
  } as RunMetadata;
}

function rawProviderRefFromRow(row: RunMetadataRow): unknown {
  if (row.provider === 'temporal') {
    return {
      provider: 'temporal',
      tenantId: row.tenant_id,
      namespace: row.provider_namespace ?? 'default',
      workflowId: row.provider_workflow_id,
      runId: row.provider_run_id,
      ...(row.provider_task_queue !== null ? { taskQueue: row.provider_task_queue } : {}),
    };
  }

  throw new Error(`RUN_METADATA_PROVIDER_UNSUPPORTED: ${String(row.provider)}`);
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
    const providerRef = validateInputProviderRef(meta.providerRef, meta.runId);
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
          provider_task_queue
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        providerRef.provider,
        providerRef.workflowId,
        providerRef.runId,
        providerRef.namespace,
        providerRef.taskQueue ?? null,
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
    const providerRef = validateInputProviderRef(meta.providerRef, meta.runId);
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
      throw new TenantAccessDeniedError(meta.tenantId);
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
          provider_task_queue
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
          provider_task_queue = EXCLUDED.provider_task_queue
      `,
      [
        meta.runId,
        meta.tenantId,
        meta.projectId,
        meta.environmentId,
        meta.planId,
        meta.planVersion,
        providerRef.provider,
        providerRef.workflowId,
        providerRef.runId,
        providerRef.namespace,
        providerRef.taskQueue ?? null,
      ]
    );
  }

  async saveProviderRef(
    tenantId: string,
    runId: RunId,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata> {
    const validatedProviderRef = validateInputProviderRef(providerRef, runId);
    if (validatedProviderRef.tenantId !== tenantId) {
      throw new TenantAccessDeniedError(tenantId);
    }

    return this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);

      const existing = await client.query<RunMetadataRow>(
        `
          SELECT ${RUN_METADATA_COLUMNS}
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $1 AND run_id = $2
          LIMIT 1
          FOR UPDATE
        `,
        [tenantId, runId]
      );

      const current = existing.rows[0];
      if (!current) {
        throw new RunNotFoundError(runId);
      }
      if (current.provider !== validatedProviderRef.provider) {
        throw new ProviderRefProviderMismatchError(
          runId,
          current.provider,
          validatedProviderRef.provider
        );
      }

      const updated = await client.query<RunMetadataRow>(
        `
          UPDATE ${quoteIdentifier(this.schema)}.run_metadata
          SET provider_workflow_id = $1,
              provider_run_id = $2,
              provider_namespace = $3,
              provider_task_queue = $4
          WHERE tenant_id = $5 AND run_id = $6
          RETURNING ${RUN_METADATA_COLUMNS}
        `,
        [
          validatedProviderRef.workflowId,
          validatedProviderRef.runId,
          validatedProviderRef.namespace,
          validatedProviderRef.taskQueue ?? null,
          tenantId,
          runId,
        ]
      );

      return toRunMetadata(updated.rows[0] as RunMetadataRow);
    });
  }

  async resolveTenantWithClient(client: PoolClient, runId: RunId): Promise<string> {
    await PostgresSchemaManager.setServiceContext(client);
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
      throw new RunNotFoundError(runId);
    }
    return tenantId;
  }

  async getByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const result = await this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      return client.query<RunMetadataRow>(
        `
          SELECT ${RUN_METADATA_COLUMNS}
          FROM ${quoteIdentifier(this.schema)}.run_metadata
          WHERE tenant_id = $1 AND run_id = $2
        `,
        [tenantId, runId]
      );
    });

    const row = result.rows[0];
    if (!row) return null;

    return toRunMetadata(row);
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = Math.min(options.limit ?? 50, 500);
    const params: unknown[] = [limit, options.tenantId];

    return this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, options.tenantId);
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
            m.provider_task_queue
          FROM ${quoteIdentifier(this.schema)}.run_metadata m
          INNER JOIN ${quoteIdentifier(this.schema)}.run_snapshots s
            ON s.run_id = m.run_id
            AND s.tenant_id = m.tenant_id
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

  async reserveRetryAttempt(
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation> {
    return this.withClient(async (client) => {
      await PostgresSchemaManager.setTenantContext(client, tenantId);

      const result = await client.query<{
        parent_run_id: string;
        origin_run_id: string;
        logical_attempt_id: number;
      }>(
        `
          WITH source AS (
            SELECT run_id, COALESCE(origin_run_id, run_id) AS origin_run_id
            FROM ${quoteIdentifier(this.schema)}.run_metadata
            WHERE tenant_id = $1 AND run_id = $2
            LIMIT 1
          ),
          updated AS (
            UPDATE ${quoteIdentifier(this.schema)}.run_metadata
            SET next_retry_attempt_id = next_retry_attempt_id + 1
            WHERE tenant_id = $1 AND run_id = (SELECT origin_run_id FROM source)
            RETURNING next_retry_attempt_id - 1 AS logical_attempt_id
          )
          SELECT source.run_id AS parent_run_id, source.origin_run_id, updated.logical_attempt_id
          FROM source, updated
        `,
        [tenantId, sourceRunId]
      );

      const row = result.rows[0];
      if (!row) {
        throw new RunNotFoundError(sourceRunId);
      }

      return {
        parentRunId: row.parent_run_id,
        originRunId: row.origin_run_id,
        logicalAttemptId: row.logical_attempt_id,
      };
    });
  }
}
