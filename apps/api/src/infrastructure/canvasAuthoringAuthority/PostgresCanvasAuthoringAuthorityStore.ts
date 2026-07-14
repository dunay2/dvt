import { CanvasAuthoringAuthorityBindingSchema } from '@dvt/contracts';
import type { Pool, PoolClient, QueryConfig, QueryResultRow } from 'pg';

import type {
  CanvasAuthoringAuthorityBindResult,
  CanvasAuthoringAuthorityKey,
  CanvasAuthoringAuthorityReleaseResult,
  CanvasAuthoringAuthorityStoredRecord,
  ICanvasAuthoringAuthorityStore,
} from '../../application/ports/canvasAuthoringAuthority.js';

interface Config {
  readonly pool: Pool;
  readonly schema: string;
  readonly queryTimeoutMs?: number;
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

interface IdempotencyRow extends QueryResultRow {
  readonly request_hash: string;
  readonly binding_json: unknown;
  readonly revision: string;
  readonly updated_at: Date | string;
}

export class PostgresCanvasAuthoringAuthorityStore implements ICanvasAuthoringAuthorityStore {
  public constructor(private readonly config: Config) {}

  public async migrate(): Promise<void> {
    const schema = quoteIdentifier(this.config.schema);
    await this.config.pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.canvas_authoring_authorities (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        canvas_id TEXT NOT NULL,
        binding_json JSONB NOT NULL,
        revision TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, canvas_id)
      )
    `);
    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.canvas_authoring_authority_idempotency (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        canvas_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        binding_json JSONB NOT NULL,
        revision TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, canvas_id, idempotency_key),
        FOREIGN KEY (tenant_id, project_id, environment_id, canvas_id)
          REFERENCES ${schema}.canvas_authoring_authorities
            (tenant_id, project_id, environment_id, canvas_id)
          ON DELETE CASCADE
      )
    `);
  }

  public async close(): Promise<void> {}

  public async read(
    key: CanvasAuthoringAuthorityKey
  ): Promise<CanvasAuthoringAuthorityStoredRecord | null> {
    const result = await this.config.pool.query<AuthorityRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT tenant_id, project_id, environment_id, canvas_id,
                 binding_json, revision, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3 AND canvas_id = $4
          LIMIT 1
        `,
        values: keyValues(key),
      })
    );
    return result.rows[0] ? mapAuthorityRow(result.rows[0]) : null;
  }

  public async bind(input: {
    readonly key: CanvasAuthoringAuthorityKey;
    readonly binding: CanvasAuthoringAuthorityStoredRecord['binding'];
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly revision: string;
    readonly nowIso: string;
  }): Promise<CanvasAuthoringAuthorityBindResult> {
    const binding = CanvasAuthoringAuthorityBindingSchema.parse(input.binding);
    assertBindingKey(binding.canvasId, input.key.canvasId);
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');
      await this.lockKey(client, input.key);

      const idempotency = await this.readIdempotency(client, input.key, input.idempotencyKey);
      if (idempotency) {
        if (idempotency.request_hash !== input.requestHash) {
          await client.query('ROLLBACK');
          return { kind: 'idempotency_mismatch' };
        }
        await client.query('COMMIT');
        return {
          kind: 'bound',
          record: mapIdempotencyRow(input.key, idempotency),
          deduplicated: true,
        };
      }

      const current = await this.readForUpdate(client, input.key);
      if (current) {
        await client.query('ROLLBACK');
        return { kind: 'conflict', current };
      }

      const values = [
        ...keyValues(input.key),
        JSON.stringify(binding),
        input.revision,
        input.nowIso,
      ];
      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            INSERT INTO ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
              (tenant_id, project_id, environment_id, canvas_id, binding_json, revision, updated_at)
            VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::timestamptz)
          `,
          values,
        })
      );
      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            INSERT INTO ${quoteIdentifier(this.config.schema)}.canvas_authoring_authority_idempotency
              (tenant_id, project_id, environment_id, canvas_id, idempotency_key,
               request_hash, binding_json, revision, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::timestamptz)
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
      await client.query('COMMIT');
      return {
        kind: 'bound',
        record: {
          key: input.key,
          binding,
          revision: input.revision,
          updatedAt: input.nowIso,
        },
        deduplicated: false,
      };
    } catch (error) {
      await rollbackPreservingError(client);
      throw error;
    } finally {
      client.release();
    }
  }

  public async release(input: {
    readonly key: CanvasAuthoringAuthorityKey;
    readonly expectedRevision: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
  }): Promise<CanvasAuthoringAuthorityReleaseResult> {
    const client = await this.config.pool.connect();
    try {
      await client.query('BEGIN');
      await this.lockKey(client, input.key);
      const idempotency = await this.readIdempotency(client, input.key, input.idempotencyKey);
      if (!idempotency) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      if (idempotency.request_hash !== input.requestHash) {
        await client.query('ROLLBACK');
        return { kind: 'idempotency_mismatch' };
      }

      const current = await this.readForUpdate(client, input.key);
      if (!current) {
        await client.query('ROLLBACK');
        return { kind: 'not_found' };
      }
      if (
        current.revision !== input.expectedRevision ||
        idempotency.revision !== input.expectedRevision
      ) {
        await client.query('ROLLBACK');
        return { kind: 'conflict', currentRevision: current.revision };
      }

      await client.query(
        withTimeout(this.config.queryTimeoutMs, {
          text: `
            DELETE FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authorities
            WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3 AND canvas_id = $4
          `,
          values: keyValues(input.key),
        })
      );
      await client.query('COMMIT');
      return { kind: 'released' };
    } catch (error) {
      await rollbackPreservingError(client);
      throw error;
    } finally {
      client.release();
    }
  }

  private async lockKey(client: PoolClient, key: CanvasAuthoringAuthorityKey): Promise<void> {
    await client.query(
      withTimeout(this.config.queryTimeoutMs, {
        text: 'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        values: [keyValues(key).join('\u001f')],
      })
    );
  }

  private async readForUpdate(
    client: PoolClient,
    key: CanvasAuthoringAuthorityKey
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
    return result.rows[0] ? mapAuthorityRow(result.rows[0]) : null;
  }

  private async readIdempotency(
    client: PoolClient,
    key: CanvasAuthoringAuthorityKey,
    idempotencyKey: string
  ): Promise<IdempotencyRow | null> {
    const result = await client.query<IdempotencyRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, binding_json, revision, updated_at
          FROM ${quoteIdentifier(this.config.schema)}.canvas_authoring_authority_idempotency
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND idempotency_key = $5
          FOR UPDATE
        `,
        values: [...keyValues(key), idempotencyKey],
      })
    );
    return result.rows[0] ?? null;
  }
}

function keyValues(key: CanvasAuthoringAuthorityKey): string[] {
  return [key.tenantId, key.projectId, key.environmentId, key.canvasId];
}

function mapAuthorityRow(row: AuthorityRow): CanvasAuthoringAuthorityStoredRecord {
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

function mapIdempotencyRow(
  key: CanvasAuthoringAuthorityKey,
  row: IdempotencyRow
): CanvasAuthoringAuthorityStoredRecord {
  return {
    key,
    binding: CanvasAuthoringAuthorityBindingSchema.parse(row.binding_json),
    revision: row.revision,
    updatedAt: asIsoString(row.updated_at),
  };
}

function assertBindingKey(bindingCanvasId: string, keyCanvasId: string): void {
  if (bindingCanvasId !== keyCanvasId) {
    throw new Error('Canvas authority binding does not match the persistence key.');
  }
}

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withTimeout<T extends QueryConfig>(timeoutMs: number | undefined, config: T): T {
  if (!timeoutMs || timeoutMs <= 0) {
    return config;
  }
  return { ...config, signal: globalThis.AbortSignal.timeout(timeoutMs) };
}

async function rollbackPreservingError(client: PoolClient): Promise<void> {
  try {
    await client.query('ROLLBACK');
  } catch {
    // The original transaction error is more actionable than rollback failure.
  }
}
