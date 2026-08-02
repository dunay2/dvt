import type { IStoredPlanArtifactReader, IStoredPlanRefReader } from '@dvt/artifacts';
import type {
  EventEnvelope,
  PlanRecord,
  RunMetadata,
  ScopedPlanId,
  WorkflowSnapshot,
} from '@dvt/contracts';
import {
  RunMetadataNotFoundError,
  type IPlanIntegrityValidator,
  type IRunEnrichmentService,
  type IRunStateStoreRead,
  type IWorkflowEngine,
} from '@dvt/engine';

import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';
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
import { projectRunOperationalTruth, sanitizeCanonicalRunStatus } from './runOperationalTruth.js';
import { deriveRunReadEvidenceModel } from './runReadEvidenceModel.js';
import { resolveRunRecoveryContextTrust } from './runRecoveryContextTrust.js';
import { resolveRunRecoveryPlanAvailability } from './runRecoveryPlanAvailability.js';

type SnapshotStalenessFallbackReason = 'query_not_wired' | 'query_failed';

interface SnapshotStalenessResolution {
  value: RunSnapshotStaleness;
  fallbackReason?: SnapshotStalenessFallbackReason;
}

interface RunPlanReader extends Partial<IStoredPlanRefReader>, Partial<IStoredPlanArtifactReader> {
  getPlanRecord(input: ScopedPlanId): Promise<PlanRecord | undefined>;
}

type CanonicalRunSnapshot = Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>;
type ProviderView = Awaited<ReturnType<IRunEnrichmentService['getRunEnrichment']>>['providerView'];
type RunReadRef = Pick<RunMetadata, 'tenantId' | 'runId'>;
type PlanRecordMetadata = Pick<RunMetadata, 'tenantId' | 'projectId' | 'environmentId' | 'planId'>;

interface RunStatusResponseInput {
  readonly metadata: RunMetadata;
  readonly snapshot: CanonicalRunSnapshot;
  readonly snapshotStaleness: SnapshotStalenessResolution;
  readonly enriched: boolean;
  readonly providerView?: ProviderView;
}

export class GetRunStatusUseCase implements IGetRunStatusUseCase {
  public constructor(
    private readonly engine: IWorkflowEngine,
    private readonly runEnrichmentService: IRunEnrichmentService,
    private readonly stateStore: IRunStateStoreRead,
    private readonly stalenessReader?: IRunSnapshotStalenessReader,
    private readonly stalenessTelemetry?: IRunStatusStalenessTelemetry,
    private readonly planStore?: RunPlanReader,
    private readonly executionContextReader?: IRunExecutionContextReferenceReader,
    private readonly executionContextRequirementResolver?: IRunExecutionContextRequirementResolver,
    private readonly planIntegrityValidator?: IPlanIntegrityValidator
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

    const runReadRef = toRunReadRef(metadata);
    const runRef = runMetadataToEngineRunRef(metadata);
    const snapshotStalenessPromise = this.resolveSnapshotStaleness(runReadRef);
    if (query.enriched) {
      const [enrichment, snapshotStaleness] = await Promise.all([
        this.runEnrichmentService.getRunEnrichment(runRef),
        snapshotStalenessPromise,
      ]);
      return this.buildStatusResponse({
        metadata,
        snapshot: sanitizeCanonicalRunStatus(enrichment.canonical),
        snapshotStaleness,
        enriched: true,
        providerView: enrichment.providerView,
      });
    }

    const [statusResult, snapshotStaleness] = await Promise.all([
      this.engine.getRunStatus(runRef),
      snapshotStalenessPromise,
    ]);

    return this.buildStatusResponse({
      metadata,
      snapshot: sanitizeCanonicalRunStatus(statusResult),
      snapshotStaleness,
      enriched: query.enriched,
    });
  }

