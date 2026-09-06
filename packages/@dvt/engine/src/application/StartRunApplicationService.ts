/**
 * @ownedConcern Orchestrate start-run phase services without owning phase rules.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IProviderAdapter } from '../adapters/IProviderAdapter.js';
import type { IdempotencyKeyBuilder } from '../core/idempotency.js';
import type { StartRunTraceContext } from '../core/lifecycle/StartRunTraceContext.js';
import type { IPlanIntegrityValidator } from '../ports/IPlanIntegrityValidator.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
import { StartRunAdmissionService } from '../services/startRun/StartRunAdmissionService.js';
import { StartRunEventFactory } from '../services/startRun/StartRunEventFactory.js';
import { StartRunExecutionService } from '../services/startRun/StartRunExecutionService.js';
import { StartRunFailurePolicy } from '../services/startRun/StartRunFailurePolicy.js';
import { StartRunIntentService } from '../services/startRun/StartRunIntentService.js';
import { StartRunTelemetryPolicy } from '../services/startRun/StartRunTelemetryPolicy.js';
import type {
  IStartRunAdmissionService,
  IStartRunExecutionService,
  IStartRunFailurePolicy,
  StartRunErrorContext,
  StartRunPreparation,
} from '../services/startRun/StartRunTypes.js';
import type { IClock } from '../utils/clock.js';

import { StartRunAdmissionGuard } from './StartRunAdmissionGuard.js';

export interface StartRunApplicationServiceDeps {
  admissionService: IStartRunAdmissionService;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  intentStore: IStartRunIntentStore;
  observability: IObservability;
  executionService: IStartRunExecutionService;
  failurePolicy: IStartRunFailurePolicy;
}

export interface BuildStartRunApplicationServiceDeps {
  guard: StartRunAdmissionGuard;
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  intentStore: IStartRunIntentStore;
  observability: IObservability;
  planFetcher: IStoredPlanArtifactReader;
  planIntegrityValidator?: IPlanIntegrityValidator;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
  observabilityFallbackThrottleMs?: number;
}

/**
 * Application-layer start-run coordinator.
 * Sequences admission, intent creation, dispatch, metrics, and failure policy.
 */
export class StartRunApplicationService {
  private readonly admissionService: IStartRunAdmissionService;
  private readonly failurePolicy: IStartRunFailurePolicy;
  private readonly intentService: StartRunIntentService;
  private readonly executionService: IStartRunExecutionService;
  private readonly telemetryPolicy: StartRunTelemetryPolicy;

  constructor(deps: StartRunApplicationServiceDeps) {
    this.admissionService = deps.admissionService;
    this.failurePolicy = deps.failurePolicy;
    this.executionService = deps.executionService;
    this.intentService = new StartRunIntentService({
      idempotency: deps.idempotency,
      intentStore: deps.intentStore,
      clock: deps.clock,
    });
    this.telemetryPolicy = new StartRunTelemetryPolicy({
      observability: deps.observability,
      clock: deps.clock,
    });
  }

  async startRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): Promise<EngineRunRef> {
    return this.runWithTelemetry(planRef, resolvedContext, traceContext, null);
  }

  async startPreparedRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext,
    preparation: StartRunPreparation,
    admittedAdapter: IProviderAdapter
  ): Promise<EngineRunRef> {
    return this.runWithTelemetry(
      planRef,
      resolvedContext,
      traceContext,
      preparation,
      admittedAdapter
    );
  }

  private async runWithTelemetry(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext,
    preparation: StartRunPreparation | null,
    admittedAdapter?: IProviderAdapter
  ): Promise<EngineRunRef> {
    const startMs = this.telemetryPolicy.nowMs();
    const metricTags = this.telemetryPolicy.buildMetricTags(
      resolvedContext.targetAdapter,
      resolvedContext.tenantId,
      { operation: 'startRun' }
    );
    const errorContext: StartRunErrorContext = { preparation, phase: 'admission' };

    this.telemetryPolicy.recordStart(planRef, resolvedContext, traceContext);

    try {
      const runRef = await this.startRunCore(
        planRef,
        resolvedContext,
        traceContext,
        errorContext,
        preparation?.runRef,
        admittedAdapter
      );
      this.telemetryPolicy.recordStarted({ resolvedContext, startedAtMs: startMs });
      return runRef;
    } catch (error) {
      return this.failurePolicy.handleStartRunError({
        error,
        resolvedContext,
        metricTags,
        traceContext,
        errorContext,
      });
    }
  }

  private async startRunCore(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext,
    errorContext: StartRunErrorContext,
    preparedRunRef?: EngineRunRef,
    admittedAdapter?: IProviderAdapter
  ): Promise<EngineRunRef> {
    const adapter =
      admittedAdapter ??
      (
        await this.admissionService.admit({
          planRef,
          resolvedContext,
        })
      ).adapter;
    errorContext.phase = 'intent';
    const intentId = await this.intentService.createIntent(resolvedContext, adapter.provider);
    errorContext.intentId = intentId;

    const executionInput = {
      adapter,
      planRef,
      resolvedContext,
      traceContext,
      intentId,
      errorContext,
    };
    return preparedRunRef === undefined
      ? this.executionService.executeStartRun(executionInput)
      : this.executionService.executePreparedRun({ ...executionInput, preparedRunRef });
  }
}

export function buildStartRunApplicationService(
  deps: BuildStartRunApplicationServiceDeps
): StartRunApplicationService {
  const eventFactory = new StartRunEventFactory({
    idempotency: deps.idempotency,
    clock: deps.clock,
  });
  const failurePolicy = new StartRunFailurePolicy({
    stateStoreRead: deps.stateStoreRead,
    stateStoreWrite: deps.stateStoreWrite,
    intentStore: deps.intentStore,
    observability: deps.observability,
    eventFactory,
    clock: deps.clock,
    ...(deps.observabilityFallbackThrottleMs === undefined
      ? {}
      : { observabilityFallbackThrottleMs: deps.observabilityFallbackThrottleMs }),
  });
  const executionService = new StartRunExecutionService({
    stateStoreWrite: deps.stateStoreWrite,
    intentStore: deps.intentStore,
    eventFactory,
    failurePolicy,
    observability: deps.observability,
    clock: deps.clock,
    ...(deps.timeouts ? { timeouts: deps.timeouts } : {}),
  });
  const admissionService = new StartRunAdmissionService({
    guard: deps.guard,
    planFetcher: deps.planFetcher,
    planIntegrityValidator:
      deps.planIntegrityValidator ?? new PlanIntegrityValidator({ clock: deps.clock }),
  });

  return new StartRunApplicationService({
    admissionService,
    idempotency: deps.idempotency,
    clock: deps.clock,
    intentStore: deps.intentStore,
    observability: deps.observability,
    executionService,
    failurePolicy,
  });
}
