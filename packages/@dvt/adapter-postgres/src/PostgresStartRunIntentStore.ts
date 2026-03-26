/**
 * @file packages/@dvt/adapter-postgres/src/PostgresStartRunIntentStore.ts
 * @baseline ADR-0030: Pre-Dispatch Intent Log for startRun Crash Consistency
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision SQL-backed intent store with explicit status-transition guards
 * @consequence Intent reconciliation remains durable across process restarts
 * @version 1.0.0
 * @date 2026-03-04
 */
import type {
  CreateIntentInput,
  IStartRunIntentStore,
  StartRunIntentTransitionTarget,
  StartRunIntent,
  StartRunIntentStatus,
} from '@dvt/contracts';
import {
  getAllowedFromStatuses,
  IntentActiveConflictError,
  IntentDispatchConflictError,
  IntentInvalidTransitionError,
  IntentNotFoundError,
  StoreNotReadyError,
} from '@dvt/contracts';
import { DatabaseError, Pool } from 'pg';

import { normalizeSchema, quoteIdentifier } from './sqlUtils.js';
import { StartRunIntentSchemaManager } from './StartRunIntentSchemaManager.js';

interface IntentRow {
  intent_id: IntentId;
  tenant_id: TenantId;
  run_id: RunId;
  provider: StartRunIntent['provider'];
  status: StartRunIntentStatus;
  engine_run_ref: StartRunIntent['engineRunRef'] | null;
  created_at: IntentTimestamp;
  updated_at: IntentTimestamp;
}

type IntentId = StartRunIntent['intentId'];
type TenantId = StartRunIntent['tenantId'];
type RunId = StartRunIntent['runId'];
type IntentTimestamp = StartRunIntent['createdAt'];
type EngineRunRef = NonNullable<StartRunIntent['engineRunRef']>;
type NonDispatchTransitionTarget = Exclude<StartRunIntentTransitionTarget, 'DISPATCHED'>;
type TransitionOutcome = 'UPDATED' | 'NO_OP' | 'CONFLICT' | 'INVALID' | 'NOT_FOUND';

interface IntentIdentity {
  intentId: IntentId;
  tenantId: TenantId;
  runId: RunId;
}

interface IntentTimestamps {
  createdAt: IntentTimestamp;
  updatedAt: IntentTimestamp;
}

interface PersistedIntentState {
  identity: IntentIdentity;
  provider: StartRunIntent['provider'];
  status: StartRunIntentStatus;
  engineRunRef?: StartRunIntent['engineRunRef'];
  timestamps: IntentTimestamps;
}

interface TransitionOutcomeRow {
  outcome: TransitionOutcome;
  current_status: StartRunIntentStatus | null;
}

interface DispatchTransitionCommand {
  kind: 'dispatch';
  intentId: IntentId;
  engineRunRef: EngineRunRef;
  updatedAt: IntentTimestamp;
}

interface StatusTransitionCommand {
  kind: 'status';
  intentId: IntentId;
  targetStatus: NonDispatchTransitionTarget;
  allowedFromStatuses: readonly StartRunIntentStatus[];
  updatedAt: IntentTimestamp;
}

type TransitionCommand = DispatchTransitionCommand | StatusTransitionCommand;

interface OrphanedIntentCriteria {
  cutoffIso: IntentTimestamp;
  limit: number;
}

interface TransitionMutation {
  sql: string;
  params: unknown[];
}

const INTENT_SELECT_COLUMNS =
  'intent_id, tenant_id, run_id, provider, status, engine_run_ref, created_at, updated_at';
const DEFAULT_ORPHAN_LIMIT = 100;
const MIN_ORPHAN_LIMIT = 1;
const MAX_ORPHAN_LIMIT = 1000;
const INVALID_ORPHAN_LIMIT_MESSAGE = 'INVALID_LIMIT: listOrphaned limit must be between 1 and 1000';
const ACTIVE_INTENT_UNIQUE_INDEX = 'start_run_intents_active_run_uniq';
const PG_SQLSTATE_UNIQUE_VIOLATION = '23505';

export interface PostgresStartRunIntentStoreConfig {
  connectionString?: string;
  schema?: string;
  pool?: Pool;
  now?: () => string;
  statementTimeoutMs?: number;
  queryTimeoutMs?: number;
  schemaManager?: StartRunIntentSchemaManager;
}

export class PostgresStartRunIntentStore implements IStartRunIntentStore {
  private readonly pool: Pool;
  private readonly ownsPool: boolean;
  private readonly schema: string;
  private readonly now: () => string;
  private readonly schemaManager: StartRunIntentSchemaManager;
  private migratePromise: Promise<void> | null = null;
  private migrated = false;