  private async buildStatusResponse(input: RunStatusResponseInput): Promise<GetRunStatusResult> {
    const { metadata, snapshot, snapshotStaleness } = input;
    const runReadRef = toRunReadRef(metadata);
    this.recordSnapshotStalenessTelemetry(snapshotStaleness, runReadRef);
    const workflowSnapshot = await this.readWorkflowSnapshot(runReadRef);
    const planRecord = await this.readPlanRecord(metadata);
    const events = this.shouldReadEvidenceEvents(
      snapshot.status,
      snapshot.execution,
      workflowSnapshot
    )
      ? await this.readRunEvents(runReadRef)
      : ([] as const);
    const evidenceModel = deriveRunReadEvidenceModel({
      snapshot,
      workflowSnapshot,
      events,
      planId: metadata.planId,
      runtimeAdapter: metadata.providerRef.provider,
      ...(planRecord === undefined ? {} : { planRecord }),
    });
    const [recoveryContextTrusted, recoveryPlanAvailable] = await Promise.all([
      resolveRunRecoveryContextTrust(
        this.executionContextReader,
        this.executionContextRequirementResolver,
        metadata,
        snapshot
      ),
      resolveRunRecoveryPlanAvailability(
        this.planStore,
        this.planIntegrityValidator,
        metadata,
        snapshot
      ),
    ]);
    const operationalTruth = projectRunOperationalTruth({
      metadata,
      status: snapshot,
      evidence: evidenceModel,
      recoveryContextTrusted,
      recoveryPlanAvailable,
    });

    return {
      ...operationalTruth,
      enriched: input.enriched,
      snapshotStaleness: snapshotStaleness.value,
      ...(input.providerView === undefined ? {} : { providerView: input.providerView }),
      ...(evidenceModel.executor === undefined ? {} : { executor: evidenceModel.executor }),
      ...(evidenceModel.provenance === undefined ? {} : { provenance: evidenceModel.provenance }),
      ...(evidenceModel.materialization === undefined
        ? {}
        : { materialization: evidenceModel.materialization }),
      ...(evidenceModel.planSummary === undefined
        ? {}
        : { planSummary: evidenceModel.planSummary }),
      ...(evidenceModel.diagnostics === undefined
        ? {}
        : { diagnostics: evidenceModel.diagnostics }),
    };
  }

  private async readWorkflowSnapshot(runRef: RunReadRef): Promise<WorkflowSnapshot | null> {
    try {
      return await this.stateStore.getSnapshot(runRef.tenantId, runRef.runId);
    } catch {
      return null;
    }
  }

  private async readRunEvents(runRef: RunReadRef): Promise<ReadonlyArray<EventEnvelope>> {
    try {
      return await this.stateStore.listEvents(runRef.tenantId, runRef.runId);
    } catch {
      return [];
    }
  }

  private async readPlanRecord(metadata: PlanRecordMetadata): Promise<PlanRecord | undefined> {
    if (!this.planStore) {
      return undefined;
    }

    try {
      return await this.planStore.getPlanRecord({
        tenantId: metadata.tenantId,
        projectId: metadata.projectId,
        environmentId: metadata.environmentId,
        planId: metadata.planId,
      });
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

  private async resolveSnapshotStaleness(runRef: RunReadRef): Promise<SnapshotStalenessResolution> {
    if (!this.stalenessReader) {
      return {
        value: 'UNKNOWN',
        fallbackReason: 'query_not_wired',
      };
    }

    try {
      const isStale = await this.stalenessReader.isSnapshotStale(runRef.tenantId, runRef.runId);
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
    runRef: RunReadRef
  ): void {
    if (resolution.fallbackReason) {
      this.stalenessTelemetry?.recordSnapshotStalenessFallback(
        resolution.fallbackReason,
        runRef.tenantId,
        runRef.runId
      );
    }

    this.stalenessTelemetry?.recordSnapshotStalenessResult(
      resolution.value,
      runRef.tenantId,
      runRef.runId
    );
  }
}

function toRunReadRef(metadata: RunReadRef): RunReadRef {
  return {
    tenantId: metadata.tenantId,
    runId: metadata.runId,
  };
}
