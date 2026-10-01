/**
 * @file packages/@dvt/adapter-postgres/src/PostgresRunStateCoordinator.ts
 * @baseline ADR-0004: Event Sourcing Strategy (Extended)
 * @baseline ADR-0013: run state bootstrapRunTx ownership
 * @baseline ADR-0031: Storage Adapter Tenant Isolation Strategy
 * @decision Extract state/outbox transactional orchestration from facade adapter
 * @consequence PostgresStateStoreAdapter composes contract ports while this class owns write transaction flow
 * @version 1.0.0
 * @date 2026-03-28
 */
import {
  RunAlreadyExistsError,
  type StartRunIntentClaimReceipt,
  type StartRunWrite,
  type StartRunWriteResult,
  type WorkflowSnapshot,
} from '@dvt/engine';
import { matchesStartRunWriteScope, isActiveStartRunIntent } from '@dvt/engine/runtime';
import { TERMINAL_RUN_STATUSES } from '@dvt/run-domain';
import type { PoolClient } from 'pg';

import { POSTGRES_RUN_STATE_COORDINATOR_CONSTANTS as C } from './PostgresRunStateCoordinatorConstants.js';
import { lockStartRunIntent } from './PostgresStartRunIntentPersistence.js';
import type { RunEventWriteRepository } from './RunEventWriteRepository.js';
import type {
  AppendResult,
  EventEnvelope,
  EventInput,
  RecoveryRunBootstrapFactory,
  RecoveryRunBootstrapResult,
  RetryAttemptReservation,
  RunBootstrapInput,
  RunId,
  RunMetadata,
} from './types.js';

type WithTransaction = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
type SetTenantContext = (client: PoolClient, tenantId: string) => Promise<void>;

interface RunMetadataWritePort {
  saveProviderRefWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    providerRef: RunMetadata['providerRef']
  ): Promise<RunMetadata>;
  resolveTenantWithClient(client: PoolClient, runId: RunId): Promise<string>;
  insertWithClient(client: PoolClient, metadata: RunMetadata): Promise<void>;
  reserveRetryAttemptWithClient(
    client: PoolClient,
    tenantId: string,
    sourceRunId: RunId
  ): Promise<RetryAttemptReservation>;
}

interface SnapshotWritePort {
  readCanonicalStatusWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId
  ): Promise<WorkflowSnapshot['status'] | null>;
  updateWithClient(
    client: PoolClient,
    runId: RunId,
    appended: EventEnvelope[],
    baseRunSeq: number,
    lastAppendedRunSeq: number | null
  ): Promise<void>;
  validateAppendedTransitionsWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    baseRunSeq: number,
    appended: EventEnvelope[]
  ): Promise<void>;
}

interface OutboxEnqueuePort {
  enqueueWithClient(client: PoolClient, runId: RunId, events: EventEnvelope[]): Promise<void>;
}

export interface PostgresRunStateCoordinatorDeps {
  schema: string;
  metadataRepo: RunMetadataWritePort;
  runEventRepository: Pick<RunEventWriteRepository, 'append'>;
  snapshotStore: SnapshotWritePort;
  outboxStore: OutboxEnqueuePort;
  setTenantContext: SetTenantContext;
  withTransaction: WithTransaction;
}

export class PostgresRunStateCoordinator {
  private readonly metadataRepo: RunMetadataWritePort;
  private readonly runEventRepository: Pick<RunEventWriteRepository, 'append'>;
  private readonly snapshotStore: SnapshotWritePort;
  private readonly outboxStore: OutboxEnqueuePort;
  private readonly setTenantContext: SetTenantContext;
  private readonly withTransaction: WithTransaction;

  constructor(private readonly deps: PostgresRunStateCoordinatorDeps) {
    this.metadataRepo = deps.metadataRepo;
    this.runEventRepository = deps.runEventRepository;
    this.snapshotStore = deps.snapshotStore;
    this.outboxStore = deps.outboxStore;
    this.setTenantContext = deps.setTenantContext;
    this.withTransaction = deps.withTransaction;
  }

  async applyStartRunWrite(
    receipt: StartRunIntentClaimReceipt,
    write: StartRunWrite
  ): Promise<StartRunWriteResult> {
    return this.withTransaction(async (client) => {
      await this.setTenantContext(client, requireTenantId(receipt.tenantId));
      const locked = await lockStartRunIntent(client, this.deps.schema, receipt);
      if (locked.kind !== 'owned') return locked.kind;
      if (!isActiveStartRunIntent(locked.intent.status)) return 'invalid_state';
      if (locked.intent.reconciliation.kind === 'escalated') return 'invalid_state';
      if (write.kind !== 'fail' && locked.intent.compensation.kind !== 'not_required')
        return 'invalid_state';
      if (write.kind === 'fail' && locked.intent.status !== 'DISPATCHED') return 'invalid_state';
      if (!matchesStartRunWriteScope(receipt, write)) return 'conflict';
      if (write.kind === 'bootstrap') {
        await this.bootstrapRunWithClient(client, receipt.tenantId, write.input);
        return 'applied';
      }
      const status = await this.snapshotStore.readCanonicalStatusWithClient(
        client,
        receipt.tenantId,
        receipt.runId as RunId
      );
      if (status === null) return 'missing';
      if (TERMINAL_RUN_STATUSES.has(status)) return 'invalid_state';
      if (write.kind === 'bind_provider') {
        await this.metadataRepo.saveProviderRefWithClient(
          client,
          receipt.tenantId,
          receipt.runId as RunId,
          write.providerRef
        );
      } else {
        const append = await this.appendEventsTxWithClient(
          client,
          receipt.tenantId,
          receipt.runId as RunId,
          write.events
        );
        await this.outboxStore.enqueueWithClient(client, receipt.runId as RunId, append.appended);
      }
      return 'applied';
    });
  }

