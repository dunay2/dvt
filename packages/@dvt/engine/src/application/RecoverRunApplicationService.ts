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
import {
  RecoverySourceNotTerminalError,
  RunAlreadyExistsError,
  RunMetadataNotFoundError,
} from '../contracts/errors.js';
import type { RunMetadata } from '../contracts/runEvents.js';
import type { IdempotencyKeyBuilder } from '../core/idempotency.js';
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
import { StartRunEventFactory } from '../services/startRun/StartRunEventFactory.js';
import type { StartRunPreparation } from '../services/startRun/StartRunTypes.js';
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
  idempotency: IdempotencyKeyBuilder;
  startRunApplicationService: IStartRunApplicationService;
  planIntegrityValidator?: IPlanIntegrityValidator;
}

type RecoverySourceRef = Readonly<{
  tenantId: string;
  sourceRunId: string;
}>;

type RecoverySourceMetadata = RunMetadata;

export class RecoverRunApplicationService implements IRunRecoveryService {
  private readonly planIntegrityValidator: IPlanIntegrityValidator;
  private readonly eventFactory: StartRunEventFactory;

  constructor(private readonly deps: RecoverRunApplicationServiceDeps) {
    this.planIntegrityValidator =
      deps.planIntegrityValidator ?? new PlanIntegrityValidator({ clock: deps.clock });
    this.eventFactory = new StartRunEventFactory({
      idempotency: deps.idempotency,
      clock: deps.clock,
    });
  }

  async recoverRun({
    sourceRunId,
    planRef,
    context,
  }: RecoverRunServiceRequest): Promise<EngineRunRef> {
    const sourceRef = { tenantId: context.tenantId, sourceRunId };
    const sourceMetadata = await this.resolveRecoverySourceMetadata(sourceRef);
    await this.assertRecoverySourceTerminal(sourceRef);
    const existingRecovery = await this.deps.stateStoreRead.getRunMetadataByRunId(
      context.tenantId,
      context.runId
    );
    const preflightContext = this.resolvePreflightContext(
      context,
      sourceMetadata,
      existingRecovery
    );
    const adapter = await this.preflightRecoverRun(
      planRef,
      preflightContext,
      existingRecovery !== null
    );
    const prepared: { context: ResolvedRunContext; preparation: StartRunPreparation } =
      existingRecovery === null
        ? await this.prepareRecoveryRun(sourceMetadata, planRef, context, adapter)
        : {
            context: preflightContext,
            preparation: { disposition: 'reused', runRef: existingRecovery.providerRef },
          };
    const resolvedContext = prepared.context;
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
            const runRef = await this.deps.startRunApplicationService.startPreparedRun(
              planRef,
              resolvedContext,
              traceContext,
              prepared.preparation,
              adapter
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
    preflightContext: ResolvedRunContext,
    preparedRun: boolean
  ): Promise<IProviderAdapter> {
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
    if (preparedRun) {
      await guard.assertPreparedRunAllowed(planRef, preflightContext);
    } else {
      await guard.assertStartRunAllowed(planRef, preflightContext);
    }
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
    return adapter;
  }

  private resolvePreflightContext(
    context: RunContext,
    sourceMetadata: RecoverySourceMetadata,
    existingRecovery: RunMetadata | null
  ): ResolvedRunContext {
    if (existingRecovery !== null) {
      if (!isRecoveryChildOf(existingRecovery, sourceMetadata)) {
        throw new RunAlreadyExistsError(context.runId);
      }
      return {
        ...context,
        logicalAttemptId: existingRecovery.logicalAttemptId,
        parentRunId: asNonBlankString(existingRecovery.parentRunId),
        originRunId: asNonBlankString(existingRecovery.originRunId),
      };
    }

    return {
      ...context,
      logicalAttemptId: sourceMetadata.logicalAttemptId + 1,
      parentRunId: asNonBlankString(sourceMetadata.runId),
      originRunId: asNonBlankString(sourceMetadata.originRunId ?? sourceMetadata.runId),
    };
  }

  private async prepareRecoveryRun(
    sourceMetadata: RecoverySourceMetadata,
    planRef: PlanRef,
    context: RunContext,
    adapter: IProviderAdapter
  ): Promise<{ context: ResolvedRunContext; preparation: StartRunPreparation }> {
    const estimateRunRef = adapter.estimateRunRef;
    if (estimateRunRef === undefined) {
      throw new Error('adapter.estimateRunRef is required for recoverRun');
    }
    if (this.deps.stateStoreWrite.bootstrapRecoveryRunTx === undefined) {
      throw new Error('stateStoreWrite.bootstrapRecoveryRunTx is required for recoverRun');
    }
    let prepared: Awaited<ReturnType<NonNullable<IRunStateStoreWrite['bootstrapRecoveryRunTx']>>>;
    try {
      prepared = await this.deps.stateStoreWrite.bootstrapRecoveryRunTx(
        context.tenantId,
        sourceMetadata.runId,
        (reservation) => {
          const resolvedContext: ResolvedRunContext = {
            ...context,
            logicalAttemptId: reservation.logicalAttemptId,
            parentRunId: asNonBlankString(reservation.parentRunId),
            originRunId: asNonBlankString(reservation.originRunId),
          };
          const runRef = estimateRunRef(resolvedContext);
          const metadata = this.eventFactory.buildRunMetadata(
            resolvedContext,
            planRef,
            runRef,
            this.deps.clock.nowIsoUtc()
          );
          return {
            metadata,
            firstEvents: [this.eventFactory.buildRunEvent(metadata, 'RunQueued')],
          };
        }
      );
    } catch (error) {
      if (!(error instanceof RunAlreadyExistsError)) throw error;
      const concurrentRecovery = await this.deps.stateStoreRead.getRunMetadataByRunId(
        context.tenantId,
        context.runId
      );
      if (concurrentRecovery === null || !isRecoveryChildOf(concurrentRecovery, sourceMetadata)) {
        throw error;
      }
      return {
        context: {
          ...context,
          logicalAttemptId: concurrentRecovery.logicalAttemptId,
          parentRunId: asNonBlankString(concurrentRecovery.parentRunId),
          originRunId: asNonBlankString(concurrentRecovery.originRunId),
        },
        preparation: { disposition: 'reused', runRef: concurrentRecovery.providerRef },
      };
    }
    return {
      context: {
        ...context,
        logicalAttemptId: prepared.metadata.logicalAttemptId,
        parentRunId: asNonBlankString(prepared.reservation.parentRunId),
        originRunId: asNonBlankString(prepared.reservation.originRunId),
      },
      preparation: { disposition: 'created', runRef: prepared.metadata.providerRef },
    };
  }
}

function isRecoveryChildOf(
  candidate: RunMetadata,
  source: RecoverySourceMetadata
): candidate is RunMetadata & { parentRunId: string; originRunId: string } {
  return (
    candidate.parentRunId === source.runId &&
    candidate.originRunId === (source.originRunId ?? source.runId) &&
    candidate.tenantId === source.tenantId &&
    candidate.projectId === source.projectId &&
    candidate.environmentId === source.environmentId &&
    candidate.planId === source.planId &&
    candidate.planVersion === source.planVersion &&
    candidate.providerRef.provider === source.providerRef.provider
  );
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
