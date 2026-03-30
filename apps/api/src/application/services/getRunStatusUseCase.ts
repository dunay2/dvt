import type { IRunStateStoreRead } from '@dvt/engine';
import { RunMetadataNotFoundError, type IWorkflowEngine } from '@dvt/engine';

import type {
  AuthorizedQueryExecutionContext,
  GetRunStatusQuery,
  GetRunStatusResult,
  IGetRunStatusUseCase,
  IRunSnapshotStalenessReader,
  IRunStatusStalenessTelemetry,
  RunSnapshotStaleness,
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
      metadata.tenantId,
      metadata.runId
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

  private async resolveSnapshotStaleness(
    tenantId: string,
    runId: string
  ): Promise<RunSnapshotStaleness> {
    if (!this.stalenessReader) {
      this.stalenessTelemetry?.recordSnapshotStalenessFallback('query_not_wired', tenantId, runId);
      return 'UNKNOWN';
    }

    try {
      return (await this.stalenessReader.isSnapshotStale(tenantId, runId)) ? 'STALE' : 'FRESH';
    } catch {
      this.stalenessTelemetry?.recordSnapshotStalenessFallback('query_failed', tenantId, runId);
      return 'UNKNOWN';
    }
  }
}
