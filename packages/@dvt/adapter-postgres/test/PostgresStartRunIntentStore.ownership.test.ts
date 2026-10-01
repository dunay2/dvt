/**
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @baseline ADR-0031: Tenant-isolated durable intent acquisition
 * @ownedConcern Real PostgreSQL acquisition and stale-owner rejection, with two independent pools.
 */
import { randomUUID } from 'node:crypto';

import type { CreateIntentInput, StartRunIntentClaimResult } from '@dvt/engine';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PostgresStartRunIntentStore } from '../src/PostgresStartRunIntentStore.js';
import { PostgresStateStoreAdapter } from '../src/PostgresStateStoreAdapter.js';
import { quoteIdentifier } from '../src/sqlUtils.js';

import {
  assertLeastPrivilegeApplicationRole,
  usePostgresRlsProofHarness,
} from './helpers/postgresRlsProofHarness.js';
import { makeBootstrap, makeEvent, rid } from './helpers/runEventFixtures.js';

const connectionString = process.env.DVT_PG_URL;
const enabled = process.env.DVT_PG_INTEGRATION === '1' && connectionString !== undefined;

function acquired(
  result: StartRunIntentClaimResult
): Extract<StartRunIntentClaimResult, { kind: 'acquired' }> {
  if (result.kind !== 'acquired') throw new Error('Expected exclusive acquisition');
  return result;
}

