import {
  CanvasAuthoringAuthorityBindingSchema,
  DbtProjectImportResultSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '@dvt/contracts';
import type { Pool, PoolClient, QueryConfig, QueryResultRow } from 'pg';

import type { CanvasAuthoringAuthorityStoredRecord } from '../../application/ports/canvasAuthoringAuthority.js';
import { serializeCanvasAuthoringAuthorityKey } from '../../application/ports/canvasAuthoringAuthority.js';
import type {
  DbtProjectImportProcessBeginResult,
  DbtProjectImportProcessCompleteResult,
  DbtProjectImportProcessFailResult,
  DbtProjectImportProcessKey,
  DbtProjectImportStoredCompletion,
  IDbtProjectImportProcessStore,
} from '../../application/ports/dbtProjectImport.js';

type Config = Readonly<{
  pool: Pool;
  schema: string;
  queryTimeoutMs?: number;
}>;

interface OperationRow extends QueryResultRow {
  readonly request_hash: string;
  readonly status: 'in_progress' | 'completed' | 'failed';
  readonly binding_json: unknown;
  readonly authority_revision: string;
  readonly lease_token: string | null;
  readonly lease_expires_at: Date | string | null;
  readonly result_json: unknown | null;
  readonly updated_at: Date | string;
}

interface AuthorityRow extends QueryResultRow {
  readonly tenant_id: string;
  readonly project_id: string;
  readonly environment_id: string;
  readonly canvas_id: string;
  readonly binding_json: unknown;
  readonly revision: string;
  readonly updated_at: Date | string;
}

interface DraftRow extends QueryResultRow {
  readonly draft_json: unknown;
}

interface RelationRow extends QueryResultRow {
  readonly relation_name: string | null;
}

interface ExistingRow extends QueryResultRow {
  readonly present: number;
}

type BeginInput = Parameters<IDbtProjectImportProcessStore['begin']>[0];
type CompleteInput = Parameters<IDbtProjectImportProcessStore['complete']>[0];
type FailInput = Parameters<IDbtProjectImportProcessStore['fail']>[0];

export class PostgresDbtProjectImportProcessStore implements IDbtProjectImportProcessStore {
  public constructor(private readonly config: Config) {}

  public async migrate(): Promise<void> {
    const schema = quoteIdentifier(this.config.schema);
    await this.config.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.dbt_project_import_operations (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        canvas_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
        binding_json JSONB NOT NULL,
        authority_revision TEXT NOT NULL,
        lease_token TEXT,
        lease_expires_at TIMESTAMPTZ,
        result_json JSONB,
        failure_code TEXT,
        started_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, canvas_id, idempotency_key),
        CHECK (
          (status = 'in_progress' AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL
            AND result_json IS NULL)
          OR (status = 'completed' AND lease_token IS NULL AND lease_expires_at IS NULL
            AND result_json IS NOT NULL)
          OR (status = 'failed' AND lease_token IS NULL AND lease_expires_at IS NULL
            AND result_json IS NULL)
        )
      )
    `);
    await this.migrateCompletedReceipts(schema);
  }

  public async close(): Promise<void> {}

  public async readCompleted(input: {
    readonly key: DbtProjectImportProcessKey;
    readonly idempotencyKey: string;
  }): Promise<DbtProjectImportStoredCompletion | null> {
    const result = await this.config.pool.query<OperationRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, status, binding_json, authority_revision,
                 lease_token, lease_expires_at, result_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND idempotency_key = $5 AND status = 'completed'
          LIMIT 1
        `,
        values: operationKeyValues(input),
      })
    );
    return result.rows[0] ? mapCompletion(input.key, result.rows[0]) : null;
  }

  public async begin(input: BeginInput): Promise<DbtProjectImportProcessBeginResult> {
    const binding = CanvasAuthoringAuthorityBindingSchema.parse(input.binding);
    assertCanvasId(input.key, binding.canvasId);
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');
      await this.lockCanvas(client, input.key);
      const operation = await this.readOperationForUpdate(client, input.key, input.idempotencyKey);
      if (operation) {
        const existing = await this.resolveExistingOperation(client, input, operation);
        if (existing) {
          await client.query('COMMIT');
          return existing;
        }
      }
      const activeSibling = await this.readActiveSiblingOperationForUpdate(client, input);
      if (activeSibling) {
        await client.query('COMMIT');
        return {
          kind: 'in_progress',
          leaseExpiresAt: asIsoString(activeSibling.lease_expires_at!),
        };
      }

      const authority = await this.ensureAuthority(client, input, binding);
      if (authority.kind !== 'ready') {
        await client.query('ROLLBACK');
        return authority.result;
      }

      if (operation) {
        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              UPDATE ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
              SET status = 'in_progress', binding_json = $6::jsonb,
                  authority_revision = $7, lease_token = $8,
                  lease_expires_at = $9::timestamptz, result_json = NULL,
                  failure_code = NULL, updated_at = $10::timestamptz
              WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
                AND canvas_id = $4 AND idempotency_key = $5
            `,
            values: [
              ...operationKeyValues(input),
              JSON.stringify(binding),
              input.revision,
              input.leaseToken,
              input.leaseExpiresAt,
              input.nowIso,
            ],
          })
        );
      } else {
        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              INSERT INTO ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
                (tenant_id, project_id, environment_id, canvas_id, idempotency_key,
                 request_hash, status, binding_json, authority_revision, lease_token,
                 lease_expires_at, result_json, failure_code, started_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, 'in_progress', $7::jsonb, $8, $9,
                      $10::timestamptz, NULL, NULL, $11::timestamptz, $11::timestamptz)
            `,
            values: [
              ...operationKeyValues(input),
              input.requestHash,
              JSON.stringify(binding),
              input.revision,
              input.leaseToken,
              input.leaseExpiresAt,
              input.nowIso,
            ],
          })
        );
      }

      await client.query('COMMIT');
      return {
        kind: 'acquired',
        record: authority.record,
        leaseToken: input.leaseToken,
        recovered: operation !== null,
      };
    } catch (error) {
      await rollbackPreservingError(client);
      throw error;
    } finally {
      client.release();
    }
  }

  public async complete(input: CompleteInput): Promise<DbtProjectImportProcessCompleteResult> {
    const result = DbtProjectImportResultSchema.parse(input.result);
    assertCanvasId(input.key, result.authorityBinding.canvasId);
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');
      await this.lockCanvas(client, input.key);
      const operation = await this.readOperationForUpdate(client, input.key, input.idempotencyKey);
      if (!operation) {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }
      if (operation.request_hash !== input.requestHash) {
        await client.query('ROLLBACK');
        return { kind: 'idempotency_mismatch' };
      }
      if (operation.status === 'failed') {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }
      if (operation.status === 'completed') {
        await client.query('COMMIT');
        return {
          kind: 'completed',
          receipt: mapCompletion(input.key, operation),
          deduplicated: true,
        };
      }
      if (
        operation.lease_token !== input.leaseToken ||
        !isLeaseActive(operation.lease_expires_at, input.nowIso)
      ) {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }
      const authority = await this.readAuthorityForUpdate(client, input.key);
      if (
        !authority ||
        authority.revision !== operation.authority_revision ||
        !sameBinding(authority.binding, operation.binding_json)
      ) {
        await client.query('ROLLBACK');
        return { kind: 'authority_conflict' };
      }

      const persisted = await client.query<OperationRow>(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            UPDATE ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
            SET status = 'completed', result_json = $6::jsonb,
                lease_token = NULL, lease_expires_at = NULL,
                failure_code = NULL, updated_at = $7::timestamptz
            WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
              AND canvas_id = $4 AND idempotency_key = $5
            RETURNING request_hash, status, binding_json, authority_revision,
                      lease_token, lease_expires_at, result_json, updated_at
          `,
          values: [...operationKeyValues(input), JSON.stringify(result), input.nowIso],
        })
      );
      const row = persisted.rows[0];
      if (!row) throw new Error('The dbt project import process disappeared during completion.');
      await client.query('COMMIT');
      return { kind: 'completed', receipt: mapCompletion(input.key, row), deduplicated: false };
    } catch (error) {
      await rollbackPreservingError(client);
      throw error;
    } finally {
      client.release();
    }
  }

  public async fail(input: FailInput): Promise<DbtProjectImportProcessFailResult> {
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');
      await this.lockCanvas(client, input.key);
      const operation = await this.readOperationForUpdate(client, input.key, input.idempotencyKey);
      if (!operation) {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }
      if (operation.request_hash !== input.requestHash) {
        await client.query('ROLLBACK');
        return { kind: 'idempotency_mismatch' };
      }
      if (operation.status === 'failed') {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }
      if (operation.status === 'completed') {
        await client.query('COMMIT');
        return { kind: 'completed', receipt: mapCompletion(input.key, operation) };
      }
      if (
        operation.lease_token !== input.leaseToken ||
        !isLeaseActive(operation.lease_expires_at, input.nowIso)
      ) {
        await client.query('ROLLBACK');
        return { kind: 'lease_lost' };
      }

      const authority = await this.readAuthorityForUpdate(client, input.key);
      if (authority && authority.revision !== input.expectedRevision) {
        await client.query('ROLLBACK');
        return { kind: 'authority_conflict' };
      }
      const completedSiblingProtectsAuthority = await this.hasCompletedOperationForAuthority(
        client,
        input.key,
        operation
      );
      if (authority && !completedSiblingProtectsAuthority) {
        await client.query(
          withTimeout(this.config.queryTimeoutMs, {
            text: `
              DELETE FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
              WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3 AND canvas_id = $4
            `,
            values: keyValues(input.key),
          })
        );
      }
      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            UPDATE ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
            SET status = 'failed', result_json = NULL, lease_token = NULL,
                lease_expires_at = NULL, failure_code = 'projection_failed',
                updated_at = $6::timestamptz
            WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
              AND canvas_id = $4 AND idempotency_key = $5
          `,
          values: [...operationKeyValues(input), input.nowIso],
        })
      );
      await client.query('COMMIT');
      return { kind: 'failed' };
    } catch (error) {
      await rollbackPreservingError(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async migrateCompletedReceipts(schema: string): Promise<void> {
    const relation = await this.config.pool.query<RelationRow>(
      'SELECT to_regclass($1) AS relation_name',
      [`${this.config.schema}.dbt_project_import_receipts`]
    );
    if (!relation.rows[0]?.relation_name) return;
    await this.config.pool.query(`
      INSERT INTO ${schema}.dbt_project_import_operations
        (tenant_id, project_id, environment_id, canvas_id, idempotency_key,
         request_hash, status, binding_json, authority_revision, lease_token,
         lease_expires_at, result_json, failure_code, started_at, updated_at)
      SELECT r.tenant_id, r.project_id, r.environment_id, r.canvas_id, r.idempotency_key,
             r.request_hash, 'completed', a.binding_json, a.revision, NULL,
             NULL, r.result_json, NULL, a.updated_at, a.updated_at
      FROM ${schema}.dbt_project_import_receipts r
      JOIN ${schema}.canvas_authoring_authorities a
        USING (tenant_id, project_id, environment_id, canvas_id)
      ON CONFLICT (tenant_id, project_id, environment_id, canvas_id, idempotency_key)
        DO NOTHING
    `);
    await this.config.pool.query(`DROP TABLE ${schema}.dbt_project_import_receipts`);
  }

  private async resolveExistingOperation(
    _client: PoolClient,
    input: BeginInput,
    operation: OperationRow
  ): Promise<DbtProjectImportProcessBeginResult | null> {
    if (operation.request_hash !== input.requestHash) return { kind: 'idempotency_mismatch' };
    if (operation.status === 'completed') {
      return { kind: 'completed', receipt: mapCompletion(input.key, operation) };
    }
    if (
      operation.status === 'in_progress' &&
      isLeaseActive(operation.lease_expires_at, input.nowIso)
    ) {
      return {
        kind: 'in_progress',
        leaseExpiresAt: asIsoString(operation.lease_expires_at!),
      };
    }
    return null;
  }

  private async ensureAuthority(
    client: PoolClient,
    input: BeginInput,
    binding: ReturnType<typeof CanvasAuthoringAuthorityBindingSchema.parse>
  ): Promise<
    | { readonly kind: 'ready'; readonly record: CanvasAuthoringAuthorityStoredRecord }
    | {
        readonly kind: 'blocked';
        readonly result: Extract<
          DbtProjectImportProcessBeginResult,
          { kind: 'canvas_occupied' | 'conflict' }
        >;
      }
  > {
    const current = await this.readAuthorityForUpdate(client, input.key);
    if (current) {
      if (current.revision === input.revision && sameBinding(current.binding, binding)) {
        return { kind: 'ready', record: current };
      }
      return { kind: 'blocked', result: { kind: 'conflict', current } };
    }
    if (await this.isCanvasOccupiedByGraphDraft(client, input.key)) {
      return { kind: 'blocked', result: { kind: 'canvas_occupied' } };
    }

    await client.query(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          INSERT INTO ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
            (tenant_id, project_id, environment_id, canvas_id, binding_json, revision, updated_at)
          VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz)
        `,
        values: [...keyValues(input.key), JSON.stringify(binding), input.revision, input.nowIso],
      })
    );
    await client.query(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          INSERT INTO ${quoteIdentifier(this.config.schema)}.canvas_authoring_authority_idempotency
            (tenant_id, project_id, environment_id, canvas_id, idempotency_key,
             request_hash, binding_json, revision, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::timestamptz)
          ON CONFLICT (tenant_id, project_id, environment_id, canvas_id, idempotency_key)
            DO NOTHING
        `,
        values: [
          ...keyValues(input.key),
          input.idempotencyKey,
          input.requestHash,
          JSON.stringify(binding),
          input.revision,
          input.nowIso,
        ],
      })
    );
    return {
      kind: 'ready',
      record: { key: input.key, binding, revision: input.revision, updatedAt: input.nowIso },
    };
  }

  private async lockCanvas(client: PoolClient, key: DbtProjectImportProcessKey): Promise<void> {
    await client.query(
      withTimeout(this.config.queryTimeoutMs, {
        text: 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        values: [serializeCanvasAuthoringAuthorityKey(key)],
      })
    );
  }

  private async readOperationForUpdate(
    client: PoolClient,
    key: DbtProjectImportProcessKey,
    idempotencyKey: string
  ): Promise<OperationRow | null> {
    const result = await client.query<OperationRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, status, binding_json, authority_revision,
                 lease_token, lease_expires_at, result_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND idempotency_key = $5
          FOR UPDATE
        `,
        values: [...keyValues(key), idempotencyKey],
      })
    );
    return result.rows[0] ?? null;
  }

  private async readActiveSiblingOperationForUpdate(
    client: PoolClient,
    input: BeginInput
  ): Promise<OperationRow | null> {
    const result = await client.query<OperationRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, status, binding_json, authority_revision,
                 lease_token, lease_expires_at, result_json, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND idempotency_key <> $5
            AND status = 'in_progress' AND lease_expires_at > $6::timestamptz
          ORDER BY lease_expires_at ASC
          LIMIT 1
          FOR UPDATE
        `,
        values: [...operationKeyValues(input), input.nowIso],
      })
    );
    return result.rows[0] ?? null;
  }

  private async hasCompletedOperationForAuthority(
    client: PoolClient,
    key: DbtProjectImportProcessKey,
    operation: OperationRow
  ): Promise<boolean> {
    const result = await client.query<ExistingRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT 1 AS present
          FROM ${quoteIdentifier(this.config.schema)}.dbt_project_import_operations
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND status = 'completed'
            AND authority_revision = $5 AND binding_json = $6::jsonb
          LIMIT 1
        `,
        values: [
          ...keyValues(key),
          operation.authority_revision,
          JSON.stringify(operation.binding_json),
        ],
      })
    );
    return result.rows.length > 0;
  }

  private async readAuthorityForUpdate(
    client: PoolClient,
    key: DbtProjectImportProcessKey
  ): Promise<CanvasAuthoringAuthorityStoredRecord | null> {
    const result = await client.query<AuthorityRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, canvas_id,
                 binding_json, revision, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3 AND canvas_id = $4
          FOR UPDATE
        `,
        values: keyValues(key),
      })
    );
    return result.rows[0] ? mapAuthority(result.rows[0]) : null;
  }

  private async isCanvasOccupiedByGraphDraft(
    client: PoolClient,
    key: DbtProjectImportProcessKey
  ): Promise<boolean> {
    const result = await client.query<DraftRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT draft_json
          FROM ${quoteIdentifier(this.config.schema)}.workspace_graph_drafts
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
          FOR UPDATE
        `,
        values: keyValues(key).slice(0, 3),
      })
    );
    const row = result.rows[0];
    if (!row) return false;
    const parsed = WorkspaceGraphAuthoringDraftSchema.safeParse(row.draft_json);
    if (!parsed.success) return true;
    return (
      parsed.data.canvas.id === key.canvasId ||
      parsed.data.activeCanvasId === key.canvasId ||
      parsed.data.canvases?.some((workspace) => workspace.canvas.id === key.canvasId) === true
    );
  }
}

function operationKeyValues(input: {
  readonly key: DbtProjectImportProcessKey;
  readonly idempotencyKey: string;
}): string[] {
  return [...keyValues(input.key), input.idempotencyKey];
}

function keyValues(key: DbtProjectImportProcessKey): string[] {
  return [key.tenantId, key.projectId, key.environmentId, key.canvasId];
}

function mapCompletion(
  key: DbtProjectImportProcessKey,
  row: OperationRow
): DbtProjectImportStoredCompletion {
  if (row.status !== 'completed' || row.result_json === null) {
    throw new Error('The dbt project import process is not completed.');
  }
  const result = DbtProjectImportResultSchema.parse(row.result_json);
  assertCanvasId(key, result.authorityBinding.canvasId);
  return { requestHash: row.request_hash, result };
}

function mapAuthority(row: AuthorityRow): CanvasAuthoringAuthorityStoredRecord {
  return {
    key: {
      tenantId: row.tenant_id,
      projectId: row.project_id,
      environmentId: row.environment_id,
      canvasId: row.canvas_id,
    },
    binding: CanvasAuthoringAuthorityBindingSchema.parse(row.binding_json),
    revision: row.revision,
    updatedAt: asIsoString(row.updated_at),
  };
}

function assertCanvasId(key: DbtProjectImportProcessKey, canvasId: string): void {
  if (key.canvasId !== canvasId) {
    throw new Error('The dbt project import payload does not match its persistence key.');
  }
}

function sameBinding(left: unknown, right: unknown): boolean {
  return (
    JSON.stringify(CanvasAuthoringAuthorityBindingSchema.parse(left)) ===
    JSON.stringify(CanvasAuthoringAuthorityBindingSchema.parse(right))
  );
}

function isLeaseActive(value: Date | string | null, nowIso: string): boolean {
  return value !== null && new Date(value).getTime() > new Date(nowIso).getTime();
}

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withTimeout<T extends QueryConfig>(timeoutMs: number | undefined, config: T): T {
  if (!timeoutMs || timeoutMs <= 0) return config;
  return { ...config, signal: globalThis.AbortSignal.timeout(timeoutMs) };
}

async function rollbackPreservingError(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // Preserve the original transaction error.
  }
}
