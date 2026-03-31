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

type SnapshotStalenessFallbackReason = 'query_not_wired' | 'query_failed';

interface SnapshotStalenessResolution {
  value: RunSnapshotStaleness;
  fallbackReason?: SnapshotStalenessFallbackReason;
}

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
    const snapshotPromise = query.enriched
      ? this.engine.enrichRunStatus(runRef)
      : this.engine.getRunStatus(runRef);
    const snapshotStalenessPromise = this.resolveSnapshotStaleness(
      metadata.tenantId,
      metadata.runId
    );

    const snapshot = await snapshotPromise;
    const snapshotStaleness = await snapshotStalenessPromise;
    this.recordSnapshotStalenessTelemetry(snapshotStaleness, metadata.tenantId, metadata.runId);

    return {
      runId: snapshot.runId,
      tenantId: context.scope.tenantId.value,
      status: snapshot.status,
      enriched: query.enriched,
      snapshotStaleness: snapshotStaleness.value,
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
  ): Promise<SnapshotStalenessResolution> {
    if (!this.stalenessReader) {
      return {
        value: 'UNKNOWN',
        fallbackReason: 'query_not_wired',
      };
    }

    try {
      const isStale = await this.stalenessReader.isSnapshotStale(tenantId, runId);
      if (isStale === null) {
        return {
          value: 'UNKNOWN',
          fallbackReason: 'query_failed',
        };
      }

      return {
        value: isStale ? 'STALE' : 'FRESH',
      };
    } catch {
      return {
        value: 'UNKNOWN',
        fallbackReason: 'query_failed',
      };
    }
  }

  private recordSnapshotStalenessTelemetry(
    resolution: SnapshotStalenessResolution,
    tenantId: string,
    runId: string
  ): void {
    if (resolution.fallbackReason) {
      this.stalenessTelemetry?.recordSnapshotStalenessFallback(
        resolution.fallbackReason,
        tenantId,
        runId
      );
    }

    this.stalenessTelemetry?.recordSnapshotStalenessResult(resolution.value, tenantId, runId);
  }
}
