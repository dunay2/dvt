import { randomUUID } from 'node:crypto';
import process from 'node:process';

import { DbtProjectImportResultSchema } from '@dvt/contracts';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type {
  DbtProjectImportProcessBeginResult,
  DbtProjectImportProcessCompleteResult,
  DbtProjectImportProcessFailResult,
  IDbtProjectImportProcessStore,
} from '../../../src/application/ports/dbtProjectImport.js';
import { PostgresCanvasAuthoringAuthorityStore } from '../../../src/infrastructure/canvasAuthoringAuthority/PostgresCanvasAuthoringAuthorityStore.js';
import { PostgresDbtProjectImportProcessStore } from '../../../src/infrastructure/dbt/PostgresDbtProjectImportProcessStore.js';
import { PostgresWorkspaceGraphDraftStore } from '../../../src/infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';

const databaseUrl = process.env['DVT_PG_URL'] ?? process.env['DATABASE_URL'];
const describeWithPostgres = databaseUrl ? describe : describe.skip;
const schema = `it_dbt_import_process_${randomUUID().replaceAll('-', '')}`;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const authorityStore = pool
  ? new PostgresCanvasAuthoringAuthorityStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const draftStore = pool
  ? new PostgresWorkspaceGraphDraftStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;
const processStore = pool
  ? new PostgresDbtProjectImportProcessStore({ pool, schema, queryTimeoutMs: 5_000 })
  : null;

const KEY = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
  canvasId: 'orders-canvas',
} as const;
const BINDING = {
  schemaVersion: 'canvas-authoring-authority-binding.v1' as const,
  canvasId: KEY.canvasId,
  authority: { kind: 'dbt-project-files' as const, projectRoot: 'analytics' },
};
const RESULT = DbtProjectImportResultSchema.parse({
  schemaVersion: 'dbt-project-import-result.v1',
  success: true,
  idempotencyKey: 'import-orders',
  authorityBinding: BINDING,
  projectRevision: {
    projectRoot: 'analytics',
    contentSetSha256: 'a'.repeat(64),
    analyzedAt: '2026-07-15T10:00:00.000Z',
    analyzerVersion: 'dvt-dbt-analyzer.v1',
  },
  analysisSha256: 'b'.repeat(64),
  projectedResourceCount: 2,
  importedAt: '2026-07-15T10:00:00.000Z',
});

