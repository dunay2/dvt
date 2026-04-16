import type { WorkspaceGraphDraftScope } from '@dvt/contracts';
import type { Pool, PoolClient, QueryConfig, QueryResultRow } from 'pg';

import type {
  IWorkspaceGraphDraftStore,
  WorkspaceGraphDraftSaveStoreResult,
  WorkspaceGraphDraftStoredRecord,
} from '../../application/ports/workspaceGraphDraft.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../../application/ports/workspaceGraphDraft.js';

interface PostgresWorkspaceGraphDraftStoreConfig {
  readonly pool: Pool;
  readonly schema: string;
  readonly queryTimeoutMs?: number;
}

interface DraftRow extends QueryResultRow {
  readonly tenant_id: string;
  readonly project_id: string;
  readonly environment_id: string;
  readonly schema_version: string;
  readonly revision: string;
  readonly draft_json: unknown;
  readonly updated_at: Date | string;
}

interface IdempotencyRow extends QueryResultRow {
  readonly request_hash: string;
  readonly revision: string;
  readonly schema_version: string;
}

export class PostgresWorkspaceGraphDraftStore implements IWorkspaceGraphDraftStore {
  public constructor(private readonly config: PostgresWorkspaceGraphDraftStoreConfig) {}

  public async migrate(): Promise<void> {
    await this.config.pool.query(`
      CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(this.config.schema)};
    `);

    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        revision TEXT NOT NULL,
        draft_json JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id)
      );
    `);

    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        revision TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, idempotency_key)
      );
    `);
  }

  public async close(): Promise<void> {}

  public async read(scope: WorkspaceGraphDraftScope): Promise<WorkspaceGraphDraftStoredRecord | null> {
    const result = await this.config.pool.query<DraftRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
          LIMIT 1
        `,
        values: [scope.tenantId, scope.projectId, scope.environmentId],
      })
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return mapDraftRow(row);
  }

  public async save(input: {
    readonly scope: WorkspaceGraphDraftScope;
    readonly schemaVersion: string;
    readonly expectedRevision: string;
    readonly idempotencyKey: string;
    readonly draft: unknown;
    readonly requestHash: string;
    readonly revision: string;
    readonly nowIso: string;
  }): Promise<WorkspaceGraphDraftSaveStoreResult> {
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');

      const idempotency = await this.readIdempotency(client, input);
      if (idempotency) {
        if (idempotency.request_hash !== input.requestHash) {
          await client.query('ROLLBACK');
          return { kind: 'idempotency_mismatch' };
        }

        await client.query('COMMIT');
        return {
          kind: 'saved',
          schemaVersion: idempotency.schema_version,
          revision: idempotency.revision,
          updatedAt: input.nowIso,
          deduplicated: true,
        };
      }

      const current = await this.readDraftForUpdate(client, input.scope);
      if (current === null) {
        if (input.expectedRevision !== WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION) {
          await client.query('ROLLBACK');
          return {
            kind: 'conflict',
            currentRevision: WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
            storedSchemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
            updatedAt: null,
          };
        }

        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              INSERT INTO ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
                (tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::timestamptz)
            `,
            values: [
              input.scope.tenantId,
              input.scope.projectId,
              input.scope.environmentId,
              input.schemaVersion,
              input.revision,
              JSON.stringify(input.draft),
              input.nowIso,
            ],
          })
        );
      } else {
        if (current.revision !== input.expectedRevision) {
          await client.query('ROLLBACK');
          return {
            kind: 'conflict',
            currentRevision: current.revision,
            storedSchemaVersion: current.schemaVersion,
            updatedAt: current.updatedAt,
          };
        }

        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              UPDATE ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
              SET schema_version = $4,
                  revision = $5,
                  draft_json = $6::jsonb,
                  updated_at = $7::timestamptz
              WHERE tenant_id = $1
                AND project_id = $2
                AND environment_id = $3
            `,
            values: [
              input.scope.tenantId,
              input.scope.projectId,
              input.scope.environmentId,
              input.schemaVersion,
              input.revision,
              JSON.stringify(input.draft),
              input.nowIso,
            ],
          })
        );
      }

      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            INSERT INTO ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency
              (
                tenant_id,
                project_id,
                environment_id,
                idempotency_key,
                request_hash,
                revision,
                schema_version,
                created_at,
                updated_at
              )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $8::timestamptz)
          `,
          values: [
            input.scope.tenantId,
            input.scope.projectId,
            input.scope.environmentId,
            input.idempotencyKey,
            input.requestHash,
            input.revision,
            input.schemaVersion,
            input.nowIso,
          ],
        })
      );

      await client.query('COMMIT');
      return {
        kind: 'saved',
        schemaVersion: input.schemaVersion,
        revision: input.revision,
        updatedAt: input.nowIso,
        deduplicated: false,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original failure when rollback also fails.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async readDraftForUpdate(
    client: PoolClient,
    scope: WorkspaceGraphDraftScope
  ): Promise<WorkspaceGraphDraftStoredRecord | null> {
    const result = await client.query<DraftRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, schema_version, revision, draft_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
          FOR UPDATE
        `,
        values: [scope.tenantId, scope.projectId, scope.environmentId],
      })
    );

    return result.rows[0] ? mapDraftRow(result.rows[0]) : null;
  }

  private async readIdempotency(
    client: PoolClient,
    input: {
      readonly scope: WorkspaceGraphDraftScope;
      readonly idempotencyKey: string;
    }
  ): Promise<IdempotencyRow | null> {
    const result = await client.query<IdempotencyRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, revision, schema_version
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_draft_idempotency
          WHERE tenant_id = $1
            AND project_id = $2
            AND environment_id = $3
            AND idempotency_key = $4
          FOR UPDATE
        `,
        values: [
          input.scope.tenantId,
          input.scope.projectId,
          input.scope.environmentId,
          input.idempotencyKey,
        ],
      })
    );

    return result.rows[0] ?? null;
  }
}

function mapDraftRow(row: DraftRow): WorkspaceGraphDraftStoredRecord {
  return {
    scope: {
      tenantId: row.tenant_id,
      projectId: row.project_id,
      environmentId: row.environment_id,
    },
    schemaVersion: row.schema_version,
    revision: row.revision,
    draftPayload: row.draft_json,
    updatedAt: asIsoString(row.updated_at),
  };
}

function asIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withTimeout<T extends QueryConfig>(timeoutMs: number | undefined, config: T): T {
  if (!timeoutMs || timeoutMs <= 0) {
    return config;
  }

  return {
    ...config,
    signal: globalThis.AbortSignal.timeout(timeoutMs),
  };
}
