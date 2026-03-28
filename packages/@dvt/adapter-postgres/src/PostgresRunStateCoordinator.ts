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
        await this.setTenantContext(client, input.metadata.tenantId);
        await this.metadataRepo.insertWithClient(client, input.metadata);
        const append = await this.appendEventsTxWithClient(
          client,
          input.metadata.tenantId,
          input.metadata.runId as RunId,
          input.firstEvents
        );
        await this.outboxStore.enqueueWithClient(
          client,
          input.metadata.runId as RunId,
          append.appended
        );
        return append;
      });
    } catch (error: unknown) {
      if (isUniqueViolation(error)) {
        throw createRunAlreadyExistsError(error);
      }
      throw error;
    }
  }

  async enqueueTx(runId: RunId, events: EventEnvelope[]): Promise<void> {
    await this.withTransaction(async (client) => {
      await this.resolveAndSetTenantContext(client, runId);
      await this.outboxStore.enqueueWithClient(client, runId, events);
    });
  }

  private async resolveAndSetTenantContext(client: PoolClient, runId: RunId): Promise<string> {
    const tenantId = await this.metadataRepo.resolveTenantWithClient(client, runId);
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
    await this.snapshotStore.updateWithClient(
      client,
      runId,
      appended,
      baseRunSeq,
      lastAppendedRunSeq
    );
    return { appended, deduped, lastSeq: lastAppendedRunSeq ?? baseRunSeq };
  }
}

function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function createRunAlreadyExistsError(cause: unknown): Error {
  const error = new Error('RUN_ALREADY_EXISTS');
  error.name = 'RunAlreadyExistsError';
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
}
