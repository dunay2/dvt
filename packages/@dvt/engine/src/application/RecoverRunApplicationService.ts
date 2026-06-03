/**
 * @ownedConcern Orchestrate governed run recovery from terminal source runs.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import {
  asNonBlankString,
  type CanonicalRunStatus,
  type EngineRunRef,
  type PlanRef,
  type ResolvedRunContext,
  type RunContext,
  type RunStatus,
  type ScopedPlanRef,
} from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IStartRunApplicationService } from '../application/IStartRunApplicationService.js';
import { RecoverySourceNotTerminalError, RunMetadataNotFoundError } from '../contracts/errors.js';
import { buildTraceContext } from '../core/lifecycle/coreRuntime.js';
import { SnapshotProjector, snapshotToStatus } from '../core/SnapshotProjector.js';
import type {
  IRunRecoveryService,
  RecoverRunServiceRequest,
} from '../domain/IRunRecoveryService.js';
import type { IPlanIntegrityValidator } from '../ports/IPlanIntegrityValidator.js';
import type { IRunExecutionContextBindingPolicy } from '../ports/IRunExecutionContextBindingPolicy.js';
import type { IRunExecutionContextResolver } from '../ports/IRunExecutionContextResolver.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import type { IClock } from '../utils/clock.js';
import { toErrorMessage } from '../utils/errorUtils.js';

import { StartRunAdmissionGuard } from './StartRunAdmissionGuard.js';

export interface RecoverRunApplicationServiceDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  projector: SnapshotProjector;
  policy: IRunAccessPolicy;
  runExecutionContextResolver?: IRunExecutionContextResolver;
  runExecutionContextBindingPolicy?: IRunExecutionContextBindingPolicy;
  planFetcher: IStoredPlanArtifactReader;
  adapters: Map<EngineRunRef['provider'], IProviderAdapter>;
  observability: IObservability;
  clock: IClock;
  startRunApplicationService: IStartRunApplicationService;
  planIntegrityValidator?: IPlanIntegrityValidator;
}

type RecoverySourceRef = Readonly<{
  tenantId: string;
  sourceRunId: string;
}>;

type RecoverySourceMetadata = Readonly<{
  runId: string;
  logicalAttemptId: number;
  originRunId?: string;
}>;

export class RecoverRunApplicationService implements IRunRecoveryService {
  private readonly planIntegrityValidator: IPlanIntegrityValidator;

  constructor(private readonly deps: RecoverRunApplicationServiceDeps) {
    this.planIntegrityValidator =
      deps.planIntegrityValidator ?? new PlanIntegrityValidator({ clock: deps.clock });
  }

  async recoverRun({
    sourceRunId,
    planRef,
    context,
  }: RecoverRunServiceRequest): Promise<EngineRunRef> {
    const sourceRef = { tenantId: context.tenantId, sourceRunId };
    const sourceMetadata = await this.resolveRecoverySourceMetadata(sourceRef);
    await this.assertRecoverySourceTerminal(sourceRef);
    await this.preflightRecoverRun(planRef, context, sourceMetadata);
    const reservedAttempt = await this.reserveRetryAttempt({
      sourceMetadata,
      tenantId: context.tenantId,
    });
    const resolvedContext: ResolvedRunContext = {
      ...context,
      logicalAttemptId: reservedAttempt.logicalAttemptId,
      parentRunId: asNonBlankString(reservedAttempt.parentRunId),
      originRunId: asNonBlankString(reservedAttempt.originRunId),
    };
    const traceContext = buildTraceContext(resolvedContext, planRef.planId);

    return this.deps.observability.withContext(traceContext, () =>
      this.deps.observability.traces.withSpan(
        'engine.recoverRun',
        {
          context: traceContext,
          attributes: {
            sourceRunId,
            logicalAttemptId: String(resolvedContext.logicalAttemptId),
            provider: resolvedContext.targetAdapter,
            planUri: planRef.uri,
          },
        },
        async (span) => {
          try {
            const runRef = await this.deps.startRunApplicationService.startRun(
              planRef,
              resolvedContext,
              traceContext
            );
            span.setStatus('ok');
            return runRef;
          } catch (error) {
            span.recordException(error);
            span.setStatus('error', toErrorMessage(error));
            throw error;
          }
        }
      )
    );
  }

  private async resolveRecoverySourceMetadata({
    tenantId,
    sourceRunId,
  }: RecoverySourceRef): Promise<RecoverySourceMetadata> {
    const sourceMetadata = await this.deps.stateStoreRead.getRunMetadataByRunId(
      tenantId,
      sourceRunId
    );
    if (sourceMetadata === null) {
      throw new RunMetadataNotFoundError(sourceRunId);
    }
    return sourceMetadata;
  }

  private async assertRecoverySourceTerminal({
    tenantId,
    sourceRunId,
  }: RecoverySourceRef): Promise<void> {
    const canonicalStatus = await this.resolveCanonicalRunStatus({
      tenantId,
      runId: sourceRunId,
    });
    if (TERMINAL_RUN_STATUSES.has(canonicalStatus.status)) {
      return;
    }

    throw new RecoverySourceNotTerminalError(sourceRunId, canonicalStatus.status);
  }

  private async resolveCanonicalRunStatus({
    tenantId,
    runId,
  }: {
    tenantId: string;
    runId: string;
  }): Promise<CanonicalRunStatus> {
    const snapshot = await this.deps.stateStoreRead.getSnapshot(tenantId, runId);
    if (snapshot !== null) {
      return snapshotToStatus(snapshot);
    }

    const events = await this.deps.stateStoreRead.listEvents(tenantId, runId);
    return this.deps.projector.rebuild(runId, events);
  }

  private async preflightRecoverRun(
    planRef: PlanRef,
    context: RunContext,
    sourceMetadata: RecoverySourceMetadata
  ): Promise<void> {
    const guard = new StartRunAdmissionGuard({
      policy: this.deps.policy,
      stateStoreRead: this.deps.stateStoreRead,
      adapters: this.deps.adapters,
      ...(this.deps.runExecutionContextResolver === undefined
        ? {}
        : { runExecutionContextResolver: this.deps.runExecutionContextResolver }),
      ...(this.deps.runExecutionContextBindingPolicy === undefined
        ? {}
        : { runExecutionContextBindingPolicy: this.deps.runExecutionContextBindingPolicy }),
    });
    const preflightContext: ResolvedRunContext = {
      ...context,
      logicalAttemptId: sourceMetadata.logicalAttemptId + 1,
      parentRunId: asNonBlankString(sourceMetadata.runId),
      originRunId: asNonBlankString(sourceMetadata.originRunId ?? sourceMetadata.runId),
    };

    await guard.assertStartRunAllowed(planRef, preflightContext);
    const adapter = guard.resolveAdapter(preflightContext);
    const verifiedArtifact = await this.planIntegrityValidator.fetchAndValidate(
      toScopedPlanRef(planRef, preflightContext),
      this.deps.planFetcher
    );
    await guard.assertExecutionPolicyAllowed({
      plan: verifiedArtifact.plan,
      planRef,
      executionPolicy: verifiedArtifact.executionPolicy,
      context: preflightContext,
      adapter,
    });
  }

  private async reserveRetryAttempt({
    sourceMetadata,
    tenantId,
  }: {
    sourceMetadata: RecoverySourceMetadata;
    tenantId: string;
  }): Promise<{
    parentRunId: string;
    originRunId: string;
    logicalAttemptId: number;
  }> {
    if (this.deps.stateStoreWrite.reserveRetryAttempt === undefined) {
      throw new Error('stateStoreWrite.reserveRetryAttempt is required for recoverRun');
    }

    return this.deps.stateStoreWrite.reserveRetryAttempt(tenantId, sourceMetadata.runId);
  }
}

function toScopedPlanRef(planRef: PlanRef, context: ResolvedRunContext): ScopedPlanRef {
  return {
    tenantId: context.tenantId,
    projectId: context.projectId,
    environmentId: context.environmentId,
    planRef,
  };
}

export function buildRunRecoveryService(
  deps: RecoverRunApplicationServiceDeps
): IRunRecoveryService {
  return new RecoverRunApplicationService(deps);
}

const TERMINAL_RUN_STATUSES = new Set<RunStatus>(['COMPLETED', 'FAILED', 'CANCELLED']);
