/**
 * @file packages/@dvt/adapter-postgres/test/smoke.test.ts
 * @baseline ADR-0004: Event Sourcing Strategy
 * @baseline ADR-0013: bootstrapRunTx atomicity
  // RunCancelRequested -> cancelling=true (ADR-0007)
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Verify Postgres adapter lifecycle, idempotency, outbox, queue-backed snapshot rebuilds, and tenant isolation
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
import { randomUUID } from 'node:crypto';

import {
  asIsoUtcString,
  asNonBlankString,
  type ExecutionPlan,
  type PlanRef,
  type RunContext,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256Hex, sha256HexUtf8 } from '@dvt/crypto';
import { resolveOutboxShardId } from '@dvt/delivery';
import { RunAlreadyExistsError } from '@dvt/engine';
import {
  AllowAllAuthorizer,
  buildRunRecoveryService,
  IdempotencyKeyBuilder,
  PlanRefPolicy,
  RunAccessPolicy,
  SnapshotProjector,
  type IStartRunApplicationService,
} from '@dvt/engine/runtime';
import { InMemoryProviderAdapter } from '@dvt/engine/testing';
import { Client } from 'pg';
import { afterAll, describe, expect, test, vi } from 'vitest';

import { PostgresStateStoreAdapter } from '../src/index.js';
import { RUN_EVENT_STORE_ERROR_CODE } from '../src/runEventStoreErrors.js';
import { quoteIdentifier } from '../src/sqlUtils.js';
import type { EventInput, RunBootstrapInput, RunId } from '../src/types.js';

const runIntegration = process.env.DVT_PG_INTEGRATION === '1';
const describeIfPg = runIntegration ? describe : describe.skip;

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
    payloadVersion: overrides.payloadVersion ?? 1,
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
      providerRef: {
        provider: 'temporal',
        tenantId,
        namespace: 'default',
        workflowId: `wf-${runId}`,
        runId: `pr-${runId}`,
      },
    },
    firstEvents: [
      makeEvent({ runId, eventType: 'RunQueued', idempotencyKey: `${runId}:queued`, tenantId }),
    ],
  };
}

async function claimSnapshotWorkForRun(
  adapter: PostgresStateStoreAdapter,
  tenantId: string,
  runId: string
): Promise<{ tenantId: string; runId: string; claimToken: string }> {
  const claims = await adapter.claimSnapshotWork(10);
  return requireDefined(
    claims.find((claim) => claim.tenantId === tenantId && claim.runId === runId),
    `expected snapshot work claim for ${tenantId}/${runId}`
  );
}

async function rebuildClaimedSnapshot(
  adapter: PostgresStateStoreAdapter,
  tenantId: string,
  runId: string
): Promise<void> {
  const claim = await claimSnapshotWorkForRun(adapter, tenantId, runId);
  await adapter.rebuildSnapshot(tenantId, rid(runId));
  await adapter.completeSnapshotWork(tenantId, runId, claim.claimToken);
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Suite Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

describeIfPg('adapter-postgres integration (real PostgreSQL)', () => {
  const schemaPrefix = `dvt_smoke_it_${randomUUID().replaceAll('-', '_')}`;
  const createdSchemas = new Set<string>();
  let schemaCounter = 0;

  function allocateSchema(): string {
    schemaCounter += 1;
    const schema = `${schemaPrefix}_${schemaCounter}`;
    createdSchemas.add(schema);
    return schema;
  }

  afterAll(async () => {
    const connectionString = process.env.DVT_PG_URL ?? process.env.DATABASE_URL;
    if (!connectionString) return;
    const client = new Client({ connectionString });
    await client.connect();
    try {
      for (const schema of createdSchemas) {
        await client.query(`DROP SCHEMA IF EXISTS ${quoteIdentifier(schema)} CASCADE`);
      }
    } finally {
      await client.end();
    }
  });

  async function withAdapter(
    fn: (adapter: PostgresStateStoreAdapter) => Promise<void>,
    options?: { outboxShardCount?: number; outboxClaimTimeoutMs?: number }
  ): Promise<void> {
    const schema = allocateSchema();
    const adapter = new PostgresStateStoreAdapter({
      schema,
      now: () => NOW,
      outboxShardCount: options?.outboxShardCount,
      outboxClaimTimeoutMs: options?.outboxClaimTimeoutMs,
    });
    try {
      await adapter.migrate();
      await fn(adapter);
    } finally {
      await adapter.close();
    }
  }

  async function withClockAdapter(
    nowRef: { value: string },
    fn: (adapter: PostgresStateStoreAdapter) => Promise<void>,
    options?: { outboxClaimTimeoutMs?: number; lineageOutboxClaimTimeoutMs?: number }
  ): Promise<void> {
    const schema = allocateSchema();
    const adapter = new PostgresStateStoreAdapter({
      schema,
      now: () => nowRef.value,
      outboxClaimTimeoutMs: options?.outboxClaimTimeoutMs,
      lineageOutboxClaimTimeoutMs: options?.lineageOutboxClaimTimeoutMs,
    });
    try {
      await adapter.migrate();
      await fn(adapter);
    } finally {
      await adapter.close();
    }
  }

  async function withClockAdaptersOnSharedSchema(
    nowRef: { value: string },
    fn: (adapterA: PostgresStateStoreAdapter, adapterB: PostgresStateStoreAdapter) => Promise<void>,
    options?: { outboxClaimTimeoutMs?: number; lineageOutboxClaimTimeoutMs?: number }
  ): Promise<void> {
    const schema = allocateSchema();
    const adapterA = new PostgresStateStoreAdapter({
      schema,
      now: () => nowRef.value,
      outboxClaimTimeoutMs: options?.outboxClaimTimeoutMs,
      lineageOutboxClaimTimeoutMs: options?.lineageOutboxClaimTimeoutMs,
    });
    const adapterB = new PostgresStateStoreAdapter({
      schema,
      now: () => nowRef.value,
      assumeSchemaReady: true,
      outboxClaimTimeoutMs: options?.outboxClaimTimeoutMs,
      lineageOutboxClaimTimeoutMs: options?.lineageOutboxClaimTimeoutMs,
    });
    try {
      await adapterA.migrate();
      await fn(adapterA, adapterB);
    } finally {
      await adapterB.close();
      await adapterA.close();
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ bootstrapRunTx Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
        providerRef: {
          provider: 'temporal',
          namespace: 'default',
          workflowId: 'wf-run-bs-1',
        },
        planId: 'plan-minimal',
      });
    }));

  test('bootstrapRunTx: throws RUN_ALREADY_EXISTS on duplicate runId', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'));
      const rejection = adapter.bootstrapRunTx(makeBootstrap('run-bs-dup'));
      await expect(rejection).rejects.toBeInstanceOf(RunAlreadyExistsError);
      await expect(rejection).rejects.toMatchObject({
        code: 'RUN_ALREADY_EXISTS',
        runId: 'run-bs-dup',
        cause: { code: '23505', table: 'run_metadata' },
      });
    }));

  test('recoverRun: reuses a PostgreSQL recovery child after a real bootstrap collision', () =>
    withAdapter(async (store) => {
      const sourceId = 'run-recovery-engine-root';
      const childId = 'run-recovery-engine-child';
      const clock = { nowIsoUtc: () => asIsoUtcString(NOW) };
      const inputHashSha256 = '1'.repeat(64);
      const planId = sha256HexUtf8(
        jcsCanonicalize({
          metadata: { planVersion: '1.0', inputHashSha256 },
          steps: [],
        })
      );
      const plan: ExecutionPlan = {
        metadata: {
          planId,
          planVersion: '1.0',
          schemaVersion: '1.0',
          contractVersion: '1.0.0',
          inputHashSha256,
          createdAtIso: NOW,
        },
        steps: [],
      };
      const bytes = Buffer.from(JSON.stringify(plan));
      const planRef: PlanRef = {
        uri: asNonBlankString('https://plans.example/recovery.json'),
        sha256: asNonBlankString(sha256Hex(bytes)),
        schemaVersion: asNonBlankString('1.0'),
        planId: asNonBlankString(planId),
        planVersion: asNonBlankString('1.0'),
        sizeBytes: bytes.byteLength,
      };
      const source = makeBootstrap(sourceId);
      await store.bootstrapRunTx({
        metadata: { ...source.metadata, planId },
        firstEvents: source.firstEvents.map((event) => ({ ...event, planId })),
      });
      await store.appendAndEnqueueTx(rid(sourceId), [
        makeEvent({
          runId: sourceId,
          planId,
          eventType: 'RunFailed',
          idempotencyKey: sourceId + ':failed',
          payload: { reason: 'WORKFLOW_FAILURE' },
        }),
      ]);
      await store.rebuildSnapshot('t1', rid(sourceId));
      const projector = new SnapshotProjector();
      const provider = new InMemoryProviderAdapter({
        stateStore: store,
        stateStoreWrite: store,
        clock,
        projector,
      });
      const span = {
        setAttribute: vi.fn(),
        setAttributes: vi.fn(),
        recordException: vi.fn(),
        setStatus: vi.fn(),
        end: vi.fn(),
      };
      const preparedPort = vi.fn<IStartRunApplicationService['startPreparedRun']>(
        async (_plan, _context, _trace, preparation) => preparation.runRef
      );
      const recovery = buildRunRecoveryService({
        stateStoreRead: store,
        stateStoreWrite: store,
        projector,
        clock,
        idempotency: new IdempotencyKeyBuilder(),
        policy: new RunAccessPolicy({
          authorizer: new AllowAllAuthorizer(),
          planRefPolicy: new PlanRefPolicy({ allowedSchemes: ['https'] }),
        }),
        adapters: new Map([['temporal', provider]]),
        planFetcher: {
          async getStoredPlanValidationRecord() {
            return undefined;
          },
          async fetchStoredPlanArtifact() {
            return { bytes, executionPolicy: {} };
          },
          async fetchStoredPlanArtifactForValidation() {
            return { bytes, executionPolicy: {} };
          },
        },
        observability: {
          withContext: (_context, fn) => fn(),
          traces: { startSpan: () => span, withSpan: (_name, _options, fn) => fn(span) },
          logs: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
          metrics: {
            counter: () => ({ add: vi.fn() }),
            histogram: () => ({ record: vi.fn() }),
            gauge: () => ({ set: vi.fn() }),
          },
        },
        startRunApplicationService: {
          async startRun() {
            throw new Error('Recovery must use the prepared-start port');
          },
          startPreparedRun: preparedPort,
        },
      });
      const context: RunContext = {
        tenantId: asNonBlankString('t1'),
        projectId: asNonBlankString('p1'),
        environmentId: asNonBlankString('dev'),
        runId: asNonBlankString(childId),
        targetAdapter: 'temporal',
      };
      const captureState = async (): Promise<unknown[]> =>
        Promise.all(
          [sourceId, childId].map(async (runId) => ({
            metadata: await store.getRunMetadataByRunId('t1', runId),
            events: await store.listEvents('t1', runId),
            snapshot: await store.getSnapshot('t1', rid(runId)),
          }))
        );
      const createBarrier = (): { reached: Promise<void>; release: () => void } => {
        let release!: () => void;
        const reached = new Promise<void>((resolve) => {
          release = resolve;
        });
        return { reached, release };
      };
      const firstPreparing = createBarrier();
      const bothPreparing = createBarrier();
      const releaseLoser = createBarrier();
      const bootstrap = store.bootstrapRecoveryRunTx.bind(store);
      let preparations = 0;
      const intercepted = vi
        .spyOn(store, 'bootstrapRecoveryRunTx')
        .mockImplementation(async (...args) => {
          if (++preparations === 1) {
            firstPreparing.release();
            await bothPreparing.reached;
          } else {
            bothPreparing.release();
            await releaseLoser.reached;
          }
          return bootstrap(...args);
        });
      const request = { sourceRunId: sourceId, planRef, context };
      const winner = recovery.recoverRun(request);
      await Promise.race([firstPreparing.reached, winner]);
      const loser = recovery.recoverRun(request);
      const drained = Promise.allSettled([winner, loser]);
      try {
        const winnerRef = await Promise.race([
          winner,
          loser.then(() => {
            throw new Error('Recovery loser completed before its bootstrap was released');
          }),
        ]);
        const before = await captureState();
        releaseLoser.release();
        await expect(loser).resolves.toEqual(winnerRef);
        expect(preparations).toBe(2);
        expect(preparedPort.mock.calls.map((call) => call[3].disposition)).toEqual([
          'created',
          'reused',
        ]);
        expect(preparedPort.mock.calls[1]?.[3].runRef).toEqual(winnerRef);
        expect(await captureState()).toEqual(before);
      } finally {
        bothPreparing.release();
        releaseLoser.release();
        await drained;
        intercepted.mockRestore();
      }
      const next = await store.bootstrapRecoveryRunTx('t1', rid(sourceId), (reservation) => ({
        metadata: {
          ...makeBootstrap('run-recovery-engine-next').metadata,
          planId,
          logicalAttemptId: reservation.logicalAttemptId,
          parentRunId: reservation.parentRunId,
          originRunId: reservation.originRunId,
        },
        firstEvents: [],
      }));
      expect(next.reservation.logicalAttemptId).toBe(3);
    }));

  test('bootstrapRecoveryRunTx: allocates monotonic logical attempts from the origin run', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-retry-root'));

      const first = await adapter.bootstrapRecoveryRunTx(
        't1',
        rid('run-retry-root'),
        (reservation) => ({
          metadata: {
            ...makeBootstrap('run-retry-child-1').metadata,
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: reservation.parentRunId,
            originRunId: reservation.originRunId,
          },
          firstEvents: [],
        })
      );
      const second = await adapter.bootstrapRecoveryRunTx(
        't1',
        rid('run-retry-root'),
        (reservation) => ({
          metadata: {
            ...makeBootstrap('run-retry-child-2').metadata,
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: reservation.parentRunId,
            originRunId: reservation.originRunId,
          },
          firstEvents: [],
        })
      );

      expect(first.reservation).toEqual({
        parentRunId: 'run-retry-root',
        originRunId: 'run-retry-root',
        logicalAttemptId: 2,
      });
      expect(second.reservation).toEqual({
        parentRunId: 'run-retry-root',
        originRunId: 'run-retry-root',
        logicalAttemptId: 3,
      });
    }));

  test('bootstrapRecoveryRunTx: keeps originRunId stable across recovered children', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-retry-chain-root'));
      await adapter.bootstrapRunTx({
        metadata: {
          ...makeBootstrap('run-retry-chain-child').metadata,
          logicalAttemptId: 2,
          parentRunId: 'run-retry-chain-root',
          originRunId: 'run-retry-chain-root',
        },
        firstEvents: [],
      });

      const prepared = await adapter.bootstrapRecoveryRunTx(
        't1',
        rid('run-retry-chain-child'),
        (reservation) => ({
          metadata: {
            ...makeBootstrap('run-retry-chain-grandchild').metadata,
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: reservation.parentRunId,
            originRunId: reservation.originRunId,
          },
          firstEvents: [],
        })
      );
      expect(prepared.reservation).toEqual({
        parentRunId: 'run-retry-chain-child',
        originRunId: 'run-retry-chain-root',
        logicalAttemptId: 3,
      });

      await expect(
        adapter.getRunMetadataByRunId('t1', 'run-retry-chain-child')
      ).resolves.toMatchObject({
        logicalAttemptId: 2,
        parentRunId: 'run-retry-chain-root',
        originRunId: 'run-retry-chain-root',
      });
    }));

  test('bootstrapRecoveryRunTx: rolls back lineage when child bootstrap fails', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-recovery-atomic-root'));

      await expect(
        adapter.bootstrapRecoveryRunTx('t1', rid('run-recovery-atomic-root'), () => {
          throw new Error('simulated bootstrap failure');
        })
      ).rejects.toThrow('simulated bootstrap failure');

      const prepared = await adapter.bootstrapRecoveryRunTx(
        't1',
        rid('run-recovery-atomic-root'),
        (reservation) => ({
          metadata: {
            ...makeBootstrap('run-recovery-atomic-child').metadata,
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: reservation.parentRunId,
            originRunId: reservation.originRunId,
          },
          firstEvents: [],
        })
      );

      expect(prepared.reservation.logicalAttemptId).toBe(2);
      await expect(
        adapter.getRunMetadataByRunId('t1', 'run-recovery-atomic-child')
      ).resolves.toMatchObject({
        logicalAttemptId: 2,
        parentRunId: 'run-recovery-atomic-root',
        originRunId: 'run-recovery-atomic-root',
      });
    }));

  // Ã¢â€â‚¬Ã¢â€â‚¬ appendAndEnqueueTx Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  test('appendAndEnqueueTx: idempotent Ã¢â‚¬â€ second append deduplicates', () =>
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

  test('appendAndEnqueueTx: rejects events whose payload runId does not match target run', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-mismatch-guard'));

      await expect(
        adapter.appendAndEnqueueTx(rid('run-mismatch-guard'), [
          makeEvent({
            runId: 'other-run',
            eventType: 'RunStarted',
            idempotencyKey: 'other-run:started',
          }),
        ])
      ).rejects.toMatchObject({
        name: 'InvalidRunEventEnvelopeError',
        code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_ENVELOPE,
      });

      await expect(adapter.listEvents('t1', 'run-mismatch-guard')).resolves.toHaveLength(1);
    }));

  test('appendAndEnqueueTx: rejects events whose payload tenantId does not match run tenant', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-tenant-mismatch-guard', 'tenant-a'));

      await expect(
        adapter.appendAndEnqueueTx(rid('run-tenant-mismatch-guard'), [
          makeEvent({
            runId: 'run-tenant-mismatch-guard',
            tenantId: 'tenant-b',
            eventType: 'RunStarted',
            idempotencyKey: 'run-tenant-mismatch-guard:started',
          }),
        ])
      ).rejects.toMatchObject({
        name: 'InvalidRunEventTenantError',
        code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_TENANT,
      });

      await expect(
        adapter.listEvents('tenant-a', 'run-tenant-mismatch-guard')
      ).resolves.toHaveLength(1);
    }));

  test('appendAndEnqueueTx: rejects RunFailed payloads that violate per-eventType schema', () =>
    withAdapter(async (adapter) => {
      const runId = 'run-invalid-runfailed-payload';
      await adapter.bootstrapRunTx(makeBootstrap(runId));

      await expect(
        adapter.appendAndEnqueueTx(rid(runId), [
          makeEvent({
            runId,
            eventType: 'RunFailed',
            idempotencyKey: `${runId}:failed`,
            payload: { reason: 'NOT_A_VALID_REASON' } as EventInput['payload'],
          }),
        ])
      ).rejects.toMatchObject({
        name: 'InvalidRunEventSchemaError',
        code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      });

      await expect(adapter.listEvents('t1', runId)).resolves.toHaveLength(1);
    }));

  test('appendAndEnqueueTx: rejects StepCompleted payloads that violate per-eventType schema', () =>
    withAdapter(async (adapter) => {
      const runId = 'run-invalid-step-completed-payload';
      await adapter.bootstrapRunTx(makeBootstrap(runId));

      await expect(
        adapter.appendAndEnqueueTx(rid(runId), [
          makeEvent({
            runId,
            eventType: 'StepCompleted',
            idempotencyKey: `${runId}:step-completed`,
            payload: { unexpected: true } as EventInput['payload'],
          }),
        ])
      ).rejects.toMatchObject({
        name: 'InvalidRunEventSchemaError',
        code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      });

      await expect(adapter.listEvents('t1', runId)).resolves.toHaveLength(1);
    }));

  test('appendAndEnqueueTx: rejects envelopes that omit payloadVersion', () =>
    withAdapter(async (adapter) => {
      const runId = 'run-missing-payload-version';
      await adapter.bootstrapRunTx(makeBootstrap(runId));
      const invalidEnvelope = {
        ...makeEvent({
          runId,
          eventType: 'RunStarted',
          idempotencyKey: `${runId}:started`,
        }),
      } as Record<string, unknown>;
      delete invalidEnvelope['payloadVersion'];

      await expect(
        adapter.appendAndEnqueueTx(rid(runId), [invalidEnvelope as unknown as EventInput])
      ).rejects.toMatchObject({
        name: 'InvalidRunEventSchemaError',
        code: RUN_EVENT_STORE_ERROR_CODE.INVALID_EVENT_SCHEMA,
      });

      await expect(adapter.listEvents('t1', runId)).resolves.toHaveLength(1);
    }));

  test('appendAndEnqueueTx: does not consume runSeq slots for deduped entries within the same batch', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-idemp-batch'));

      const started = makeEvent({
        runId: 'run-idemp-batch',
        eventType: 'RunStarted',
        idempotencyKey: 'run-idemp-batch:started',
      });

      await adapter.appendAndEnqueueTx(rid('run-idemp-batch'), [started]);

      const second = await adapter.appendAndEnqueueTx(rid('run-idemp-batch'), [
        started,
        makeEvent({
          runId: 'run-idemp-batch',
          eventType: 'RunCancelRequested',
          idempotencyKey: 'run-idemp-batch:cancel-req',
        }),
      ]);

      expect(second.deduped).toHaveLength(1);
      expect(second.appended).toHaveLength(1);
      expect(second.appended[0]?.runSeq).toBe(3);
      expect(second.lastSeq).toBe(3);
    }));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Snapshot freshness and queued persistence Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  test('bootstrapRunTx seeds a PENDING snapshot for active runs', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-1'));

      const snap = await adapter.getSnapshot('t1', rid('run-snap-1'));
      expect(snap?.status).toBe('PENDING');
      expect(snap?.paused).toBe(false);
      expect(snap?.cancelling).toBe(false);

      const claims = await adapter.claimSnapshotWork(10);
      expect(claims.find((claim) => claim.runId === 'run-snap-1')).toBeUndefined();
    }));

  test('appendAndEnqueueTx keeps getSnapshot fresh while queued rebuild catches persisted state up', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-snap-2'));

      await adapter.appendAndEnqueueTx(rid('run-snap-2'), [
        makeEvent({
          runId: 'run-snap-2',
          eventType: 'RunStarted',
          idempotencyKey: 'run-snap-2:started',
        }),
      ]);

      const freshBeforeRebuild = await adapter.getSnapshot('t1', rid('run-snap-2'));
      expect(freshBeforeRebuild?.status).toBe('RUNNING');
      expect(freshBeforeRebuild?.startedAt).toBe(NOW);

      await rebuildClaimedSnapshot(adapter, 't1', 'run-snap-2');

      const freshAfterRebuild = await adapter.getSnapshot('t1', rid('run-snap-2'));
      expect(freshAfterRebuild?.status).toBe('RUNNING');
      expect(freshAfterRebuild?.startedAt).toBe(NOW);
    }));

  // RunCancelRequested -> cancelling=true (ADR-0007)

  test('getSnapshot applies cancellation tail events before the queued rebuild persists them', () =>
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

      const freshCancelling = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(freshCancelling?.status).toBe('RUNNING');
      expect(freshCancelling?.cancelling).toBe(true);

      await rebuildClaimedSnapshot(adapter, 't1', 'run-cancel');

      const persistedCancelling = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(persistedCancelling?.status).toBe('RUNNING');
      expect(persistedCancelling?.cancelling).toBe(true);

      await adapter.appendAndEnqueueTx(rid('run-cancel'), [
        makeEvent({
          runId: 'run-cancel',
          eventType: 'RunCancelled',
          idempotencyKey: 'run-cancel:cancelled',
        }),
      ]);

      const freshCancelled = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(freshCancelled?.status).toBe('CANCELLED');
      expect(freshCancelled?.cancelling).toBe(false);

      await rebuildClaimedSnapshot(adapter, 't1', 'run-cancel');

      const persistedCancelled = await adapter.getSnapshot('t1', rid('run-cancel'));
      expect(persistedCancelled?.status).toBe('CANCELLED');
      expect(persistedCancelled?.cancelling).toBe(false);
    }));

  // Ã¢â€â‚¬Ã¢â€â‚¬ Outbox lifecycle Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  test('outbox: enqueue Ã¢â€ â€™ listPending Ã¢â€ â€™ markDelivered', () =>
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

  test('outbox: listPendingForClaim restricts claims to owned shards', () =>
    withAdapter(
      async (adapter) => {
        const shardCount = 2;
        const shard0TenantId = findTenantIdForShard(0, shardCount);
        const shard1TenantId = findTenantIdForShard(1, shardCount);
        const shard0RunId = 'run-owned-by-tenant-shard-0';
        const shard1RunId = 'run-owned-by-tenant-shard-1';

        await adapter.bootstrapRunTx(makeBootstrap(shard0RunId, shard0TenantId));
        await adapter.bootstrapRunTx(makeBootstrap(shard1RunId, shard1TenantId));

        const shard0Pending = await adapter.listPendingForClaim(10, { shardIds: [0] });
        expect(shard0Pending).toHaveLength(1);
        expect(shard0Pending[0]?.payload.runId).toBe(shard0RunId);

        const shard1Pending = await adapter.listPendingForClaim(10, { shardIds: [1] });
        expect(shard1Pending).toHaveLength(1);
        expect(shard1Pending[0]?.payload.runId).toBe(shard1RunId);
      },
      { outboxShardCount: 2 }
    ));

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

      // 9 failures Ã¢â‚¬â€ not yet dead-lettered (still in pending table, gated by backoff)
      for (let i = 0; i < 9; i++) {
        await adapter.markFailed(rec.id, 'transient');
      }
      const dlBefore = await adapter.listDeadLetter(10, 't1');
      expect(dlBefore.find((r) => r.originalId === rec.id)).toBeUndefined();

      // 10th failure Ã¢â‚¬â€ dead-lettered
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

  test('outbox: stale claims honor a configured claim timeout before the default window', async () => {
    const nowRef = { value: NOW };

    await withClockAdapter(
      nowRef,
      async (adapter) => {
        await adapter.bootstrapRunTx(makeBootstrap('run-configured-claim'));
        await adapter.appendAndEnqueueTx(rid('run-configured-claim'), [
          makeEvent({
            runId: 'run-configured-claim',
            eventType: 'RunStarted',
            idempotencyKey: 'run-configured-claim:started',
          }),
        ]);

        const firstClaim = await adapter.listPending(10);
        const claimed = firstClaim.find(
          (record) => record.payload.runId === 'run-configured-claim'
        );
        expect(claimed).toBeDefined();
        expect(claimed?.payload.runSeq).toBe(1);

        nowRef.value = '2026-02-22T00:01:29.000Z';
        const beforeExpiry = await adapter.listPending(10);
        expect(
          beforeExpiry.find((record) => record.payload.runId === 'run-configured-claim')
        ).toBeUndefined();

        nowRef.value = '2026-02-22T00:01:31.000Z';
        const afterExpiry = await adapter.listPending(10);
        const reclaimed = afterExpiry.find(
          (record) => record.payload.runId === 'run-configured-claim'
        );
        expect(reclaimed).toBeDefined();
        expect(reclaimed?.id).toBe(claimed?.id);
        expect(reclaimed?.payload.runSeq).toBe(1);
      },
      { outboxClaimTimeoutMs: 90_000 }
    );
  });

  test('lineage outbox: stale claimed rows are reclaimable after claim-timeout expiry', async () => {
    const nowRef = { value: NOW };

    await withClockAdapter(
      nowRef,
      async (adapter) => {
        await adapter.bootstrapRunTx(makeBootstrap('run-lineage-stale-claim'));
        const events = await adapter.listEvents('t1', 'run-lineage-stale-claim');
        const event = requireDefined(events[0], 'expected bootstrap event for lineage enqueue');
        const lineageStore = adapter.getLineageOutboxStore();
        await lineageStore.enqueue('run-lineage-stale-claim', event);

        const firstClaim = await lineageStore.listPending(10);
        const claimed = firstClaim.find((record) => record.runId === 'run-lineage-stale-claim');
        expect(claimed).toBeDefined();

        nowRef.value = '2026-02-22T00:01:29.000Z';
        const beforeExpiry = await lineageStore.listPending(10);
        expect(
          beforeExpiry.find((record) => record.runId === 'run-lineage-stale-claim')
        ).toBeUndefined();

        nowRef.value = '2026-02-22T00:01:31.000Z';
        if (lineageStore.countPending) {
          const lagBeforeReclaim = await lineageStore.countPending();
          expect(lagBeforeReclaim).toBeGreaterThanOrEqual(1);
        }

        const afterExpiry = await lineageStore.listPending(10);
        const reclaimed = afterExpiry.find((record) => record.runId === 'run-lineage-stale-claim');
        expect(reclaimed).toBeDefined();
        expect(reclaimed?.id).toBe(claimed?.id);

        if (lineageStore.countPending) {
          const lagAfterReclaim = await lineageStore.countPending();
          expect(lagAfterReclaim).toBe(0);
        }
      },
      { lineageOutboxClaimTimeoutMs: 90_000 }
    );
  });

  test('lineage outbox: concurrent claimers do not double-claim and reclaim exactly once after timeout', async () => {
    const nowRef = { value: NOW };
    const claimLimit = 10;
    const configuredClaimTimeoutMs = 90_000;
    const beforeClaimExpiry = '2026-02-22T00:01:29.000Z';
    const afterClaimExpiry = '2026-02-22T00:01:31.000Z';
    const runId = 'run-lineage-concurrent-claim';

    await withClockAdaptersOnSharedSchema(
      nowRef,
      async (adapterA, adapterB) => {
        await adapterA.bootstrapRunTx(makeBootstrap(runId));
        const events = await adapterA.listEvents('t1', runId);
        const event = requireDefined(events[0], 'expected bootstrap event for lineage enqueue');
        const lineageStoreA = adapterA.getLineageOutboxStore();
        const lineageStoreB = adapterB.getLineageOutboxStore();
        await lineageStoreA.enqueue(runId, event);

        const [firstClaimsA, firstClaimsB] = await Promise.all([
          lineageStoreA.listPending(claimLimit),
          lineageStoreB.listPending(claimLimit),
        ]);
        const firstClaims = [...firstClaimsA, ...firstClaimsB].filter(
          (record) => record.runId === runId
        );
        expect(firstClaims).toHaveLength(1);
        const firstClaimedRecord = requireDefined(
          firstClaims[0],
          'expected one worker to claim the lineage record'
        );

        nowRef.value = beforeClaimExpiry;
        const beforeExpiryFromOtherWorker = await lineageStoreB.listPending(claimLimit);
        expect(
          beforeExpiryFromOtherWorker.find((record) => record.runId === runId)
        ).toBeUndefined();
        if (lineageStoreA.countPending) {
          const lagBeforeExpiry = await lineageStoreA.countPending();
          expect(lagBeforeExpiry).toBe(0);
        }

        nowRef.value = afterClaimExpiry;
        if (lineageStoreA.countPending) {
          const lagAfterExpiryBeforeReclaim = await lineageStoreA.countPending();
          expect(lagAfterExpiryBeforeReclaim).toBeGreaterThanOrEqual(1);
        }

        const [reclaimsA, reclaimsB] = await Promise.all([
          lineageStoreA.listPending(claimLimit),
          lineageStoreB.listPending(claimLimit),
        ]);
        const reclaimedRecords = [...reclaimsA, ...reclaimsB].filter(
          (record) => record.runId === runId
        );
        expect(reclaimedRecords).toHaveLength(1);
        expect(reclaimedRecords[0]?.id).toBe(firstClaimedRecord.id);

        if (lineageStoreA.countPending) {
          const lagAfterReclaim = await lineageStoreA.countPending();
          expect(lagAfterReclaim).toBe(0);
        }
      },
      { lineageOutboxClaimTimeoutMs: configuredClaimTimeoutMs }
    );
  });

  test('lineage outbox: markDelivered does not remove claims after timeout expiry', async () => {
    const nowRef = { value: NOW };
    const runId = 'run-lineage-mark-delivered-timeout-fence';
    const claimLimit = 10;
    const claimTimeoutMs = 90_000;
    const afterClaimExpiry = '2026-02-22T00:01:31.000Z';

    await withClockAdapter(
      nowRef,
      async (adapter) => {
        await adapter.bootstrapRunTx(makeBootstrap(runId));
        const events = await adapter.listEvents('t1', runId);
        const event = requireDefined(events[0], 'expected bootstrap event for lineage enqueue');
        const lineageStore = adapter.getLineageOutboxStore();
        await lineageStore.enqueue(runId, event);

        const initialClaims = await lineageStore.listPending(claimLimit);
        const claimed = requireDefined(
          initialClaims.find((record) => record.runId === runId),
          'expected initial lineage claim'
        );

        nowRef.value = afterClaimExpiry;
        await lineageStore.markDelivered([claimed.id]);

        if (lineageStore.countPending) {
          const lagBeforeReclaim = await lineageStore.countPending();
          expect(lagBeforeReclaim).toBeGreaterThanOrEqual(1);
        }

        const reclaimed = await lineageStore.listPending(claimLimit);
        const reclaimedRecord = reclaimed.find((record) => record.runId === runId);
        expect(reclaimedRecord).toBeDefined();
        expect(reclaimedRecord?.id).toBe(claimed.id);
      },
      { lineageOutboxClaimTimeoutMs: claimTimeoutMs }
    );
  });

  test('lineage outbox: markFailed returns not_found after timeout expiry and keeps event reclaimable', async () => {
    const nowRef = { value: NOW };
    const runId = 'run-lineage-mark-failed-timeout-fence';
    const claimLimit = 10;
    const claimTimeoutMs = 90_000;
    const afterClaimExpiry = '2026-02-22T00:01:31.000Z';

    await withClockAdapter(
      nowRef,
      async (adapter) => {
        await adapter.bootstrapRunTx(makeBootstrap(runId));
        const events = await adapter.listEvents('t1', runId);
        const event = requireDefined(events[0], 'expected bootstrap event for lineage enqueue');
        const lineageStore = adapter.getLineageOutboxStore();
        await lineageStore.enqueue(runId, event);

        const initialClaims = await lineageStore.listPending(claimLimit);
        const claimed = requireDefined(
          initialClaims.find((record) => record.runId === runId),
          'expected initial lineage claim'
        );

        nowRef.value = afterClaimExpiry;
        const disposition = await lineageStore.markFailed(claimed.id, 'late-failure');
        expect(disposition).toBe('not_found');

        if (lineageStore.countPending) {
          const lagBeforeReclaim = await lineageStore.countPending();
          expect(lagBeforeReclaim).toBeGreaterThanOrEqual(1);
        }

        const reclaimed = await lineageStore.listPending(claimLimit);
        const reclaimedRecord = reclaimed.find((record) => record.runId === runId);
        expect(reclaimedRecord).toBeDefined();
        expect(reclaimedRecord?.id).toBe(claimed.id);
        expect(reclaimedRecord?.attempts).toBe(0);
      },
      { lineageOutboxClaimTimeoutMs: claimTimeoutMs }
    );
  });

  test('lineage outbox: concurrent claimers split a pending batch without duplicate claims', async () => {
    const nowRef = { value: NOW };
    const claimLimit = 10;
    const claimTimeoutMs = 90_000;
    const runIds = [
      'run-lineage-batch-claim-a',
      'run-lineage-batch-claim-b',
      'run-lineage-batch-claim-c',
    ];

    await withClockAdaptersOnSharedSchema(
      nowRef,
      async (adapterA, adapterB) => {
        const lineageStoreA = adapterA.getLineageOutboxStore();
        const lineageStoreB = adapterB.getLineageOutboxStore();

        for (const runId of runIds) {
          await adapterA.bootstrapRunTx(makeBootstrap(runId));
          const events = await adapterA.listEvents('t1', runId);
          const event = requireDefined(events[0], `expected bootstrap event for ${runId}`);
          await lineageStoreA.enqueue(runId, event);
        }

        const [claimsA, claimsB] = await Promise.all([
          lineageStoreA.listPending(claimLimit),
          lineageStoreB.listPending(claimLimit),
        ]);
        const claimedTargetRecords = [...claimsA, ...claimsB].filter((record) =>
          runIds.includes(record.runId)
        );
        const uniqueClaimedIds = new Set(claimedTargetRecords.map((record) => record.id));

        expect(claimedTargetRecords).toHaveLength(runIds.length);
        expect(uniqueClaimedIds.size).toBe(runIds.length);
        for (const runId of runIds) {
          expect(claimedTargetRecords.some((record) => record.runId === runId)).toBe(true);
        }

        const [secondPassA, secondPassB] = await Promise.all([
          lineageStoreA.listPending(claimLimit),
          lineageStoreB.listPending(claimLimit),
        ]);
        const secondPassClaims = [...secondPassA, ...secondPassB].filter((record) =>
          runIds.includes(record.runId)
        );
        expect(secondPassClaims).toHaveLength(0);
      },
      { lineageOutboxClaimTimeoutMs: claimTimeoutMs }
    );
  });

  test('lineage outbox: stale worker markFailed cannot increment attempts after claim ownership changes', async () => {
    const nowRef = { value: NOW };
    const runId = 'run-lineage-stale-failed-owner-change';
    const claimLimit = 10;
    const claimTimeoutMs = 90_000;
    const afterClaimExpiry = '2026-02-22T00:01:31.000Z';
    const afterFirstBackoff = '2026-02-22T00:01:33.000Z';
    const expectedAttemptsAfterSingleFailure = 1;

    await withClockAdaptersOnSharedSchema(
      nowRef,
      async (adapterA, adapterB) => {
        await adapterA.bootstrapRunTx(makeBootstrap(runId));
        const events = await adapterA.listEvents('t1', runId);
        const event = requireDefined(events[0], 'expected bootstrap event for lineage enqueue');
        const lineageStoreA = adapterA.getLineageOutboxStore();
        const lineageStoreB = adapterB.getLineageOutboxStore();
        await lineageStoreA.enqueue(runId, event);

        const firstClaims = await lineageStoreA.listPending(claimLimit);
        const firstClaimedRecord = requireDefined(
          firstClaims.find((record) => record.runId === runId),
          'expected initial lineage claim'
        );

        nowRef.value = afterClaimExpiry;
        const reclaimedByWorkerB = await lineageStoreB.listPending(claimLimit);
        const reclaimedRecord = requireDefined(
          reclaimedByWorkerB.find((record) => record.runId === runId),
          'expected worker B reclaim after timeout'
        );
        expect(reclaimedRecord.id).toBe(firstClaimedRecord.id);

        const ownerDisposition = await lineageStoreB.markFailed(
          reclaimedRecord.id,
          'owner-worker-failure'
        );
        expect(ownerDisposition).toBe('retry_scheduled');

        const staleDisposition = await lineageStoreA.markFailed(
          firstClaimedRecord.id,
          'stale-worker-failure'
        );
        expect(staleDisposition).toBe('not_found');

        nowRef.value = afterFirstBackoff;
        const nextClaims = await lineageStoreA.listPending(claimLimit);
        const retriedRecord = requireDefined(
          nextClaims.find((record) => record.runId === runId),
          'expected retried record after first backoff'
        );
        expect(retriedRecord.attempts).toBe(expectedAttemptsAfterSingleFailure);
        expect(retriedRecord.lastError).toBe('owner-worker-failure');
      },
      { lineageOutboxClaimTimeoutMs: claimTimeoutMs }
    );
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Multi-tenant isolation Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  test('outbox: dead-letter blocks later same-run records until replay restores the original envelope', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-dlq-block'));
      await adapter.appendAndEnqueueTx(rid('run-dlq-block'), [
        makeEvent({
          runId: 'run-dlq-block',
          eventType: 'RunStarted',
          idempotencyKey: 'run-dlq-block:started',
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

  test('providerRef stays tenant-scoped and persists the bootstrapped EngineRunRef', () =>
    withAdapter(async (adapter) => {
      await adapter.bootstrapRunTx(makeBootstrap('run-provider-scope', 'tenant-a'));

      await expect(
        adapter.getRunMetadataByRunId('tenant-b', 'run-provider-scope')
      ).resolves.toBeNull();

      await expect(
        adapter.getRunMetadataByRunId('tenant-a', 'run-provider-scope')
      ).resolves.toMatchObject({
        providerRef: {
          provider: 'temporal',
          tenantId: 'tenant-a',
          namespace: 'default',
          workflowId: 'wf-run-provider-scope',
          runId: 'pr-run-provider-scope',
        },
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

function findTenantIdForShard(targetShardId: number, shardCount: number): string {
  for (let index = 0; index < 256; index += 1) {
    const candidate = `tenant-shard-${targetShardId}-${index}`;
    if (
      resolveOutboxShardId({ tenantId: candidate, runId: 'probe-run' }, shardCount) ===
      targetShardId
    ) {
      return candidate;
    }
  }
  throw new Error(`Unable to find tenant id for shard ${targetShardId}`);
}
