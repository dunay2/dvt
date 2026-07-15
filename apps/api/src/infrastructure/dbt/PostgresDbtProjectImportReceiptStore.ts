import { DbtProjectImportResultSchema } from '@dvt/contracts';
import type { Pool, QueryConfig, QueryResultRow } from 'pg';

import type {
  DbtProjectImportReceiptKey,
  DbtProjectImportReceiptRecordResult,
  DbtProjectImportStoredReceipt,
  IDbtProjectImportReceiptStore,
} from '../../application/ports/dbtProjectImport.js';

type Config = Readonly<{
  pool: Pool;
  schema: string;
  queryTimeoutMs?: number;
}>;

interface ReceiptRow extends QueryResultRow {
  readonly request_hash: string;
  readonly result_json: unknown;
}

export class PostgresDbtProjectImportReceiptStore implements IDbtProjectImportReceiptStore {
  public constructor(private readonly config: Config) {}

  public async migrate(): Promise<void> {
    const schema = quoteIdentifier(this.config.schema);
    await this.config.pool.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.dbt_project_import_receipts (
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        environment_id TEXT NOT NULL,
        canvas_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        result_json JSONB NOT NULL,
        PRIMARY KEY (tenant_id, project_id, environment_id, canvas_id, idempotency_key),
        FOREIGN KEY (tenant_id, project_id, environment_id, canvas_id)
          REFERENCES ${schema}.canvas_authoring_authorities
            (tenant_id, project_id, environment_id, canvas_id)
          ON DELETE CASCADE
      )
    `);
  }

  public async close(): Promise<void> {}

  public async read(input: {
    key: DbtProjectImportReceiptKey;
    idempotencyKey: string;
  }): Promise<DbtProjectImportStoredReceipt | null> {
    const result = await this.config.pool.query<ReceiptRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          SELECT request_hash, result_json
          FROM ${quoteIdentifier(this.config.schema)}.dbt_project_import_receipts
          WHERE tenant_id = $1 AND project_id = $2 AND environment_id = $3
            AND canvas_id = $4 AND idempotency_key = $5
          LIMIT 1
        `,
        values: [...keyValues(input.key), input.idempotencyKey],
      })
    );
    return result.rows[0] ? mapReceiptRow(input.key, result.rows[0]) : null;
  }

  public async record(input: {
    key: DbtProjectImportReceiptKey;
    idempotencyKey: string;
    requestHash: string;
    result: DbtProjectImportStoredReceipt['result'];
  }): Promise<DbtProjectImportReceiptRecordResult> {
    const result = DbtProjectImportResultSchema.parse(input.result);
    assertResultKey(input.key, result.authorityBinding.canvasId);
    const inserted = await this.config.pool.query<ReceiptRow>(
      withTimeout(this.config.queryTimeoutMs, {
        text: `
          INSERT INTO ${quoteIdentifier(this.config.schema)}.dbt_project_import_receipts
            (tenant_id, project_id, environment_id, canvas_id, idempotency_key,
             request_hash, result_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
          ON CONFLICT (tenant_id, project_id, environment_id, canvas_id, idempotency_key)
            DO NOTHING
          RETURNING request_hash, result_json
        `,
        values: [
          ...keyValues(input.key),
          input.idempotencyKey,
          input.requestHash,
          JSON.stringify(result),
        ],
      })
    );
    const insertedRow = inserted.rows[0];
    if (insertedRow) {
      return {
        kind: 'recorded',
        receipt: mapReceiptRow(input.key, insertedRow),
        deduplicated: false,
      };
    }

    const existing = await this.read({ key: input.key, idempotencyKey: input.idempotencyKey });
    if (!existing) {
      throw new Error('The dbt project import receipt disappeared during persistence.');
    }
    if (existing.requestHash !== input.requestHash) {
      return { kind: 'idempotency_mismatch' };
    }
    return { kind: 'recorded', receipt: existing, deduplicated: true };
  }
}

function mapReceiptRow(
  key: DbtProjectImportReceiptKey,
  row: ReceiptRow
): DbtProjectImportStoredReceipt {
  const result = DbtProjectImportResultSchema.parse(row.result_json);
  assertResultKey(key, result.authorityBinding.canvasId);
  return { requestHash: row.request_hash, result };
}

function assertResultKey(key: DbtProjectImportReceiptKey, canvasId: string): void {
  if (canvasId !== key.canvasId) {
    throw new Error('The dbt project import result does not match its persistence key.');
  }
}

function keyValues(key: DbtProjectImportReceiptKey): string[] {
  return [key.tenantId, key.projectId, key.environmentId, key.canvasId];
}

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function withTimeout<T extends QueryConfig>(timeoutMs: number | undefined, config: T): T {
  if (!timeoutMs || timeoutMs <= 0) return config;
  return { ...config, signal: globalThis.AbortSignal.timeout(timeoutMs) };
}
