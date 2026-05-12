/**
 * @ownedConcern Orchestrate start-run phase services without owning phase rules.
 */
import type { IStoredPlanArtifactReader } from '@dvt/artifacts';
import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IdempotencyKeyBuilder } from '../core/idempotency.js';
import type { StartRunTraceContext } from '../core/lifecycle/StartRunTraceContext.js';
import type { IPlanIntegrityValidator } from '../ports/IPlanIntegrityValidator.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { StartRunAdmissionService } from '../services/startRun/StartRunAdmissionService.js';
import { START_RUN_MESSAGE } from '../services/startRun/StartRunDomainConstants.js';
import { StartRunEventFactory } from '../services/startRun/StartRunEventFactory.js';
import { StartRunExecutionService } from '../services/startRun/StartRunExecutionService.js';
import { StartRunFailurePolicy } from '../services/startRun/StartRunFailurePolicy.js';
import { StartRunIntentService } from '../services/startRun/StartRunIntentService.js';
import type {
  IStartRunExecutionService,
  IStartRunFailurePolicy,
  StartRunErrorContext,
} from '../services/startRun/StartRunTypes.js';
import type { IClock } from '../utils/clock.js';

import { StartRunAdmissionGuard } from './StartRunAdmissionGuard.js';

export interface StartRunApplicationServiceDeps {
  guard: StartRunAdmissionGuard;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  intentStore: IStartRunIntentStore;
  observability: IObservability;
  planFetcher: IStoredPlanArtifactReader;
  planIntegrityValidator: IPlanIntegrityValidator;
  executionService: IStartRunExecutionService;
  failurePolicy: IStartRunFailurePolicy;
}

export interface BuildStartRunApplicationServiceDeps {
  policy: IRunAccessPolicy;
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
  private readonly admissionService: StartRunAdmissionService;
  private readonly failurePolicy: IStartRunFailurePolicy;
  private readonly intentService: StartRunIntentService;
  private readonly executionService: IStartRunExecutionService;

  constructor(private readonly deps: StartRunApplicationServiceDeps) {
    this.failurePolicy = deps.failurePolicy;
    this.executionService = deps.executionService;
    this.admissionService = new StartRunAdmissionService({
      guard: deps.guard,
      planFetcher: deps.planFetcher,
      planIntegrityValidator: deps.planIntegrityValidator,
    });
    this.intentService = new StartRunIntentService({
      idempotency: deps.idempotency,
      intentStore: deps.intentStore,
      clock: deps.clock,
    });
  }

  async startRun(
    planRef: PlanRef,
    resolvedContext: ResolvedRunContext,
    traceContext: StartRunTraceContext
  ): Promise<EngineRunRef> {
    const startMs = Date.parse(this.deps.clock.nowIsoUtc());
    const metricTags = buildMetricTags(resolvedContext.targetAdapter, resolvedContext.tenantId, {
      operation: 'startRun',
    });
    const errorContext: StartRunErrorContext = {};

    try {
      this.deps.observability.logs.info({
        msg: START_RUN_MESSAGE.startingRun,
        context: traceContext,
        attributes: {
          provider: resolvedContext.targetAdapter,
          planUri: planRef.uri,
        },
      });
    } catch {
      // no-op: observability reporting must not fail startRun.
    }

    try {
      const runRef = await this.startRunCore(planRef, resolvedContext, traceContext, errorContext);
      try {
        this.deps.observability.metrics.counter('dvt.run.started_total', metricTags).add(1);
        this.deps.observability.metrics
          .histogram('dvt.run.start.duration_ms', metricTags)
          .record(Date.parse(this.deps.clock.nowIsoUtc()) - startMs);
      } catch {
        // no-op: observability reporting must not fail startRun.
      }
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
    errorContext: StartRunErrorContext
  ): Promise<EngineRunRef> {
    const admission = await this.admissionService.admit({
      planRef,
      resolvedContext,
    });
    const intentId = await this.intentService.createIntent(
      resolvedContext,
      admission.adapter.provider
    );
    errorContext.intentId = intentId;

    return this.executionService.executeStartRun({
      adapter: admission.adapter,
      planRef,
      resolvedContext,
      traceContext,
      intentId,
    });
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

  return new StartRunApplicationService({
    guard: deps.guard,
    idempotency: deps.idempotency,
    clock: deps.clock,
    intentStore: deps.intentStore,
    observability: deps.observability,
    planFetcher: deps.planFetcher,
    planIntegrityValidator:
      deps.planIntegrityValidator ?? new PlanIntegrityValidator({ clock: deps.clock }),
    executionService,
    failurePolicy,
  });
}

function buildMetricTags(
  provider: EngineRunRef['provider'],
  tenantId: string,
  extras?: Record<string, string>
): Record<string, string> {
  return extras ? { provider, tenantId, ...extras } : { provider, tenantId };
}
