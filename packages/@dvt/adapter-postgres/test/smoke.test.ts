/**
 * @file packages/@dvt/adapter-postgres/test/smoke.test.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0013: bootstrapRunTx atomicity
 * @baseline ADR-0007: RunCancelRequested / RunCancelled ownership
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Verify Postgres adapter lifecycle, idempotency, outbox, snapshot write-through, and tenant isolation
 * @consequence Regression coverage for adapter-level invariants against a live PostgreSQL instance
 * @version 1.0.0
 * @date 2026-03-03
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
import type { EventInput, RunBootstrapInput, RunId } from '../src/types.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW = '2026-02-22T00:00:00.000Z';

/** Cast a plain string to the branded RunId type for test convenience. */
function rid(s: string): RunId {
  return s as RunId;
}

function requireDefined<T>(value: T | null | undefined, message: string): NonNullable<T> {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
  return value;
}

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
      logicalAttemptId: 1,
      provider: 'mock',
      providerWorkflowId: `wf-${runId}`,
      providerRunId: `pr-${runId}`,
    },
    firstEvents: [
      makeEvent({ runId, eventType: 'RunQueued', idempotencyKey: `${runId}:queued`, tenantId }),
    ],
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

  async function withAdapter(
    fn: (adapter: PostgresStateStoreAdapter) => Promise<void>
  ): Promise<void> {
    const adapter = new PostgresStateStoreAdapter({ schema, now: () => NOW });
    try {
      await adapter.migrate();
      await fn(adapter);
    } finally {
      await adapter.close();
    }
  }

  async function withClockAdapter(
    nowRef: { value: string },
    fn: (adapter: PostgresStateStoreAdapter) => Promise<void>
  ): Promise<void> {
    const adapter = new PostgresStateStoreAdapter({
      schema,
      now: () => nowRef.value,
    });
    try {
      await adapter.migrate();
      await fn(adapter);
    } finally {
      await adapter.close();
    }
  }

  // ── bootstrapRunTx ────────────────────────────────────────────────────────

  test('bootstrapRunTx: stores metadata and RunQueued event atomically', () =>
    withAdapter(async (adapter) => {
      const result = await adapter.bootstrapRunTx(makeBootstrap('run-bs-1'));

      expect(result.appended).toHaveLength(1);
      expect(result.appended[0]?.eventType).toBe('RunQueued');
      expect(result.appended[0]?.runSeq).toBe(1);
      expect(result.lastSeq).toBe(1);

      const meta = await adapter.getRunMetadataByRunId('t1', 'run-bs-1');
      expect(meta).toMatchObject({
        runId: 'run-bs-1',
        provider: 'mock',
        planId: 'plan-minimal',
        providerWorkflowId: 'wf-run-bs-1',
      });
    }));

  test('bootstrapRunTx: throws RUN_ALREADY_EXISTS on duplicate runId', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'));
      await expect(adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'))).rejects.toThrow(
        'RUN_ALREADY_EXISTS'
      );
    }));

  // ── appendAndEnqueueTx ────────────────────────────────────────────────────

  test('appendAndEnqueueTx: idempotent — second append deduplicates', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-idemp'));

      const event = makeEvent({
        runId: 'run-idemp',
        eventType: 'RunStarted',
        idempotencyKey: 'run-idemp:started',
      });
      const first = await adapter.appendAndEnqueueTx(rid('run-idemp'), [event]);
      const second = await adapter.appendAndEnqueueTx(rid('run-idemp'), [event]);

      expect(first.appended).toHaveLength(1);
      expect(first.appended[0]?.runSeq).toBe(2);
      expect(first.lastSeq).toBe(2);
      expect(second.appended).toHaveLength(0);
      expect(second.deduped).toHaveLength(1);
      expect(second.lastSeq).toBe(2);
      await expect(adapter.listEvents('t1', 'run-idemp')).resolves.toHaveLength(2);
    }));

  // ── Snapshot write-through (W0-7) ─────────────────────────────────────────

  test('getSnapshot: returns PENDING snapshot after bootstrapRunTx', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-1'));

      const snap = await adapter.getSnapshot('t1', rid('run-snap-1'));
      expect(snap).not.toBeNull();
      expect(snap?.status).toBe('PENDING');
      expect(snap?.paused).toBe(false);
      expect(snap?.cancelling).toBe(false);
    }));

  test('getSnapshot: advances to RUNNING after RunStarted', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-2'));
      await adapter.appendAndEnqueueTx(rid('run-snap-2'), [
        makeEvent({
          runId: 'run-snap-2',
          eventType: 'RunStarted',
          idempotencyKey: 'run-snap-2:started',
        }),
      ]);

      const snap = await adapter.getSnapshot('t1', rid('run-snap-2'));
      expect(snap?.status).toBe('RUNNING');
      expect(snap?.startedAt).toBe(NOW);
    }));

  // ── RunCancelRequested → cancelling=true (ADR-0007) ───────────────────────

  test('getSnapshot: sets cancelling=true on RunCancelRequested, CANCELLED on RunCancelled', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-cancel'));
      await adapter.appendAndEnqueueTx(rid('run-cancel'), [
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

      const snapCancelling = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(snapCancelling?.status).toBe('RUNNING');
      expect(snapCancelling?.cancelling).toBe(true);

      await adapter.appendAndEnqueueTx(rid('run-cancel'), [
        makeEvent({
          runId: 'run-cancel',
          eventType: 'RunCancelled',
          idempotencyKey: 'run-cancel:cancelled',
        }),
      ]);

      const snapCancelled = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(snapCancelled?.status).toBe('CANCELLED');
    }));

  // ── Outbox lifecycle ──────────────────────────────────────────────────────

  test('outbox: enqueue → listPending → markDelivered', () =>
    withAdapter(async (adapter) => {
      const { appended } = await adapter.bootstrapRunTx(makeBootstrap('run-outbox'));
      expect(appended).toHaveLength(1);

      const pending = await adapter.listPending(10);
      expect(pending.length).toBeGreaterThanOrEqual(1);
      const mine = pending.find((r) => r.payload.runId === 'run-outbox');
      const outboxRecord = requireDefined(mine, 'expected outbox record for run-outbox');

      await adapter.markDelivered([outboxRecord.id]);
      const after = await adapter.listPending(10);
      expect(after.find((r) => r.id === outboxRecord.id)).toBeUndefined();
    }));

  test('outbox: listPending only exposes the head-of-line record for a run until prior delivery', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-head-of-line'));
      await adapter.appendAndEnqueueTx(rid('run-head-of-line'), [
        makeEvent({
          runId: 'run-head-of-line',
          eventType: 'RunStarted',
          idempotencyKey: 'run-head-of-line:started',
        }),
      ]);

      const firstPending = await adapter.listPending(10);
      const head = firstPending.find((record) => record.payload.runId === 'run-head-of-line');
      const headRecord = requireDefined(head, 'expected head-of-line record');
      expect(headRecord.payload.runSeq).toBe(1);
      expect(
        firstPending.filter((record) => record.payload.runId === 'run-head-of-line')
      ).toHaveLength(1);

      const whileHeadClaimed = await adapter.listPending(10);
      expect(
        whileHeadClaimed.find((record) => record.payload.runId === 'run-head-of-line')
      ).toBeUndefined();

      await adapter.markDelivered([headRecord.id]);

      const afterHeadDelivered = await adapter.listPending(10);
      const next = afterHeadDelivered.find((record) => record.payload.runId === 'run-head-of-line');
      expect(next).toBeDefined();
      expect(next?.payload.runSeq).toBe(2);
    }));

  test('outbox: markFailed increments attempts; dead-letters after MAX_OUTBOX_ATTEMPTS', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-dl'));
      const pending = await adapter.listPending(10);
      const rec = requireDefined(
        pending.find((r) => r.payload.runId === 'run-dl'),
        'expected pending outbox record for run-dl'
      );

      // 9 failures — not yet dead-lettered (still in pending table, gated by backoff)
      for (let i = 0; i < 9; i++) {
        await adapter.markFailed(rec.id, 'transient');
      }
      const dlBefore = await adapter.listDeadLetter(10, 't1');
      expect(dlBefore.find((r) => r.originalId === rec.id)).toBeUndefined();

      // 10th failure — dead-lettered
      await adapter.markFailed(rec.id, 'final');
      const afterDL = await adapter.listPending(10);
      expect(afterDL.find((r) => r.id === rec.id)).toBeUndefined();

      const dl = await adapter.listDeadLetter(10, 't1');
      expect(dl.find((r) => r.originalId === rec.id)).toBeDefined();
    }));

  test('outbox: markFailed applies backoff via nextAttemptAt and listPending respects it', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-backoff'));

      const [rec] = await adapter.listPending(10);
      const pendingRecord = requireDefined(rec, 'expected pending outbox record for run-backoff');

      await adapter.markFailed(pendingRecord.id, 'transient-backoff');

      // Same NOW -> pending row should be gated by nextAttemptAt and not returned.
      const pendingNow = await adapter.listPending(10);
      expect(pendingNow.find((r) => r.id === pendingRecord.id)).toBeUndefined();
    }));

  test('outbox: stale claims expire and reclaim the same head-of-line record before later same-run records', async () => {
    const nowRef = { value: NOW };

    await withClockAdapter(nowRef, async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-stale-claim'));
      await adapter.appendAndEnqueueTx(rid('run-stale-claim'), [
        makeEvent({
          runId: 'run-stale-claim',
          eventType: 'RunStarted',
          idempotencyKey: 'run-stale-claim:started',
        }),
      ]);

      const firstClaim = await adapter.listPending(10);
      const claimed = firstClaim.find((record) => record.payload.runId === 'run-stale-claim');
      expect(claimed).toBeDefined();
      expect(claimed?.payload.runSeq).toBe(1);

      nowRef.value = '2026-02-22T00:04:59.000Z';
      const beforeExpiry = await adapter.listPending(10);
      expect(
        beforeExpiry.find((record) => record.payload.runId === 'run-stale-claim')
      ).toBeUndefined();

      nowRef.value = '2026-02-22T00:05:01.000Z';
      const afterExpiry = await adapter.listPending(10);
      const reclaimed = afterExpiry.find((record) => record.payload.runId === 'run-stale-claim');
      expect(reclaimed).toBeDefined();
      expect(reclaimed?.id).toBe(claimed?.id);
      expect(reclaimed?.payload.runSeq).toBe(1);
      expect(
        afterExpiry.find(
          (record) => record.payload.runId === 'run-stale-claim' && record.payload.runSeq === 2
        )
      ).toBeUndefined();
    });
  });

  test('outbox: replayDeadLetters moves records back to pending', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-replay'));
      const [rec] = await adapter.listPending(10);
      const pendingRecord = requireDefined(rec, 'expected pending outbox record for run-replay');

      for (let i = 0; i < 10; i += 1) {
        await adapter.markFailed(pendingRecord.id, `e-${i}`);
      }

      const dl = await adapter.listDeadLetter(10, 't1');
      const target = dl.find((r) => r.runId === 'run-replay');
      expect(target).toBeDefined();

      const moved = await adapter.replayDeadLetters({
        tenantId: 't1',
        runId: 'run-replay',
        limit: 1,
      });
      expect(moved).toBe(1);

      const dlAfter = await adapter.listDeadLetter(10, 't1');
      expect(dlAfter.find((r) => r.runId === 'run-replay')).toBeUndefined();

      const pendingAfter = await adapter.listPending(10);
      const replayed = pendingAfter.find((r) => r.id === pendingRecord.id);
      expect(replayed).toBeDefined();
      expect(replayed?.attempts).toBe(0);
      expect(replayed?.lastError).toBeUndefined();
      expect(replayed?.nextAttemptAt).toBeUndefined();
    }));

  // ── Multi-tenant isolation ────────────────────────────────────────────────

  test('outbox: dead-letter blocks later same-run records until replay restores the original envelope', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-dlq-block'));
      await adapter.appendAndEnqueueTx(rid('run-dlq-block'), [
        makeEvent({
          runId: 'run-dlq-block',
          eventType: 'RunStarted',
          idempotencyKey: 'run-dlq-block:started',
          payload: { synthetic: 'payload-marker' },
        }),
      ]);

      const initialPending = await adapter.listPending(10);
      const head = initialPending.find((record) => record.payload.runId === 'run-dlq-block');
      const headRecord = requireDefined(head, 'expected head-of-line record for run-dlq-block');
      expect(headRecord.payload.runSeq).toBe(1);

      for (let i = 0; i < 10; i += 1) {
        await adapter.markFailed(headRecord.id, `dlq-${i}`);
      }

      const whileDlqBlocked = await adapter.listPending(10);
      expect(
        whileDlqBlocked.find((record) => record.payload.runId === 'run-dlq-block')
      ).toBeUndefined();

      const dlq = await adapter.listDeadLetter(10, 't1');
      const deadLetter = dlq.find((record) => record.runId === 'run-dlq-block');
      expect(deadLetter).toBeDefined();
      expect(deadLetter?.payload.eventId).toBe(head?.payload.eventId);
      expect(deadLetter?.payload.runSeq).toBe(head?.payload.runSeq);
      expect(deadLetter?.payload.idempotencyKey).toBe(head?.payload.idempotencyKey);

      const moved = await adapter.replayDeadLetters({
        tenantId: 't1',
        runId: 'run-dlq-block',
        limit: 1,
      });
      expect(moved).toBe(1);

      const afterReplay = await adapter.listPending(10);
      const replayedHead = afterReplay.find((record) => record.payload.runId === 'run-dlq-block');
      const replayedHeadRecord = requireDefined(
        replayedHead,
        'expected replayed head-of-line record for run-dlq-block'
      );
      expect(replayedHeadRecord.id).toBe(headRecord.id);
      expect(replayedHeadRecord.payload).toEqual(headRecord.payload);
      expect(
        afterReplay.find(
          (record) => record.payload.runId === 'run-dlq-block' && record.payload.runSeq === 2
        )
      ).toBeUndefined();

      await adapter.markDelivered([replayedHeadRecord.id]);

      const afterHeadDelivered = await adapter.listPending(10);
      const next = afterHeadDelivered.find((record) => record.payload.runId === 'run-dlq-block');
      expect(next).toBeDefined();
      expect(next?.payload.runSeq).toBe(2);
    }));

  test('listRuns: filters by tenantId', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-t-a', 'tenant-a'));
      await adapter.bootstrapRunTx(makeBootstrap('run-t-b', 'tenant-b'));

      const forA = await adapter.listRuns({ tenantId: 'tenant-a' });
      const forB = await adapter.listRuns({ tenantId: 'tenant-b' });

      expect(forA.every((r) => r.tenantId === 'tenant-a')).toBe(true);
      expect(forB.every((r) => r.tenantId === 'tenant-b')).toBe(true);
      expect(forA.find((r) => r.runId === 'run-t-b')).toBeUndefined();
    }));

  test('tenant-scoped reads deny cross-tenant access by default', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-tenant-read-a', 'tenant-a'));
      await adapter.appendAndEnqueueTx(rid('run-tenant-read-a'), [
        makeEvent({
          runId: 'run-tenant-read-a',
          eventType: 'RunStarted',
          idempotencyKey: 'run-tenant-read-a:started',
          tenantId: 'tenant-a',
        }),
      ]);

      await expect(
        adapter.getRunMetadataByRunId('tenant-b', 'run-tenant-read-a')
      ).resolves.toBeNull();
      await expect(adapter.listEvents('tenant-b', 'run-tenant-read-a')).resolves.toHaveLength(0);
      await expect(adapter.getSnapshot('tenant-b', rid('run-tenant-read-a'))).resolves.toBeNull();
    }));

  test('saveProviderRef: rejects cross-tenant writes and allows same-tenant update', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-provider-scope', 'tenant-a'));

      await expect(
        adapter.saveProviderRef('tenant-b', rid('run-provider-scope'), {
          providerWorkflowId: 'wf-cross',
          providerRunId: 'pr-cross',
        })
      ).rejects.toThrow('RUN_NOT_FOUND_OR_FORBIDDEN');

      await adapter.saveProviderRef('tenant-a', rid('run-provider-scope'), {
        providerWorkflowId: 'wf-ok',
        providerRunId: 'pr-ok',
      });

      await expect(
        adapter.getRunMetadataByRunId('tenant-a', 'run-provider-scope')
      ).resolves.toMatchObject({
        providerWorkflowId: 'wf-ok',
        providerRunId: 'pr-ok',
      });
    }));

  test('dead-letter admin methods require tenant scope and stay tenant-bounded', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-dl-tenant-a', 'tenant-a'));
      await adapter.bootstrapRunTx(makeBootstrap('run-dl-tenant-b', 'tenant-b'));

      const pending = await adapter.listPending(20);
      const recA = pending.find((r) => r.payload.runId === 'run-dl-tenant-a');
      const recB = pending.find((r) => r.payload.runId === 'run-dl-tenant-b');
      const recordA = requireDefined(recA, 'expected pending outbox record for tenant-a');
      const recordB = requireDefined(recB, 'expected pending outbox record for tenant-b');

      for (let i = 0; i < 10; i += 1) {
        await adapter.markFailed(recordA.id, `tenant-a-${i}`);
        await adapter.markFailed(recordB.id, `tenant-b-${i}`);
      }

      await expect(adapter.listDeadLetter(10)).rejects.toThrow('TENANT_SCOPE_REQUIRED');
      await expect(
        adapter.replayDeadLetters({ runId: 'run-dl-tenant-a', limit: 1 })
      ).rejects.toThrow('TENANT_SCOPE_REQUIRED');

      const dlA = await adapter.listDeadLetter(10, 'tenant-a');
      const dlB = await adapter.listDeadLetter(10, 'tenant-b');
      expect(dlA.every((r) => r.runId === 'run-dl-tenant-a')).toBe(true);
      expect(dlB.every((r) => r.runId === 'run-dl-tenant-b')).toBe(true);

      const moved = await adapter.replayDeadLetters({
        tenantId: 'tenant-a',
        runId: 'run-dl-tenant-a',
        limit: 5,
      });
      expect(moved).toBe(1);

      const dlAAfter = await adapter.listDeadLetter(10, 'tenant-a');
      const dlBAfter = await adapter.listDeadLetter(10, 'tenant-b');
      expect(dlAAfter.find((r) => r.runId === 'run-dl-tenant-a')).toBeUndefined();
      expect(dlBAfter.find((r) => r.runId === 'run-dl-tenant-b')).toBeDefined();
    }));
});
