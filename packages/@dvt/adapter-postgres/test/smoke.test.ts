/**
 * @file packages/@dvt/adapter-postgres/test/smoke.test.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0013: bootstrapRunTx atomicity
 * @baseline ADR-0007: RunCancelRequested / RunCancelled ownership
 *
 * Integration tests for PostgresStateStoreAdapter.
 * Requires a live PostgreSQL instance.
 *
 * Run with:
 *   DVT_PG_INTEGRATION=1 DVT_PG_URL=postgresql://dvt:dvt@localhost:5432/dvt pnpm test
 */
import { Client } from 'pg';
import { afterAll, describe, expect, test } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/index.js';
import { quoteIdentifier } from '../src/sqlUtils.js';
import type { EventInput, RunBootstrapInput } from '../src/types.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW = '2026-02-22T00:00:00.000Z';

function makeEvent(
  overrides: Partial<EventInput> & {
    runId: string;
    eventType: EventInput['eventType'];
    idempotencyKey: string;
  }
): EventInput {
  return {
    eventId: overrides.idempotencyKey,
    eventType: overrides.eventType,
    runId: overrides.runId,
    tenantId: overrides.tenantId ?? 't1',
    projectId: overrides.projectId ?? 'p1',
    environmentId: overrides.environmentId ?? 'dev',
    planId: overrides.planId ?? 'plan-minimal',
    planVersion: overrides.planVersion ?? '1.0',
    engineAttemptId: 1,
    logicalAttemptId: 1,
    emittedAt: NOW,
    idempotencyKey: overrides.idempotencyKey,
    payload: overrides.payload,
  };
}

function makeBootstrap(runId: string, tenantId = 't1'): RunBootstrapInput {
  return {
    metadata: {
      tenantId,
      projectId: 'p1',
      environmentId: 'dev',
      runId,
      planId: 'plan-minimal',
      planVersion: '1.0',
      provider: 'mock',
      providerWorkflowId: `wf-${runId}`,
      providerRunId: `pr-${runId}`,
    },
    firstEvents: [makeEvent({ runId, eventType: 'RunQueued', idempotencyKey: `${runId}:queued` })],
  };
}

// ─── Suite ───────────────────────────────────────────────────────────────────