describeWithPostgres('PostgresDbtProjectImportProcessStore', () => {
  beforeAll(async () => {
    await draftStore!.migrate();
    await authorityStore!.migrate();
    await processStore!.migrate();
  });

  afterAll(async () => {
    await pool!.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool!.end();
  });

  beforeEach(async () => {
    await pool!.query(`TRUNCATE TABLE "${schema}".dbt_project_import_operations CASCADE`);
    await pool!.query(`TRUNCATE TABLE "${schema}".canvas_authoring_authorities CASCADE`);
  });

  it('admits only one active lease owner for concurrent equivalent starts', async () => {
    const [left, right] = await Promise.all([
      begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:01:00.000Z'),
      begin('lease-b', '2026-07-15T10:00:00.000Z', '2026-07-15T10:01:00.000Z'),
    ]);

    expect([left.kind, right.kind].sort()).toEqual(['acquired', 'in_progress']);
    await expect(authorityStore!.read(KEY)).resolves.toMatchObject({ binding: BINDING });
  });

  it('recovers an expired lease and rejects completion or compensation by the old owner', async () => {
    await begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:01:00.000Z');

    await expect(
      begin('lease-b', '2026-07-15T10:02:00.000Z', '2026-07-15T10:03:00.000Z')
    ).resolves.toMatchObject({ kind: 'acquired', leaseToken: 'lease-b', recovered: true });
    await expect(complete('lease-a')).resolves.toEqual({ kind: 'lease_lost' });
    await expect(fail('lease-a')).resolves.toEqual({ kind: 'lease_lost' });

    await expect(fail('lease-b')).resolves.toEqual({ kind: 'failed' });
    await expect(authorityStore!.read(KEY)).resolves.toBeNull();
    await expect(
      begin('lease-c', '2026-07-15T10:04:00.000Z', '2026-07-15T10:05:00.000Z')
    ).resolves.toMatchObject({ kind: 'acquired', leaseToken: 'lease-c', recovered: true });
  });

  it('rejects an expired owner before another worker acquires recovery', async () => {
    await begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:01:00.000Z');

    await expect(complete('lease-a')).resolves.toEqual({ kind: 'lease_lost' });
    await expect(fail('lease-a')).resolves.toEqual({ kind: 'lease_lost' });
    await expect(authorityStore!.read(KEY)).resolves.toMatchObject({ binding: BINDING });
  });

  it('keeps a completed result authoritative over later compensation attempts', async () => {
    await begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:03:00.000Z');

    await expect(complete('lease-a')).resolves.toMatchObject({
      kind: 'completed',
      deduplicated: false,
      receipt: { requestHash: 'request-a', result: RESULT },
    });
    await expect(fail('lease-a')).resolves.toMatchObject({
      kind: 'completed',
      receipt: { result: RESULT },
    });
    await expect(processStore!.readCompleted(operationKey())).resolves.toEqual({
      requestHash: 'request-a',
      result: RESULT,
    });
    await expect(authorityStore!.read(KEY)).resolves.toMatchObject({ binding: BINDING });
  });

  it('fails closed when an idempotency key is reused for another request', async () => {
    await begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:01:00.000Z');

    await expect(
      processStore!.begin({
        ...beginInput('lease-b', '2026-07-15T10:02:00.000Z', '2026-07-15T10:03:00.000Z'),
        requestHash: 'request-b',
      })
    ).resolves.toEqual({ kind: 'idempotency_mismatch' });
  });

  it('keeps request identity authoritative after a process has failed', async () => {
    await begin('lease-a', '2026-07-15T10:00:00.000Z', '2026-07-15T10:03:00.000Z');
    await expect(fail('lease-a')).resolves.toEqual({ kind: 'failed' });

    await expect(complete('lease-a', 'request-b')).resolves.toEqual({
      kind: 'idempotency_mismatch',
    });
    await expect(fail('lease-a', 'request-b')).resolves.toEqual({
      kind: 'idempotency_mismatch',
    });
  });
});

function begin(
  leaseToken: string,
  nowIso: string,
  leaseExpiresAt: string
): Promise<DbtProjectImportProcessBeginResult> {
  return processStore!.begin(beginInput(leaseToken, nowIso, leaseExpiresAt));
}

function beginInput(
  leaseToken: string,
  nowIso: string,
  leaseExpiresAt: string
): Parameters<IDbtProjectImportProcessStore['begin']>[0] {
  return {
    key: KEY,
    idempotencyKey: RESULT.idempotencyKey,
    requestHash: 'request-a',
    binding: BINDING,
    revision: 'authority-1',
    leaseToken,
    leaseExpiresAt,
    nowIso,
  };
}

function complete(
  leaseToken: string,
  requestHash = 'request-a'
): Promise<DbtProjectImportProcessCompleteResult> {
  return processStore!.complete({
    ...operationKey(),
    requestHash,
    leaseToken,
    result: RESULT,
    nowIso: '2026-07-15T10:02:00.000Z',
  });
}

function fail(
  leaseToken: string,
  requestHash = 'request-a'
): Promise<DbtProjectImportProcessFailResult> {
  return processStore!.fail({
    ...operationKey(),
    requestHash,
    leaseToken,
    expectedRevision: 'authority-1',
    nowIso: '2026-07-15T10:02:00.000Z',
  });
}

function operationKey(): { readonly key: typeof KEY; readonly idempotencyKey: string } {
  return { key: KEY, idempotencyKey: RESULT.idempotencyKey };
}
