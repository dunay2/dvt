import type { IRunStateStoreRead } from '@dvt/engine';
import { RunMetadataNotFoundError, type IWorkflowEngine } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  GetRunStatusQuery,
  GetRunStatusResult,
  IGetRunStatusUseCase,
  IRunSnapshotStalenessReader,
  IRunStatusStalenessTelemetry,
  SnapshotStaleness,
  SnapshotStalenessFallbackReason,
} from '../ports/runtime.js';

import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';

export class GetRunStatusUseCase implements IGetRunStatusUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead,
    private readonly stalenessReader?: IRunSnapshotStalenessReader,
    private readonly stalenessTelemetry?: IRunStatusStalenessTelemetry
  ) {}

  public async execute(
    query: GetRunStatusQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<GetRunStatusResult> {
    const metadata = await this.stateStore.getRunMetadataByRunId(
      context.scope.tenantId.value,
      query.runId
    );
    if (!metadata) {
      throw new RunMetadataNotFoundError(query.runId);
    }

    const runRef = runMetadataToEngineRunRef(metadata);
    const snapshot = query.enriched
      ? await this.engine.enrichRunStatus(runRef)
      : await this.engine.getRunStatus(runRef);
    const snapshotStaleness = await this.resolveSnapshotStaleness(
      context.scope.tenantId.value,
      query.runId
    );

    return {
      runId: snapshot.runId,
      tenantId: context.scope.tenantId.value,
      status: snapshot.status,
      enriched: query.enriched,
      snapshotStaleness,
      ...(snapshot.substatus !== undefined ? { substatus: snapshot.substatus } : {}),
      ...(snapshot.message !== undefined ? { message: snapshot.message } : {}),
      ...(snapshot.startedAt !== undefined ? { startedAt: snapshot.startedAt } : {}),
      ...(snapshot.completedAt !== undefined ? { completedAt: snapshot.completedAt } : {}),
      ...(snapshot.hash !== undefined ? { hash: snapshot.hash } : {}),
    };
  }

  private async resolveSnapshotStaleness(tenantId: string, runId: string): Promise<SnapshotStaleness> {
    if (!this.stalenessReader) {
      this.reportUnknown('query_not_wired', tenantId, runId);
      return 'UNKNOWN';
    }

    const isStale = await this.stalenessReader.isSnapshotStale(tenantId, runId);
    if (isStale === null) {
      this.reportUnknown('query_failed', tenantId, runId);
      return 'UNKNOWN';
    }

    return isStale ? 'STALE' : 'FRESH';
  }

  private reportUnknown(
    reason: SnapshotStalenessFallbackReason,
    tenantId: string,
    runId: string
  ): void {
    if (!this.stalenessTelemetry) {
      return;
    }

    void this.stalenessTelemetry.reportUnknown(reason, { tenantId, runId });
  }
}