  constructor(config: PostgresStartRunIntentStoreConfig = {}) {
    this.schema = normalizeSchema(config.schema ?? 'dvt');
    this.now = config.now ?? (() => new Date().toISOString());

    if (config.pool) {
      this.pool = config.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        connectionString:
          config.connectionString ??
          process.env['DVT_PG_URL'] ??
          process.env['DATABASE_URL'] ??
          'postgresql://dvt:dvt@localhost:5432/dvt',
        statement_timeout:
          config.statementTimeoutMs ?? Number(process.env['DVT_PG_STATEMENT_TIMEOUT_MS'] ?? 0),
        query_timeout: config.queryTimeoutMs ?? Number(process.env['DVT_PG_QUERY_TIMEOUT_MS'] ?? 0),
      });
      this.ownsPool = true;
    }
    this.schemaManager =
      config.schemaManager ??
      new StartRunIntentSchemaManager({
        pool: this.pool,
        schema: this.schema,
      });
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
    if (this.ownsPool) {
      await this.pool.end();
    }
  }

  async createIntent(input: CreateIntentInput): Promise<StartRunIntent> {
    this.ready();
    const now = this.now();
    let result;
    try {
      result = await this.pool.query<IntentRow>(
        `
          WITH inserted AS (
            INSERT INTO ${quoteIdentifier(this.schema)}.start_run_intents (
              intent_id,
              tenant_id,
              run_id,
              provider,
              status,
              engine_run_ref,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, 'PENDING', NULL, $5::timestamptz, $6::timestamptz)
            ON CONFLICT (intent_id) DO NOTHING
            RETURNING ${INTENT_SELECT_COLUMNS}
          )
          SELECT ${INTENT_SELECT_COLUMNS}
          FROM inserted
          UNION ALL
          SELECT ${INTENT_SELECT_COLUMNS}
          FROM ${quoteIdentifier(this.schema)}.start_run_intents
          WHERE intent_id = $1
            AND NOT EXISTS (SELECT 1 FROM inserted)
          LIMIT 1
        `,
        [input.intentId, input.tenantId, input.runId, input.provider, input.createdAt, now]
      );
    } catch (error: unknown) {
      if (isActiveIntentConflict(error)) {
        throw new IntentActiveConflictError(input.tenantId, input.runId);
      }
      throw error;
    }
    const row = result.rows[0];
    if (!row) {
      throw new IntentNotFoundError(input.intentId);
    }
    return toIntent(toPersistedIntentState(row));
  }

  async markDispatched(intentId: IntentId, engineRunRef: EngineRunRef): Promise<void> {
    this.ready();
    const command: DispatchTransitionCommand = {
      kind: 'dispatch',
      intentId,
      engineRunRef,
      updatedAt: this.now(),
    };
    const outcome = await this.resolveTransitionOutcome(command);
    this.assertTransitionOutcome(intentId, outcome, 'DISPATCHED');
  }

  async markResolved(intentId: IntentId): Promise<void> {
    await this.applyTransition(intentId, 'RESOLVED');
  }

  async markExpired(intentId: IntentId): Promise<void> {
    await this.applyTransition(intentId, 'EXPIRED');
  }

  private async applyTransition(
    intentId: IntentId,
    toStatus: NonDispatchTransitionTarget
  ): Promise<void> {
    this.ready();
    const command: StatusTransitionCommand = {
      kind: 'status',
      intentId,
      targetStatus: toStatus,
      allowedFromStatuses: getAllowedFromStatuses(toStatus),
      updatedAt: this.now(),
    };
    const outcome = await this.resolveTransitionOutcome(command);
    this.assertTransitionOutcome(intentId, outcome, toStatus);
  }

  async listOrphaned(
    thresholdMs: number,
    nowMs: number,
    limit?: number
  ): Promise<StartRunIntent[]> {
    this.ready();
    const criteria = this.buildOrphanedIntentCriteria(thresholdMs, nowMs, limit);
    const result = await this.pool.query<IntentRow>(
      `
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE (status = 'PENDING' AND created_at < $1::timestamptz)
           OR (status = 'DISPATCHED' AND updated_at < $1::timestamptz)
        ORDER BY created_at ASC
        LIMIT $2
      `,
      [criteria.cutoffIso, criteria.limit]
    );
    return result.rows.map((row) => toIntent(toPersistedIntentState(row)));
  }

  private async resolveTransitionOutcome(
    command: TransitionCommand
  ): Promise<TransitionOutcomeRow> {
    const mutation = this.buildTransitionMutation(command);
    const isDispatch = command.kind === 'dispatch';
    const result = await this.pool.query<TransitionOutcomeRow>(
      `
        WITH updated AS (
          ${mutation.sql}
        ),
        existing AS (
          SELECT status, engine_run_ref
          FROM ${quoteIdentifier(this.schema)}.start_run_intents
          WHERE intent_id = $1
        )
        SELECT
          CASE
            WHEN EXISTS (SELECT 1 FROM updated) THEN 'UPDATED'
            WHEN NOT EXISTS (SELECT 1 FROM existing) THEN 'NOT_FOUND'
            ${
              isDispatch
                ? `WHEN (SELECT status FROM existing) = 'DISPATCHED'
                     AND (SELECT engine_run_ref FROM existing) = $2::jsonb THEN 'NO_OP'
                   WHEN (SELECT status FROM existing) = 'DISPATCHED' THEN 'CONFLICT'`
                : ''
            }
            ELSE 'INVALID'
          END::text AS outcome,
          (SELECT status::text FROM existing LIMIT 1) AS current_status
      `,
      mutation.params
    );
    return this.normalizeTransitionOutcome(result.rows[0]);
  }

  private buildTransitionMutation(command: TransitionCommand): TransitionMutation {
    if (command.kind === 'dispatch') {
      return {
        sql: `
          UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
          SET status = 'DISPATCHED',
              engine_run_ref = $2::jsonb,
              updated_at = $3::timestamptz
          WHERE intent_id = $1
            AND status = 'PENDING'
          RETURNING status
        `,
        params: [command.intentId, JSON.stringify(command.engineRunRef), command.updatedAt],
      };
    }

    return {
      sql: `
        UPDATE ${quoteIdentifier(this.schema)}.start_run_intents
        SET status = $2,
            updated_at = $3::timestamptz
        WHERE intent_id = $1
          AND status::text = ANY($4::text[])
        RETURNING status
      `,
      params: [
        command.intentId,
        command.targetStatus,
        command.updatedAt,
        command.allowedFromStatuses,
      ],
    };
  }

  async getIntent(intentId: IntentId): Promise<StartRunIntent | null> {
    this.ready();
    const result = await this.pool.query<IntentRow>(
      `
        SELECT ${INTENT_SELECT_COLUMNS}
        FROM ${quoteIdentifier(this.schema)}.start_run_intents
        WHERE intent_id = $1
      `,
      [intentId]
    );
    const row = result.rows[0];
    return row ? toIntent(toPersistedIntentState(row)) : null;
  }

  private normalizeTransitionOutcome(row: TransitionOutcomeRow | undefined): TransitionOutcomeRow {
    return {
      outcome: row?.outcome ?? 'NOT_FOUND',
      current_status: row?.current_status ?? null,
    };
  }

  private assertTransitionOutcome(
    intentId: IntentId,
    transition: TransitionOutcomeRow,
    to: StartRunIntentStatus
  ): void {
    if (transition.outcome === 'UPDATED') return;
    if (transition.outcome === 'NO_OP') return;
    if (transition.outcome === 'CONFLICT') {
      throw new IntentDispatchConflictError(intentId);
    }
    if (transition.outcome === 'NOT_FOUND') {
      throw new IntentNotFoundError(intentId);
    }
    throw new IntentInvalidTransitionError(intentId, transition.current_status ?? 'UNKNOWN', to);
  }

  private buildOrphanedIntentCriteria(
    thresholdMs: number,
    nowMs: number,
    limit?: number
  ): OrphanedIntentCriteria {
    const boundedLimit = this.resolveOrphanedLimit(limit);
    return {
      cutoffIso: new Date(nowMs - thresholdMs).toISOString(),
      limit: boundedLimit,
    };
  }

  private resolveOrphanedLimit(limit?: number): number {
    if (limit === undefined) {
      return DEFAULT_ORPHAN_LIMIT;
    }
    if (limit < MIN_ORPHAN_LIMIT || limit > MAX_ORPHAN_LIMIT) {
      throw new RangeError(INVALID_ORPHAN_LIMIT_MESSAGE);
    }
    return limit;
  }

  private ready(): void {
    if (!this.migrated) {
      throw new StoreNotReadyError(
        'MIGRATE_NOT_READY: call and await store.migrate() before using the store'
      );
    }
  }
}

