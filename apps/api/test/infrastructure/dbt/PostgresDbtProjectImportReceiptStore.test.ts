import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { DbtProjectImportResultSchema } from '@dvt/contracts';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { DbtProjectImportReceiptRecordResult } from '../../../src/application/ports/dbtProjectImport.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresDbtProjectImportReceiptStore } from '../../../src/infrastructure/dbt/PostgresDbtProjectImportReceiptStore.js';
import { PostgresWorkspaceGraphDraftStore } from '../../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const schema = `it_dbt_import_receipt_${randomUUID().replaceAll('-', '')}`;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const authorityStore = pool
  ? new PostgresCanvasAuthoringAuthorityStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const draftStore = pool
  ? new PostgresWorkspaceGraphDraftStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const receiptStore = pool
  ? new PostgresDbtProjectImportReceiptStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;

const KEY = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  canvasId: 'orders-canvas',
} as const;
const RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: 'import-orders',
  authorityBinding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: KEY.canvasId,
    authority: { kind: 'dbt-project-files', projectRoot: 'analytics' },
  },
  projectRevision: {
    projectRoot: 'analytics',
    contentSetSha256: 'a'.repeat(64),
    analyzedAt: '2026-07-14T10:00:00.000Z',
    analyzerVersion: 'dvt-dbt-analyzer.v1',
  },
  analysisSha256: 'b'.repeat(64),
  projectedResourceCount: 2,
  importedAt: '2026-07-14T10:00:00.000Z',
});

describeWithPostgres('PostgresDbtProjectImportReceiptStore', () => {
  beforeAll(async () => {
    await draftStore!.migrate();
    await authorityStore!.migrate();
    await receiptStore!.migrate();
  });

  afterAll(async () => {
    await pool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool!.end();
  });

  beforeEach(async () => {
    await pool!.query(`TRUNCATE TABLE "${schema}".canvas_authoring_authorities CASCADE`);
    await bindAuthority();
  });

  it('persists and reads the exact accepted command result within its workspace scope', async () => {
    await expect(record('request-a')).resolves.toMatchObject({
      kind: 'recorded',
      deduplicated: false,
      receipt: { requestHash: 'request-a', result: RESULT },
    });

    await expect(
      receiptStore!.read({ key: KEY, idempotencyKey: RESULT.idempotencyKey })
    ).resolves.toEqual({ requestHash: 'request-a', result: RESULT });
    await expect(
      receiptStore!.read({
        key: { ...KEY, tenantId: 'tenant-b' },
        idempotencyKey: RESULT.idempotencyKey,
      })
    ).resolves.toBeNull();
  });

  it('deduplicates an equivalent completed import receipt', async () => {
    await record('request-a');

    await expect(record('request-a')).resolves.toMatchObject({
      kind: 'recorded',
      deduplicated: true,
      receipt: { requestHash: 'request-a', result: RESULT },
    });
  });

  it('rejects reuse of an idempotency key for another import command', async () => {
    await record('request-a');

    await expect(record('request-b')).resolves.toEqual({ kind: 'idempotency_mismatch' });
  });
});

async function bindAuthority(): Promise<void> {
  await authorityStore!.bind({
    key: KEY,
    binding: RESULT.authorityBinding,
    idempotencyKey: 'bind-orders',
    requestHash: 'bind-request',
    revision: 'authority-1',
    nowIso: RESULT.importedAt,
  });
}

async function record(requestHash: string): Promise<DbtProjectImportReceiptRecordResult> {
  return receiptStore!.record({
    key: KEY,
    idempotencyKey: RESULT.idempotencyKey,
    requestHash,
    result: RESULT,
  });
}
