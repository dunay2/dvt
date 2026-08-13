import type { IStoredPlanArtifactReader, IStoredPlanRefReader } from '@dvt/artifacts';
import type { TenantId as ContractTenantId } from '@dvt/contracts';
import type {
  IPlanIntegrityValidator,
  IRunStateStoreRead,
  IWorkflowEngine,
  RunMetadata,
} from '@dvt/engine';
import type { IPlanExecutabilityValidator } from '@dvt/planner';

import type { IStartRunTargetAdapterRegistry } from '../ports/IStartRunTargetAdapterRegistry.js';
import type { IRunCancellationReceiptStore } from '../ports/runCancellationReceiptStore.js';
import { toRunCancellationReceiptKey } from '../ports/runCancellationReceiptStore.js';
import type { IRunExecutionContextReferenceReader } from '../ports/runExecutionContextReferenceReader.js';
import type { IRunExecutionContextRequirementResolver } from '../ports/runExecutionContextRequirementResolver.js';
import type {
  AuthorizedQueryExecutionContext,
  IListRunsUseCase,
  ListRunsQuery,
  ListRunsResult,
  RunListItemDto,
} from '../ports/runtime.js';

import { cancellationReceiptCanAffectAvailability } from './runControlPolicy.js';
import { runMetadataToEngineRunRef } from './runMetadataToEngineRunRef.js';
import { projectRunOperationalTruth } from './runOperationalTruth.js';
import { resolveRunRecoveryContextTrust } from './runRecoveryContextTrust.js';
import { resolveRunRecoveryPlanEvidence } from './runRecoveryPlanAvailability.js';
import type { IRunStartDispatchResolver } from './runStartDispatchResolver.js';

const RUN_STATUS_READ_CONCURRENCY = 8;
const RUN_RECOVERY_PROJECTION_CONCURRENCY = 4;
type RecoveryPlanReader = IStoredPlanRefReader & IStoredPlanArtifactReader;

export class ListRunsUseCase implements IListRunsUseCase {
  public constructor(
    private readonly stateStore: IRunStateStoreRead,
    private readonly engine: Pick<IWorkflowEngine, 'getRunStatus'>,
    private readonly executionContextReader?: IRunExecutionContextReferenceReader,
    private readonly executionContextRequirementResolver?: IRunExecutionContextRequirementResolver,
    private readonly planStore?: RecoveryPlanReader,
    private readonly planIntegrityValidator?: IPlanIntegrityValidator,
    private readonly targetAdapterRegistry?: IStartRunTargetAdapterRegistry,
    private readonly startDispatchResolver?: IRunStartDispatchResolver,
    private readonly cancellationReceipts?: IRunCancellationReceiptStore,
    private readonly planExecutabilityValidator?: IPlanExecutabilityValidator
  ) {}

  public async execute(
    query: ListRunsQuery,
    context: AuthorizedQueryExecutionContext
  ): Promise<ListRunsResult> {
    const metadata = await this.stateStore.listRuns({
      tenantId: context.scope.tenantId.value as ContractTenantId,
      ...(context.scope.projectId === undefined
        ? {}
        : { projectId: context.scope.projectId.value }),
      ...(context.scope.environmentId === undefined
        ? {}
        : { environmentId: context.scope.environmentId.value }),
      limit: query.limit,
    });
    const statuses = await this.readCanonicalStatuses(metadata);

    return {
      items: await this.projectListItems(metadata, statuses),
      nextCursor: this.buildNextCursor(metadata, query.limit),
    };
  }

  private async projectListItems(
    items: ReadonlyArray<RunMetadata>,
    statuses: ReadonlyArray<Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>>
  ): Promise<RunListItemDto[]> {
    const projected: RunListItemDto[] = [];

    for (let offset = 0; offset < items.length; offset += RUN_RECOVERY_PROJECTION_CONCURRENCY) {
      const batch = items.slice(offset, offset + RUN_RECOVERY_PROJECTION_CONCURRENCY);
      projected.push(
        ...(await Promise.all(
          batch.map((item, index) => this.toListItem(item, statuses[offset + index]!))
        ))
      );
    }

    return projected;
  }

  private async toListItem(
    item: RunMetadata,
    status: Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>
  ): Promise<RunListItemDto> {
    const recoveryPlan = await resolveRunRecoveryPlanEvidence(
      this.planStore,
      this.planIntegrityValidator,
      item,
      status,
      {
        targetAdapterRegistry: this.targetAdapterRegistry,
        planExecutabilityValidator: this.planExecutabilityValidator,
      }
    );
    const [recoveryContextTrusted, startDispatch, cancellationAccepted] = await Promise.all([
      resolveRunRecoveryContextTrust(
        this.executionContextReader,
        this.executionContextRequirementResolver,
        item,
        status,
        recoveryPlan.planRef
      ),
      this.startDispatchResolver?.resolve(item, status),
      this.cancellationReceipts !== undefined && cancellationReceiptCanAffectAvailability(status)
        ? this.cancellationReceipts.hasAccepted(toRunCancellationReceiptKey(item))
        : false,
    ]);

    return projectRunOperationalTruth({
      metadata: item,
      status,
      recoveryContextTrusted,
      recoveryPlanAvailable: recoveryPlan.available,
      recoveryAdapterAvailable: recoveryPlan.adapterAvailable,
      cancelDispatchConfirmed: startDispatch?.kind === 'confirmed' || status.status !== 'PENDING',
      cancellationAccepted,
    });
  }

  private async readCanonicalStatuses(items: ReadonlyArray<RunMetadata>) {
    const statuses: Array<Awaited<ReturnType<IWorkflowEngine['getRunStatus']>>> = [];

    for (let offset = 0; offset < items.length; offset += RUN_STATUS_READ_CONCURRENCY) {
      const batch = items.slice(offset, offset + RUN_STATUS_READ_CONCURRENCY);
      statuses.push(
        ...(await Promise.all(
          batch.map((item) => this.engine.getRunStatus(runMetadataToEngineRunRef(item)))
        ))
      );
    }

    return statuses;
  }

  private buildNextCursor(items: ReadonlyArray<RunMetadata>, limit: number): string | null {
    if (items.length < limit) {
      return null;
    }

    const last = items.at(-1);
    if (!last?.createdAt) {
      return null;
    }

    return `${last.createdAt}:${last.runId}`;
  }
}
