/**
 * @ownedConcern Durable intent acquisition, reclaim and owner-fenced lifecycle transitions.
 * @baseline ADR-0030: Pre-dispatch intent ownership
 * @baseline ADR-0031: Tenant-isolated storage
 * @decision Evaluate every transition under the same row lock used by canonical writes.
 * @consequence Losing or stale callers cannot obtain dispatch authority.
 * @version 1.0.0
 */
import {
  IntentActiveConflictError,
  IntentNotFoundError,
  StoreNotReadyError,
  type EngineRunRef,
} from '@dvt/contracts';
import { randomUuidV4 } from '@dvt/crypto';
import type {
  CreateIntentInput,
  IStartRunIntentStore,
  ReclaimStartRunIntentInput,
  ReclaimStartRunIntentResult,
  StartRunIntent,
  StartRunIntentClaimReceipt,
  StartRunIntentClaimResult,
  StartRunIntentMutationResult,
  StartRunIntentRef,
} from '@dvt/engine';
import { decideStartRunIntentCommand, type StartRunIntentCommand } from '@dvt/engine/runtime';
import type { Pool, PoolClient } from 'pg';

import { PostgresAdapterClientSession } from './PostgresAdapterClientSession.js';
import { enterPostgresMaintenanceContext } from './PostgresMaintenanceAccess.js';
import { createObservedPostgresPool } from './PostgresPoolErrorPolicy.js';
import { PostgresSchemaManager } from './PostgresSchemaManager.js';
import { POSTGRES_SERVICE_ACCESS } from './PostgresServiceAccessCapability.js';
import {
  INTENT_SELECT_COLUMNS,
  lockStartRunIntent,
  readStartRunIntent,
  toStartRunIntent,
  type StartRunIntentRow,
} from './PostgresStartRunIntentPersistence.js';
import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';
import { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';

export interface PostgresStartRunIntentStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  schemaManager?: StartRunIntentSchemaManager;
  assumeSchemaReady?: boolean;
}

export class PostgresStartRunIntentStore implements IStartRunIntentStore {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly schemaManager: StartRunIntentSchemaManager;
  private readonly clientSession: PostgresAdapterClientSession;
  private migratePromise: Promise<void> | null = null;
  private migrated = false;

  constructor(config: PostgresStartRunIntentStoreConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    const statementTimeoutMs =
      config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0);

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = createObservedPostgresPool({
        connectionString:
          config.connectionString ??
          process.env['DVT_PG_URL'] ??
          process.env['DATABASE_URL'] ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        statement_timeout: statementTimeoutMs,
        query_timeout: config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0),
      });
      this.ownsPool = true;
    }
    this.clientSession = new PostgresAdapterClientSession(this.pool, statementTimeoutMs);
    this.schemaManager =
      config.schemaManager ??
      new StartRunIntentSchemaManager({
        pool: this.pool,
        schema: this.schema,
      });
    this.migrated = config.assumeSchemaReady === true;
  }

  async migrate(): Promise<void> {
    this.migratePromise ??= this.schemaManager
      .migrate()
      .then(() => {
        this.migrated = true;
      })
      .catch((error: unknown) => {
        this.migratePromise = null;
        this.migrated = false;
        throw error;
      });
    return this.migratePromise;
  }

  async close(): Promise<void> {
    await this.clientSession.close(this.ownsPool);
  }

  async claimIntent(input: CreateIntentInput): Promise<StartRunIntentClaimResult> {
    this.ready();
    const token = randomUuidV4();
    return this.withTenantContext(input.tenantId, async (client) => {
      const inserted = await client.query<StartRunIntentRow>(
        `INSERT INTO ${quoteIdentifier(this.schema)}.start_run_intents
             (intent_id, tenant_id, run_id, provider, status, provider_outcome, compensation, reconciliation, next_reconcile_at, created_at, updated_at, revision, claim_token)
           VALUES ($1, $2, $3, $4, 'PENDING', '{"kind":"not_requested"}', '{"kind":"not_required"}',
             jsonb_build_object('kind', 'pending', 'attempts', 0, 'nextAttemptAt', transaction_timestamp()), transaction_timestamp(), $5::timestamptz, clock_timestamp(), 0, $6::uuid)
           ON CONFLICT DO NOTHING RETURNING ${INTENT_SELECT_COLUMNS}`,
        [input.intentId, input.tenantId, input.runId, input.provider, input.createdAt, token]
      );
      const row = inserted.rows[0];
      if (row) {
        const intent = toStartRunIntent(row);
        return { kind: 'acquired', intent, receipt: receiptFor(intent, token) };
      }
      // Use a fresh statement snapshot after waiting for the competing INSERT.
      const intent = await readStartRunIntent(client, this.schema, input);
      if (!intent) {
        const active = await client.query<{ present: boolean }>(
          `SELECT EXISTS (SELECT 1 FROM ${quoteIdentifier(this.schema)}.start_run_intents
              WHERE tenant_id = $1 AND run_id = $2 AND status IN ('PENDING', 'DISPATCHED')) AS present`,
          [input.tenantId, input.runId]
        );
        if (active.rows[0]?.present)
          throw new IntentActiveConflictError(input.tenantId, input.runId);
        throw new IntentNotFoundError(input.intentId);
      }
      if (intent.runId !== input.runId || intent.provider !== input.provider)
        throw new IntentActiveConflictError(input.tenantId, input.runId);
      return { kind: 'existing', intent };
    });
  }

  async reclaimIntent(input: ReclaimStartRunIntentInput): Promise<ReclaimStartRunIntentResult> {
    this.ready();
    if (!Number.isFinite(input.minimumAgeMs) || input.minimumAgeMs < 0)
      throw new RangeError('INVALID_INTENT_RECLAIM_AGE');
    const token = randomUuidV4();
    return this.withTenantContext(input.tenantId, async (client) => {
      const result = await client.query<StartRunIntentRow>(
        `UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
            SET claim_token = $4::uuid, revision = revision + 1, updated_at = clock_timestamp()
          WHERE tenant_id = $1 AND intent_id = $2 AND revision = $3
            AND status IN ('PENDING', 'DISPATCHED')
            AND reconciliation->>'kind' = 'pending'
            AND next_reconcile_at <= clock_timestamp()
            AND updated_at <= clock_timestamp() - ($5 * INTERVAL '1 millisecond')
          RETURNING ${INTENT_SELECT_COLUMNS}`,
        [input.tenantId, input.intentId, input.expectedRevision, token, input.minimumAgeMs]
      );
      const row = result.rows[0];
      if (!row) return { kind: 'not_acquired' };
      const intent = toStartRunIntent(row);
      return { kind: 'acquired', intent, receipt: receiptFor(intent, token) };
    });
  }

  markDispatched(
    receipt: StartRunIntentClaimReceipt,
    runRef: EngineRunRef
  ): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'DISPATCHED', runRef });
  }

  authorizeDispatch(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'authorize_dispatch' });
  }

  recordReconciliation(
    receipt: StartRunIntentClaimReceipt,
    command: import('@dvt/engine').ReconciliationCommand
  ): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'reconcile', command });
  }

  markResolved(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'RESOLVED' });
  }

  markExpired(receipt: StartRunIntentClaimReceipt): Promise<StartRunIntentMutationResult> {
    return this.transition(receipt, { kind: 'transition', target: 'EXPIRED' });
  }

  async getIntent(ref: StartRunIntentRef): Promise<StartRunIntent | null> {
    this.ready();
    return this.withTenantContext(ref.tenantId, (client) =>
      readStartRunIntent(client, this.schema, ref)
    );
  }

  async listOrphaned(thresholdMs: number, nowMs: number, limit = 100): Promise<StartRunIntent[]> {
    this.ready();
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
      throw new RangeError('INVALID_LIMIT: listOrphaned limit must be between 1 and 1000');
    const result = await this.clientSession.withClient(async (client) => {
      await enterPostgresMaintenanceContext(
        client,
        POSTGRES_SERVICE_ACCESS.startRunIntentReconciler
      );
      return client.query<StartRunIntentRow>(
        `SELECT ${INTENT_SELECT_COLUMNS} FROM ${quoteIdentifier(this.schema)}.start_run_intents
          WHERE status IN ('PENDING', 'DISPATCHED') AND updated_at < $1::timestamptz
            AND reconciliation->>'kind' = 'pending' AND next_reconcile_at <= $3::timestamptz
          ORDER BY created_at ASC, intent_id ASC LIMIT $2`,
        [new Date(nowMs - thresholdMs).toISOString(), limit, new Date(nowMs).toISOString()]
      );
    });
    return result.rows.map(toStartRunIntent);
  }

  private async transition(
    receipt: StartRunIntentClaimReceipt,
    command: StartRunIntentCommand
  ): Promise<StartRunIntentMutationResult> {
    this.ready();
    return this.withTenantContext(receipt.tenantId, async (client) => {
      const locked = await lockStartRunIntent(client, this.schema, receipt);
      if (locked.kind !== 'owned') return locked.kind;
      const clock = await client.query<{ now: Date }>('SELECT clock_timestamp() AS now');
      const now = clock.rows[0]?.now;
      if (!now) throw new Error('START_RUN_INTENT_STORE_CLOCK_UNAVAILABLE');
      const decision = decideStartRunIntentCommand(locked.intent, command, now.toISOString());
      if (decision.result !== 'applied') return decision.result;
      await client.query(
        `UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
            SET status = $3, provider_outcome = $4::jsonb, revision = revision + 1, updated_at = $5::timestamptz,
              compensation = $6::jsonb, reconciliation = $7::jsonb, next_reconcile_at = $8::timestamptz
          WHERE tenant_id = $1 AND intent_id = $2`,
        [
          receipt.tenantId,
          receipt.intentId,
          decision.status,
          JSON.stringify(decision.providerOutcome),
          now.toISOString(),
          JSON.stringify(decision.compensation),
          JSON.stringify(decision.reconciliation),
          decision.reconciliation.kind === 'pending' ? decision.reconciliation.nextAttemptAt : null,
        ]
      );
      return 'applied';
    });
  }

  private withTenantContext<T>(
    tenantId: string,
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return this.clientSession.withTransaction(async (client) => {
      // Conflict fallback must see the winner's commit in a new statement
      // snapshot, independently of the pooled connection's session defaults.
      await client.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
      await PostgresSchemaManager.setTenantContext(client, tenantId);
      return operation(client);
    });
  }

  private ready(): void {
    if (!this.migrated)
      throw new StoreNotReadyError(
        'MIGRATE_NOT_READY: call and await store.migrate() before using the store'
      );
  }
}

function receiptFor(intent: StartRunIntent, token: string): StartRunIntentClaimReceipt {
  return Object.freeze({
    tenantId: intent.tenantId,
    intentId: intent.intentId,
    runId: intent.runId,
    token,
  });
}
