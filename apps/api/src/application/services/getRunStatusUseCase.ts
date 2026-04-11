import type { EventEnvelope, PlanRecord, WorkflowSnapshot } from '@dvt/contracts';
import {
  RunMetadataNotFoundError,
  type IRunStateStoreRead,
  type IWorkflowEngine,
} from '@dvt/engine';

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
import { deriveRunReadEvidenceModel } from './runReadEvidenceModel.js';

type SnapshotStalenessFallbackReason = 'query_not_wired' | 'query_failed';

interface SnapshotStalenessResolution {
  value: RunSnapshotStaleness;
  fallbackReason?: SnapshotStalenessFallbackReason;
}

interface PlanRecordReader {
  getPlanRecord(planId: PlanRecord['planId']): Promise<PlanRecord | undefined>;
}

export class GetRunStatusUseCase implements IGetRunStatusUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly stateStore: IRunStateStoreRead,
    private readonly stalenessReader?: IRunSnapshotStalenessReader,
    private readonly stalenessTelemetry?: IRunStatusStalenessTelemetry,
    private readonly planStore?: PlanRecordReader
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
    const snapshotStalenessPromise = this.resolveSnapshotStaleness(
      metadata.tenantId,
      metadata.runId
    );
    let snapshot: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>;
    let providerView:
      | Awaited<ReturnType<IWorkflowEngine['getRunEnrichment']>>['providerView']
      | undefined;
    if (query.enriched) {
      const [enrichment, snapshotStaleness] = await Promise.all([
        this.engine.getRunEnrichment(runRef),
        snapshotStalenessPromise,
      ]);
      snapshot = enrichment.canonical;
      providerView = enrichment.providerView;
      this.recordSnapshotStalenessTelemetry(snapshotStaleness, metadata.tenantId, metadata.runId);
      const workflowSnapshot = await this.readWorkflowSnapshot(metadata.tenantId, metadata.runId);
      const planRecord = await this.readPlanRecord(metadata.planId);
      const events = this.shouldReadEvidenceEvents(
        snapshot.status,
        snapshot.execution,
        workflowSnapshot
      )
        ? await this.readRunEvents(metadata.tenantId, metadata.runId)
        : ([] as const);
      const evidenceModel = deriveRunReadEvidenceModel({
        snapshot,
        workflowSnapshot,
        events,
        ...(planRecord === undefined ? {} : { planRecord }),
      });

      return {
        runId: snapshot.runId,
        tenantId: context.scope.tenantId.value,
        status: snapshot.status,
        enriched: true,
        snapshotStaleness: snapshotStaleness.value,
        providerView,
        ...(snapshot.substatus !== undefined ? { substatus: snapshot.substatus } : {}),
        ...(snapshot.message !== undefined ? { message: snapshot.message } : {}),
        ...(snapshot.startedAt !== undefined ? { startedAt: snapshot.startedAt } : {}),
        ...(snapshot.completedAt !== undefined ? { completedAt: snapshot.completedAt } : {}),
        ...(snapshot.execution !== undefined ? { execution: snapshot.execution } : {}),
        ...(evidenceModel.executor === undefined ? {} : { executor: evidenceModel.executor }),
        ...(evidenceModel.currentStepId === undefined
          ? {}
          : { currentStepId: evidenceModel.currentStepId }),
        ...(evidenceModel.failedStepId === undefined
          ? {}
          : { failedStepId: evidenceModel.failedStepId }),
        ...(evidenceModel.errorReason === undefined
          ? {}
          : { errorReason: evidenceModel.errorReason }),
        ...(evidenceModel.materialization === undefined
          ? {}
          : { materialization: evidenceModel.materialization }),
      };
    }

    const [statusResult, snapshotStaleness] = await Promise.all([
      this.engine.getRunStatus(runRef),
      snapshotStalenessPromise,
    ]);
    snapshot = statusResult;
    providerView = undefined;
    this.recordSnapshotStalenessTelemetry(snapshotStaleness, metadata.tenantId, metadata.runId);
    const workflowSnapshot = await this.readWorkflowSnapshot(metadata.tenantId, metadata.runId);
    const planRecord = await this.readPlanRecord(metadata.planId);
    const events = this.shouldReadEvidenceEvents(
      snapshot.status,
      snapshot.execution,
      workflowSnapshot
    )
      ? await this.readRunEvents(metadata.tenantId, metadata.runId)
      : ([] as const);
    const evidenceModel = deriveRunReadEvidenceModel({
      snapshot,
      workflowSnapshot,
      events,
      ...(planRecord === undefined ? {} : { planRecord }),
    });

    return {
      runId: snapshot.runId,
      tenantId: context.scope.tenantId.value,
      status: snapshot.status,
      enriched: query.enriched,
      snapshotStaleness: snapshotStaleness.value,
      ...(providerView === undefined ? {} : { providerView }),
      ...(snapshot.substatus !== undefined ? { substatus: snapshot.substatus } : {}),
      ...(snapshot.message !== undefined ? { message: snapshot.message } : {}),
      ...(snapshot.startedAt !== undefined ? { startedAt: snapshot.startedAt } : {}),
      ...(snapshot.completedAt !== undefined ? { completedAt: snapshot.completedAt } : {}),
      ...(snapshot.execution !== undefined ? { execution: snapshot.execution } : {}),
      ...(evidenceModel.executor === undefined ? {} : { executor: evidenceModel.executor }),
      ...(evidenceModel.currentStepId === undefined
        ? {}
        : { currentStepId: evidenceModel.currentStepId }),
      ...(evidenceModel.failedStepId === undefined
        ? {}
        : { failedStepId: evidenceModel.failedStepId }),
      ...(evidenceModel.errorReason === undefined
        ? {}
        : { errorReason: evidenceModel.errorReason }),
      ...(evidenceModel.materialization === undefined
        ? {}
        : { materialization: evidenceModel.materialization }),
    };
  }

  private async readWorkflowSnapshot(
    tenantId: string,
    runId: string
  ): Promise<WorkflowSnapshot | null> {
    try {
      return await this.stateStore.getSnapshot(tenantId, runId);
    } catch {
      return null;
    }
  }

  private async readRunEvents(
    tenantId: string,
    runId: string
  ): Promise<ReadonlyArray<EventEnvelope>> {
    try {
      return await this.stateStore.listEvents(tenantId, runId);
    } catch {
      return [];
    }
  }

  private async readPlanRecord(planId: PlanRecord['planId']): Promise<PlanRecord | undefined> {
    if (!this.planStore) {
      return undefined;
    }

    try {
      return await this.planStore.getPlanRecord(planId);
    } catch {
      return undefined;
    }
  }

  private shouldReadEvidenceEvents(
    status: GetRunStatusResult['status'],
    execution: GetRunStatusResult['execution'],
    workflowSnapshot: WorkflowSnapshot | null
  ): boolean {
    if (workflowSnapshot === null) {
      return true;
    }

    if (status === 'RUNNING' || status === 'PAUSED') {
      return false;
    }

    if (status === 'FAILED') {
      const failure = execution?.failure;
      return !failure?.stepId || (!failure.reason && !failure.message);
    }

    return false;
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