describeIfPg('adapter-postgres integration (real PostgreSQL)', () => {
  const schema = `dvt_it_${Date.now()}`;

  afterAll(async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) return;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
    } finally {
      await client.end();
    }
  });

  // ── bootstrapRunTx ────────────────────────────────────────────────────────

  test('bootstrapRunTx: stores metadata and RunQueued event atomically', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      const result = await adapter.bootstrapRunTx(makeBootstrap('run-bs-1'));

      expect(result.appended).toHaveLength(1);
      expect(result.appended[0]?.eventType).toBe('RunQueued');
      expect(result.appended[0]?.runSeq).toBe(1);

      const meta = await adapter.getRunMetadataByRunId('run-bs-1');
      expect(meta).toMatchObject({
        runId: 'run-bs-1',
        provider: 'mock',
        planId: 'plan-minimal',
        providerWorkflowId: 'wf-run-bs-1',
      });
    } finally {
      await adapter.close();
    }
  });

  test('bootstrapRunTx: throws RUN_ALREADY_EXISTS on duplicate runId', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'));
      await expect(adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'))).rejects.toThrow(
        'RUN_ALREADY_EXISTS'
      );
    } finally {
      await adapter.close();
    }
  });

  // ── appendAndEnqueueTx ────────────────────────────────────────────────────

  test('appendAndEnqueueTx: idempotent — second append deduplicates', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-idemp'));

      const event = makeEvent({
        runId: 'run-idemp',
        eventType: 'RunStarted',
        idempotencyKey: 'run-idemp:started',
      });
      const first = await adapter.appendAndEnqueueTx('run-idemp', [event]);
      const second = await adapter.appendAndEnqueueTx('run-idemp', [event]);

      expect(first.appended).toHaveLength(1);
      expect(first.appended[0]?.runSeq).toBe(2);
      expect(second.appended).toHaveLength(0);
      expect(second.deduped).toHaveLength(1);
      await expect(adapter.listEvents('run-idemp')).resolves.toHaveLength(2);
    } finally {
      await adapter.close();
    }
  });

  // ── Snapshot write-through (W0-7) ─────────────────────────────────────────

  test('getSnapshot: returns PENDING snapshot after bootstrapRunTx', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-1'));

      const snap = await adapter.getSnapshot('run-snap-1');
      expect(snap).not.toBeNull();
      expect(snap?.status).toBe('PENDING');
      expect(snap?.paused).toBe(false);
      expect(snap?.cancelling).toBe(false);
    } finally {
      await adapter.close();
    }
  });

  test('getSnapshot: advances to RUNNING after RunStarted', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-2'));
      await adapter.appendAndEnqueueTx('run-snap-2', [
        makeEvent({
          runId: 'run-snap-2',
          eventType: 'RunStarted',
          idempotencyKey: 'run-snap-2:started',
        }),
      ]);

      const snap = await adapter.getSnapshot('run-snap-2');
      expect(snap?.status).toBe('RUNNING');
      expect(snap?.startedAt).toBe(NOW);
    } finally {
      await adapter.close();
    }
  });

  // ── RunCancelRequested → cancelling=true (ADR-0007) ───────────────────────

  test('getSnapshot: sets cancelling=true on RunCancelRequested, CANCELLED on RunCancelled', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-cancel'));
      await adapter.appendAndEnqueueTx('run-cancel', [
        makeEvent({
          runId: 'run-cancel',
          eventType: 'RunStarted',
          idempotencyKey: 'run-cancel:started',
        }),
        makeEvent({
          runId: 'run-cancel',
          eventType: 'RunCancelRequested',
          idempotencyKey: 'run-cancel:cancel-req',
        }),
      ]);

      const snapCancelling = await adapter.getSnapshot('run-cancel');
      expect(snapCancelling?.status).toBe('RUNNING');
      expect(snapCancelling?.cancelling).toBe(true);

      await adapter.appendAndEnqueueTx('run-cancel', [
        makeEvent({
          runId: 'run-cancel',
          eventType: 'RunCancelled',
          idempotencyKey: 'run-cancel:cancelled',
        }),
      ]);

      const snapCancelled = await adapter.getSnapshot('run-cancel');
      expect(snapCancelled?.status).toBe('CANCELLED');
    } finally {
      await adapter.close();
    }
  });

  // ── Outbox lifecycle ──────────────────────────────────────────────────────

  test('outbox: enqueue → listPending → markDelivered', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      const { appended } = await adapter.bootstrapRunTx(makeBootstrap('run-outbox'));
      expect(appended).toHaveLength(1);

      const pending = await adapter.listPending(10);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      const mine = pending.find((r) => r.payload.runId === 'run-outbox');
      expect(mine).toBeDefined();

      await adapter.markDelivered([mine!.id]);
      const after = await adapter.listPending(10);
      expect(after.find((r) => r.id === mine!.id)).toBeUndefined();
    } finally {
      await adapter.close();
    }
  });

  test('outbox: markFailed increments attempts; dead-letters after MAX_OUTBOX_ATTEMPTS', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-dl'));
      const pending = await adapter.listPending(10);
      const rec = pending.find((r) => r.payload.runId === 'run-dl')!;

      // 9 failures — still pending
      for (let i = 0; i < 9; i++) {
        await adapter.markFailed(rec.id, 'transient');
      }
      const stillPending = await adapter.listPending(10);
      expect(stillPending.find((r) => r.id === rec.id)).toBeDefined();

      // 10th failure — dead-lettered
      await adapter.markFailed(rec.id, 'final');
      const afterDL = await adapter.listPending(10);
      expect(afterDL.find((r) => r.id === rec.id)).toBeUndefined();

      const dl = await adapter.listDeadLetter(10);
      expect(dl.find((r) => r.originalId === rec.id)).toBeDefined();
    } finally {
      await adapter.close();
    }
  });

  // ── Multi-tenant isolation ────────────────────────────────────────────────

  test('listRuns: filters by tenantId', async () => {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await adapter.bootstrapRunTx(makeBootstrap('run-t-a', 'tenant-a'));
      await adapter.bootstrapRunTx(makeBootstrap('run-t-b', 'tenant-b'));

      const forA = await adapter.listRuns({ tenantId: 'tenant-a' });
      const forB = await adapter.listRuns({ tenantId: 'tenant-b' });

      expect(forA.every((r) => r.tenantId === 'tenant-a')).toBe(true);
      expect(forB.every((r) => r.tenantId === 'tenant-b')).toBe(true);
      expect(forA.find((r) => r.runId === 'run-t-b')).toBeUndefined();
    } finally {
      await adapter.close();
    }
  });
});