function toPersistedIntentState(row: IntentRow): PersistedIntentState {
  const state: PersistedIntentState = {
    identity: {
      intentId: row.intent_id,
      tenantId: row.tenant_id,
      runId: row.run_id,
    },
    provider: row.provider,
    status: row.status,
    timestamps: {
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  };
  if (row.engine_run_ref !== null) {
    state.engineRunRef = row.engine_run_ref;
  }
  return state;
}

function toIntent(state: PersistedIntentState): StartRunIntent {
  const intent: StartRunIntent = {
    intentId: state.identity.intentId,
    tenantId: state.identity.tenantId,
    runId: state.identity.runId,
    provider: state.provider,
    status: state.status,
    createdAt: state.timestamps.createdAt,
    updatedAt: state.timestamps.updatedAt,
  };
  if (state.engineRunRef !== undefined) {
    intent.engineRunRef = state.engineRunRef;
  }
  return intent;
}

function isActiveIntentConflict(error: unknown): boolean {
  if (!isPgErrorLike(error)) {
    return false;
  }

  return (
    error.code === PG_SQLSTATE_UNIQUE_VIOLATION && error.constraint === ACTIVE_INTENT_UNIQUE_INDEX
  );
}

function isPgErrorLike(error: unknown): error is DatabaseError {
  if (!(error instanceof Error)) {
    return false;
  }
  if (!('code' in error)) {
    return false;
  }
  if (!('constraint' in error)) {
    return false;
  }
  return true;
}