describe.runIf(enabled)('PostgreSQL intent ownership', () => {
  const harness = usePostgresRlsProofHarness('dvt_owned');
  const schema = `dvt_ownership_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString });
  const appConnectionString = harness.connections.appConnectionString;
  const first = new PostgresStartRunIntentStore({
    connectionString: appConnectionString,
    schema,
    assumeSchemaReady: true,
  });
  const second = new PostgresStartRunIntentStore({
    connectionString: appConnectionString,
    schema,
    assumeSchemaReady: true,
  });
  const writerPool = new Pool({ connectionString: appConnectionString, application_name: schema });
  const state = new PostgresStateStoreAdapter({
    pool: writerPool,
    schema,
    assumeSchemaReady: true,
  });
  const input = (id: string): CreateIntentInput => ({
    intentId: id,
    tenantId: 'tenant-one',
    runId: `run-${id}`,
    provider: 'temporal',
    createdAt: new Date().toISOString(),
  });

  beforeAll(async () => {
    const intentSetup = new PostgresStartRunIntentStore({ connectionString, schema });
    const stateSetup = new PostgresStateStoreAdapter({ connectionString, schema });
    try {
      await intentSetup.migrate();
      await stateSetup.migrate();
    } finally {
      await intentSetup.close();
      await stateSetup.close();
    }
    await harness.grantStartRunIntentRuntimePrivileges(schema);
    await harness.grantStateStoreRuntimePrivileges(schema);
    await harness.withAppClient((client) =>
      assertLeastPrivilegeApplicationRole(client, harness.connections.appRole)
    );
  });
  afterAll(async () => {
    await first.close();
    await second.close();
    await state.close();
    await writerPool.end();
    await admin.query(`DROP SCHEMA ${quoteIdentifier(schema)} CASCADE`);
    await admin.end();
  });

  it('grants exactly one receipt across independent connections', async () => {
    const command = input('concurrent');
    const results = await Promise.all([first.claimIntent(command), second.claimIntent(command)]);
    expect(results.map((result) => result.kind).sort()).toEqual(['acquired', 'existing']);
    const loser = results.find((result) => result.kind === 'existing');
    expect(loser).not.toHaveProperty('receipt');
    expect(await first.getIntent(command)).not.toHaveProperty('token');
    expect(await second.getIntent(command)).toEqual(results[0]?.intent);
  });

  it('observes the winning commit even when the connection defaults to repeatable read', async () => {
    const command = input('repeatable-default');
    const applicationName = `${schema}-repeatable`;
    const pool = new Pool({
      connectionString: appConnectionString,
      max: 1,
      application_name: applicationName,
    });
    const contender = new PostgresStartRunIntentStore({ pool, schema, assumeSchemaReady: true });
    const session = await pool.connect();
    try {
      await session.query(
        'SET SESSION CHARACTERISTICS AS TRANSACTION ISOLATION LEVEL REPEATABLE READ'
      );
    } finally {
      session.release();
    }
    const blocker = await admin.connect();
    let claim: Promise<StartRunIntentClaimResult> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        `INSERT INTO ${quoteIdentifier(schema)}.start_run_intents
        (intent_id, tenant_id, run_id, provider, status, provider_outcome, compensation, reconciliation, next_reconcile_at, created_at, updated_at, revision, claim_token)
        VALUES ($1, $2, $3, $4, 'PENDING', '{"kind":"not_requested"}', '{"kind":"not_required"}',
          jsonb_build_object('kind', 'pending', 'attempts', 0, 'nextAttemptAt', transaction_timestamp()), transaction_timestamp(), clock_timestamp(), clock_timestamp(), 0, $5)`,
        [command.intentId, command.tenantId, command.runId, command.provider, randomUUID()]
      );
      claim = contender.claimIntent(command);
      let waiting = false;
      for (let attempt = 0; attempt < 200 && !waiting; attempt += 1) {
        const result = await admin.query<{ waiting: boolean }>(
          'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND cardinality(pg_blocking_pids(pid)) > 0) AS waiting',
          [applicationName]
        );
        waiting = result.rows[0]?.waiting === true;
      }
      expect(waiting).toBe(true);
      await blocker.query('COMMIT');
      expect(await claim).toMatchObject({
        kind: 'existing',
        intent: { intentId: command.intentId },
      });
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
      await Promise.allSettled([claim]);
      await contender.close();
      await pool.end();
    }
  });

  it('rotates authority exactly once for a revision and rejects every stale mutation', async () => {
    const command = input('reclaim');
    const owner = acquired(await first.claimIntent(command));
    const reclaim = { ...command, expectedRevision: owner.intent.revision, minimumAgeMs: 0 };
    const results = await Promise.all([
      first.reclaimIntent(reclaim),
      second.reclaimIntent(reclaim),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual(['acquired', 'not_acquired']);
    const before = await first.getIntent(command);
    const ref = {
      provider: 'temporal' as const,
      tenantId: command.tenantId,
      runId: 'provider-run',
      namespace: 'test',
      workflowId: command.runId,
    };
    expect(await first.markDispatched(owner.receipt, ref)).toBe('not_owner');
    expect(await first.markExpired(owner.receipt)).toBe('not_owner');
    expect(await first.markResolved(owner.receipt)).toBe('not_owner');
    expect(await first.getIntent(command)).toEqual(before);
  });

  it('checks age using store time and does not expose another tenant authority', async () => {
    const command = input('scope');
    const owner = acquired(await first.claimIntent(command));
    expect(
      await second.reclaimIntent({
        ...command,
        expectedRevision: owner.intent.revision,
        minimumAgeMs: 60_000,
      })
    ).toEqual({ kind: 'not_acquired' });
    expect(await second.getIntent({ ...command, tenantId: 'tenant-two' })).toBeNull();
    expect(await second.markResolved({ ...owner.receipt, tenantId: 'tenant-two' })).toBe('missing');
    expect(await first.getIntent(command)).toEqual(owner.intent);
  });

  type CanonicalRow = {
    metadata: unknown;
    events: unknown;
    outbox: unknown;
    snapshot: { snapshot: { status: string } } | null;
  };
  it('persists pending compensation across readers and prevents canonical adoption', async () => {
    const command = input('compensation');
    const owner = acquired(await first.claimIntent(command));
    const bootstrap = makeBootstrap(command.runId, command.tenantId);
    await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap });
    await first.authorizeDispatch(owner.receipt);
    await first.markDispatched(owner.receipt, bootstrap.metadata.providerRef);
    await first.recordReconciliation(owner.receipt, {
      kind: 'require_compensation',
      reason: 'provider_ref_failed',
    });
    await first.recordReconciliation(owner.receipt, {
      kind: 'authorize_cancel',
      executionId: 'actual-execution',
    });
    expect(await second.getIntent(command)).toMatchObject({
      status: 'DISPATCHED',
      compensation: { kind: 'required', executionId: 'actual-execution' },
      reconciliation: { kind: 'pending', attempts: 1 },
    });
    const before = await canonicalRows(command.runId);
    expect(
      await state.applyStartRunWrite(owner.receipt, {
        kind: 'bind_provider',
        providerRef: bootstrap.metadata.providerRef,
      })
    ).toBe('invalid_state');
    expect(
      await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap })
    ).toBe('invalid_state');
    expect(await canonicalRows(command.runId)).toEqual(before);
    expect(await second.markResolved(owner.receipt)).toBe('invalid_state');
    expect(
      await second.recordReconciliation(owner.receipt, {
        kind: 'confirm_compensation',
        executionId: 'another-execution',
        disposition: 'cancelled',
      })
    ).toBe('conflict');
    expect(
      await second.recordReconciliation(owner.receipt, {
        kind: 'confirm_compensation',
        executionId: 'actual-execution',
        disposition: 'terminated',
      })
    ).toBe('applied');
    expect(await first.getIntent(command)).toMatchObject({
      status: 'RESOLVED',
      compensation: { kind: 'confirmed', disposition: 'terminated' },
    });
  });
  async function canonicalRows(runId: string): Promise<CanonicalRow[]> {
    const result = await admin.query<CanonicalRow>(
      `SELECT (SELECT row_to_json(m) FROM ${quoteIdentifier(schema)}.run_metadata m WHERE run_id = $1) AS metadata,
        (SELECT jsonb_agg(to_jsonb(e) ORDER BY run_seq) FROM ${quoteIdentifier(schema)}.run_events e WHERE run_id = $1) AS events,
        (SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM ${quoteIdentifier(schema)}.outbox o WHERE run_id = $1) AS outbox,
        (SELECT row_to_json(s) FROM ${quoteIdentifier(schema)}.run_snapshots s WHERE run_id = $1) AS snapshot`,
      [runId]
    );
    return result.rows;
  }

  it('fences bootstrap, provider-reference adoption and failure atomically with ownership', async () => {
    const command = input('canonical');
    const owner = acquired(await first.claimIntent(command));
    const bootstrap = makeBootstrap(command.runId, command.tenantId);
    expect(
      await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap })
    ).toBe('applied');
    const next = await second.reclaimIntent({
      ...command,
      expectedRevision: owner.intent.revision,
      minimumAgeMs: 0,
    });
    expect(next.kind).toBe('acquired');
    const before = await canonicalRows(command.runId);
    expect(
      await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap })
    ).toBe('not_owner');
    expect(
      await state.applyStartRunWrite(owner.receipt, {
        kind: 'bind_provider',
        providerRef: { ...bootstrap.metadata.providerRef, runId: 'stale' },
      })
    ).toBe('not_owner');
    expect(
      await state.applyStartRunWrite(owner.receipt, {
        kind: 'fail',
        events: [
          makeEvent({
            runId: command.runId,
            tenantId: command.tenantId,
            eventType: 'RunFailed',
            idempotencyKey: 'stale-failure',
          }),
        ],
      })
    ).toBe('not_owner');
    expect(await canonicalRows(command.runId)).toEqual(before);
  });

  it('rejects provider adoption against a terminal event even when its snapshot is behind', async () => {
    const command = input('terminal');
    const owner = acquired(await first.claimIntent(command));
    const bootstrap = makeBootstrap(command.runId, command.tenantId);
    await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap });
    await state.appendAndEnqueueTx(rid(command.runId), [
      makeEvent({
        runId: command.runId,
        tenantId: command.tenantId,
        eventType: 'RunFailed',
        idempotencyKey: 'actual-failure',
        payload: { reason: 'WORKFLOW_FAILURE' },
      }),
    ]);
    const before = await canonicalRows(command.runId);
    expect(before[0]?.snapshot?.snapshot.status).toBe('PENDING');
    expect(
      await state.applyStartRunWrite(owner.receipt, {
        kind: 'bind_provider',
        providerRef: { ...bootstrap.metadata.providerRef, runId: 'late-provider' },
      })
    ).toBe('invalid_state');
    expect(await canonicalRows(command.runId)).toEqual(before);
  });

  it('holds the ownership fence until the canonical transaction commits', async () => {
    const command = input('locked-write');
    const owner = acquired(await first.claimIntent(command));
    const bootstrap = makeBootstrap(command.runId, command.tenantId);
    await state.applyStartRunWrite(owner.receipt, { kind: 'bootstrap', input: bootstrap });
    const blocker = await admin.connect();
    let write: Promise<unknown> | undefined;
    let reclaim: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        "SELECT pg_advisory_xact_lock(('x' || left(md5($1), 16))::bit(64)::bigint)",
        [command.runId]
      );
      write = state.applyStartRunWrite(owner.receipt, {
        kind: 'bind_provider',
        providerRef: { ...bootstrap.metadata.providerRef, runId: 'confirmed-provider' },
      });
      // Observe PostgreSQL's wait graph, not wall-clock sleeps: writer owns the intent,
      // but waits on the run lock deliberately held by this third transaction.
      let writerPid: number | undefined;
      for (let attempt = 0; attempt < 200 && writerPid === undefined; attempt += 1) {
        const result = await admin.query<{ pid: number }>(
          'SELECT pid FROM pg_stat_activity WHERE application_name = $1 AND cardinality(pg_blocking_pids(pid)) > 0',
          [schema]
        );
        writerPid = result.rows[0]?.pid;
      }
      expect(writerPid).toBeDefined();
      reclaim = second.reclaimIntent({
        ...command,
        expectedRevision: owner.intent.revision,
        minimumAgeMs: 0,
      });
      let blockedOnWriter = false;
      for (let attempt = 0; attempt < 200 && !blockedOnWriter; attempt += 1) {
        const result = await admin.query<{ blocked: boolean }>(
          'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE $1::int = ANY(pg_blocking_pids(pid))) AS blocked',
          [writerPid]
        );
        blockedOnWriter = result.rows[0]?.blocked === true;
      }
      expect(blockedOnWriter).toBe(true);
      await blocker.query('COMMIT');
      expect(await write).toBe('applied');
      expect(await reclaim).toMatchObject({ kind: 'acquired' });
      expect(
        (await state.getRunMetadataByRunId(command.tenantId, command.runId))?.providerRef.runId
      ).toBe('confirmed-provider');
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
      await Promise.allSettled([write, reclaim]);
    }
  });
});