  async appendAndEnqueueTx(runId: RunId, envelopes: EventInput[]): Promise<AppendResult> {
    return this.withTransaction(async (client) => {
      const tenantId = await this.resolveAndSetTenantContext(client, runId);
      const append = await this.appendEventsTxWithClient(client, tenantId, runId, envelopes);
      await this.outboxStore.enqueueWithClient(client, runId, append.appended);
      return append;
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    return this.withTransaction(async (client) => {
      const tenantId = requireTenantId(input.metadata.tenantId);
      await this.setTenantContext(client, tenantId);
      return this.bootstrapRunWithClient(client, tenantId, input);
    });
  }

  async bootstrapRecoveryRunTx(
    tenantIdInput: string,
    sourceRunId: RunId,
    buildInput: RecoveryRunBootstrapFactory
  ): Promise<RecoveryRunBootstrapResult> {
    return this.withTransaction(async (client) => {
      const tenantId = requireTenantId(tenantIdInput);
      await this.setTenantContext(client, tenantId);
      const reservation = await this.metadataRepo.reserveRetryAttemptWithClient(
        client,
        tenantId,
        sourceRunId
      );
      const input = buildInput(reservation);
      assertRecoveryBootstrapMatchesReservation(input, tenantId, reservation);
      const appendResult = await this.bootstrapRunWithClient(client, tenantId, input);
      return { reservation, metadata: input.metadata, appendResult };
    });
  }

  /**
   * Queue-only helper that enqueues already-built envelopes.
   * Does not append new run events or mutate run metadata.
   */
  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      await this.outboxStore.enqueueWithClient(client, runId, events);
    });
  }

  private async resolveAndSetTenantContext(client: PoolClient, runId: RunId): Promise<string> {
    const tenantId = requireTenantId(
      await this.metadataRepo.resolveTenantWithClient(client, runId)
    );
    await this.setTenantContext(client, tenantId);
    return tenantId;
  }

  private async appendEventsTxWithClient(
    client: PoolClient,
    tenantId: string,
    runId: RunId,
    envelopes: EventInput[]
  ): Promise<AppendResult> {
    const { appended, deduped, lastAppendedRunSeq, baseRunSeq } =
      await this.runEventRepository.append(client, tenantId, runId, envelopes);
    await this.snapshotStore.validateAppendedTransitionsWithClient(
      client,
      tenantId,
      runId,
      baseRunSeq,
      appended
    );
    return { appended, deduped, lastSeq: lastAppendedRunSeq ?? baseRunSeq };
  }

  private async bootstrapRunWithClient(
    client: PoolClient,
    tenantId: string,
    input: RunBootstrapInput
  ): Promise<AppendResult> {
    try {
      await this.metadataRepo.insertWithClient(client, input.metadata);
    } catch (error: unknown) {
      if (isRunMetadataUniqueViolation(error)) {
        throw new RunAlreadyExistsError(input.metadata.runId, { cause: error });
      }
      throw error;
    }
    const runId = input.metadata.runId as RunId;
    const append = await this.appendEventsTxWithClient(client, tenantId, runId, input.firstEvents);
    await this.snapshotStore.updateWithClient(client, runId, append.appended, 0, append.lastSeq);
    await this.outboxStore.enqueueWithClient(client, runId, append.appended);
    return append;
  }
}

function assertRecoveryBootstrapMatchesReservation(
  input: RunBootstrapInput,
  tenantId: string,
  reservation: RetryAttemptReservation
): void {
  const metadata = input.metadata;
  if (
    metadata.tenantId !== tenantId ||
    metadata.parentRunId !== reservation.parentRunId ||
    metadata.originRunId !== reservation.originRunId ||
    metadata.logicalAttemptId !== reservation.logicalAttemptId
  ) {
    throw new Error('RECOVERY_BOOTSTRAP_RESERVATION_MISMATCH');
  }
}

function isRunMetadataUniqueViolation(
  error: unknown
): error is { code: string; table?: string; constraint?: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === C.pgUniqueViolationCode &&
    (isRunMetadataTable(error) || isRunMetadataConstraint(error))
  );
}

function isRunMetadataTable(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('table' in error)) {
    return false;
  }
  return (error as { table?: unknown }).table === C.runMetadataTableName;
}

function isRunMetadataConstraint(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('constraint' in error)) {
    return false;
  }
  const constraint = (error as { constraint?: unknown }).constraint;
  return typeof constraint === 'string' && constraint.startsWith(C.runMetadataConstraintPrefix);
}

function requireTenantId(tenantId: string): string {
  if (tenantId.trim().length === 0) {
    throw new Error(C.tenantScopeRequiredErrorMessage);
  }
  return tenantId;
}
