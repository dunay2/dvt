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
import type { PoolClient } from 'pg';

import { POSTGRES_RUN_STATE_COORDINATOR_CONSTANTS as C } from './PostgresRunStateCoordinatorConstants.js';
import type { RunEventWriteRepository } from './RunEventWriteRepository.js';
import type {
  AppendResult,
  EventEnvelope,
  EventInput,
  RunBootstrapInput,
  RunId,
  RunMetadata,
} from './types.js';

type WithTransaction = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;
type SetTenantContext = (client: PoolClient, tenantId: string) => Promise<void>;

interface RunMetadataWritePort {
  resolveTenantWithClient(client: PoolClient, runId: RunId): Promise<string>;
  insertWithClient(client: PoolClient, metadata: RunMetadata): Promise<void>;
}

interface SnapshotWritePort {
  updateWithClient(
    client: PoolClient,
    runId: RunId,
    appended: EventEnvelope[],
    baseRunSeq: number,
    lastAppendedRunSeq: number | null
  ): Promise<void>;
}

interface OutboxEnqueuePort {
  enqueueWithClient(client: PoolClient, runId: RunId, events: EventEnvelope[]): Promise<void>;
}

export interface PostgresRunStateCoordinatorDeps {
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

  constructor(deps: PostgresRunStateCoordinatorDeps) {
    this.metadataRepo = deps.metadataRepo;
    this.runEventRepository = deps.runEventRepository;
    this.snapshotStore = deps.snapshotStore;
    this.outboxStore = deps.outboxStore;
    this.setTenantContext = deps.setTenantContext;
    this.withTransaction = deps.withTransaction;
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
    try {
      return await this.withTransaction(async (client) => {
        const tenantId = requireTenantId(input.metadata.tenantId);
        await this.setTenantContext(client, tenantId);
        await this.metadataRepo.insertWithClient(client, input.metadata);
        const append = await this.appendEventsTxWithClient(
          client,
          tenantId,
          input.metadata.runId as RunId,
          input.firstEvents
        );
        await this.snapshotStore.updateWithClient(
          client,
          input.metadata.runId as RunId,
          append.appended,
          0,
          append.lastSeq
        );
        await this.outboxStore.enqueueWithClient(
          client,
          input.metadata.runId as RunId,
          append.appended
        );
        return append;
      });
    } catch (error: unknown) {
      if (isRunMetadataUniqueViolation(error)) {
        throw createRunAlreadyExistsError(error);
      }
      throw error;
    }
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
    return { appended, deduped, lastSeq: lastAppendedRunSeq ?? baseRunSeq };
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

function createRunAlreadyExistsError(cause: unknown): Error {
  const error = new Error(C.runAlreadyExistsErrorMessage);
  error.name = C.runAlreadyExistsErrorName;
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
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
