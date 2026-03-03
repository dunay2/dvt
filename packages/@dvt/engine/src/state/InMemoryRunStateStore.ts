/**
 * @baseline ADR-0003
 */
import type {
  AppendResult,
  RunEventInput,
  RunEventPersisted,
  RunMetadata,
  WorkflowSnapshot,
} from '../contracts/runEvents.js';
import { applyRunEvent } from '../core/SnapshotProjector.js';

import type {
  IRunStateStore,
  ListEventsOptions,
  ListRunsOptions,
  RunBootstrapInput,
} from './IRunStateStore.js';

export class InMemoryRunStateStore implements IRunStateStore {
  private readonly metadataByRunId = new Map<string, RunMetadata>();
  private readonly eventsByRunId = new Map<string, RunEventPersisted[]>();
  private readonly idempIndexByRunId = new Map<string, Map<string, RunEventPersisted>>();
  private readonly snapshotByRunId = new Map<string, WorkflowSnapshot>();

  async getRunMetadataByRunId(tenantId: string, runId: string): Promise<RunMetadata | null> {
    const meta = this.metadataByRunId.get(runId) ?? null;
    if (!meta) return null;
    return meta.tenantId === tenantId ? meta : null;
  }

  async saveProviderRef(
    runId: string,
    runRef: {
      providerWorkflowId: string;
      providerRunId: string;
      providerNamespace?: string;
      providerTaskQueue?: string;
      providerConductorUrl?: string;
    }
  ): Promise<void> {
    const current = this.metadataByRunId.get(runId);
    if (!current) throw new Error(`RUN_NOT_FOUND: ${runId}`);
    this.metadataByRunId.set(runId, {
      ...current,
      providerWorkflowId: runRef.providerWorkflowId,
      providerRunId: runRef.providerRunId,
      ...(runRef.providerNamespace ? { providerNamespace: runRef.providerNamespace } : {}),
      ...(runRef.providerTaskQueue ? { providerTaskQueue: runRef.providerTaskQueue } : {}),
      ...(runRef.providerConductorUrl ? { providerConductorUrl: runRef.providerConductorUrl } : {}),
    });
  }

  async bootstrapRunTx(input: RunBootstrapInput): Promise<AppendResult> {
    if (this.metadataByRunId.has(input.metadata.runId)) {
      throw new Error('RUN_ALREADY_EXISTS');
    }

    // Atomic block (no awaits): write metadata + first events together.
    this.metadataByRunId.set(input.metadata.runId, input.metadata);
    // Seed empty snapshot so getSnapshot never returns null for a bootstrapped run.
    this.snapshotByRunId.set(input.metadata.runId, {
      runId: input.metadata.runId,
      status: 'PENDING',
      paused: false,
      cancelling: false,
      gatewayDecisions: {},
      steps: {},
    });
    return this.appendAndEnqueueTx(input.metadata.runId, input.firstEvents);
  }

  async appendAndEnqueueTx(runId: string, eventsToAppend: RunEventInput[]): Promise<AppendResult> {
    const events = this.eventsByRunId.get(runId) ?? [];
    const baseRunSeq = events.length;
    const idx = this.idempIndexByRunId.get(runId) ?? new Map<string, RunEventPersisted>();

    const appended: RunEventPersisted[] = [];
    const deduped: RunEventPersisted[] = [];
    const persistedAt = '1970-01-01T00:00:00.000Z';

    for (const [i, env] of eventsToAppend.entries()) {
      const record = env as unknown as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, 'runSeq')) {
        throw new Error(`INVALID_EVENT_WRITE_SHAPE: runSeq forbidden at index ${i}`);
      }
      if (Object.prototype.hasOwnProperty.call(record, 'persistedAt')) {
        throw new Error(`INVALID_EVENT_WRITE_SHAPE: persistedAt forbidden at index ${i}`);
      }

      const existing = idx.get(env.idempotencyKey);
      if (existing) {
        deduped.push(existing);
        continue;
      }

      const runSeq = events.length + appended.length + 1;
      const withSeq: RunEventPersisted = { ...env, runSeq, persistedAt };
      appended.push(withSeq);
      idx.set(withSeq.idempotencyKey, withSeq);
    }

    // "Transactional" commit (single mutation point)
    const committed = events.concat(appended);
    this.eventsByRunId.set(runId, committed);
    this.idempIndexByRunId.set(runId, idx);

    // Incrementally update the materialized snapshot for each appended event.
    if (appended.length > 0) {
      const snap: WorkflowSnapshot = this.snapshotByRunId.get(runId) ?? {
        runId,
        status: 'PENDING',
        paused: false,
        cancelling: false,
        gatewayDecisions: {},
        steps: {},
      };
      for (const e of appended) {
        applyRunEvent(snap, e);
      }
      this.snapshotByRunId.set(runId, snap);
    }

    return {
      appended,
      deduped,
      lastSeq: appended[appended.length - 1]?.runSeq ?? baseRunSeq,
    };
  }

  async listEvents(
    tenantId: string,
    runId: string,
    options?: ListEventsOptions
  ): Promise<RunEventPersisted[]> {
    const meta = this.metadataByRunId.get(runId);
    if (!meta || meta.tenantId !== tenantId) return [];
    const all = (this.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
    const afterSeq = options?.afterSeq;
    const filtered = afterSeq !== undefined ? all.filter((e) => e.runSeq > afterSeq) : all;
    return options?.limit !== undefined ? filtered.slice(0, options.limit) : filtered;
  }

  async listRuns(options: ListRunsOptions): Promise<RunMetadata[]> {
    const limit = options.limit ?? 50;
    const all = Array.from(this.metadataByRunId.values());
    const byTenant = all.filter((m) => m.tenantId === options.tenantId);
    const byStatus =
      options.status !== undefined
        ? byTenant.filter((m) => this.snapshotByRunId.get(m.runId)?.status === options.status)
        : byTenant;
    return byStatus.slice(-limit).reverse();
  }

  async getSnapshot(tenantId: string, runId: string): Promise<WorkflowSnapshot | null> {
    const meta = this.metadataByRunId.get(runId);
    if (!meta || meta.tenantId !== tenantId) return null;
    return this.snapshotByRunId.get(runId) ?? null;
  }
}
