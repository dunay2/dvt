/**
 * @baseline ADR-0003
 */
import type { RunEventPersisted, RunMetadata, WorkflowSnapshot } from '../contracts/runEvents.js';
import type { ListEventsOptions, ListRunsOptions } from '../ports/IRunStateStore.js';

export type InMemoryRunStateReadBacking = {
  metadataByRunId: Map<string, RunMetadata>;
  eventsByRunId: Map<string, RunEventPersisted[]>;
  snapshotByRunId: Map<string, WorkflowSnapshot>;
};

export function getInMemoryRunMetadata(
  backing: InMemoryRunStateReadBacking,
  tenantId: string,
  runId: string
): RunMetadata | null {
  const meta = backing.metadataByRunId.get(runId) ?? null;
  if (!meta) return null;
  return meta.tenantId === tenantId ? meta : null;
}

export function listInMemoryRunEvents(
  backing: InMemoryRunStateReadBacking,
  tenantId: string,
  runId: string,
  afterSeq?: ListEventsOptions['afterSeq'],
  limit?: ListEventsOptions['limit']
): RunEventPersisted[] {
  const meta = backing.metadataByRunId.get(runId);
  if (meta?.tenantId !== tenantId) return [];
  const all = (backing.eventsByRunId.get(runId) ?? []).slice().sort((a, b) => a.runSeq - b.runSeq);
  const filtered = afterSeq === undefined ? all : all.filter((event) => event.runSeq > afterSeq);
  return limit === undefined ? filtered : filtered.slice(0, limit);
}

export function listInMemoryRuns(
  backing: InMemoryRunStateReadBacking,
  tenantId: string,
  status?: ListRunsOptions['status'],
  limit = 50
): RunMetadata[] {
  const all = Array.from(backing.metadataByRunId.values());
  const byTenant = all.filter((metadata) => metadata.tenantId === tenantId);
  const byStatus =
    status === undefined
      ? byTenant
      : byTenant.filter(
          (metadata) => backing.snapshotByRunId.get(metadata.runId)?.status === status
        );
  return byStatus.slice(-limit).reverse();
}
