import type { EngineRunRef, PlanRef, ResolvedRunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { IdempotencyKeyBuilder } from '../core/idempotency.js';
import type { StartRunTraceContext } from '../core/lifecycle/StartRunTraceContext.js';
import type {
  IPlanFetcher,
  IPlanIntegrityValidator,
  IRunStateStoreRead,
  IRunStateStoreWrite,
} from '../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../ports/IStartRunIntentStore.js';
import { PlanIntegrityValidator } from '../security/planIntegrity.js';
import type { IRunAccessPolicy } from '../security/RunAccessPolicy.js';
import { START_RUN_MESSAGE } from '../services/startRun/StartRunDomainConstants.js';
import { StartRunEventFactory } from '../services/startRun/StartRunEventFactory.js';
import { StartRunExecutionService } from '../services/startRun/StartRunExecutionService.js';
import { StartRunFailurePolicy } from '../services/startRun/StartRunFailurePolicy.js';
import type { StartRunErrorContext } from '../services/startRun/StartRunTypes.js';
import type { IClock } from '../utils/clock.js';

import { StartRunAdmissionGuard } from './StartRunAdmissionGuard.js';

export interface StartRunApplicationServiceDeps {
  policy: IRunAccessPolicy;
  guard: StartRunAdmissionGuard;
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  idempotency: IdempotencyKeyBuilder;
  clock: IClock;
  intentStore: IStartRunIntentStore;
  observability: IObservability;
  planFetcher: IPlanFetcher;
  planIntegrityValidator?: IPlanIntegrityValidator;
  timeouts?: {
    adapterCallMs?: number;
    outboxEnqueueMs?: number;
  };
  observabilityFallbackThrottleMs?: number;
}

/**
 * Application-layer start-run use case.
 * Owns authorization/admission, intent log, adapter dispatch, and compensation.
 */
export class StartRunApplicationService {
  private readonly failurePolicy: StartRunFailurePolicy;
  private readonly executionService: StartRunExecutionService;
  private readonly planIntegrityValidator: IPlanIntegrityValidator;

  constructor(private readonly deps: StartRunApplicationServiceDeps) {
    const eventFactory = new StartRunEventFactory({
      idempotency: deps.idempotency,
      clock: deps.clock,
    });
    this.failurePolicy = new StartRunFailurePolicy({
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
    this.executionService = new StartRunExecutionService({
      stateStoreWrite: deps.stateStoreWrite,
      intentStore: deps.intentStore,
      eventFactory,
      failurePolicy: this.failurePolicy,
      observability: deps.observability,
      clock: deps.clock,
      ...(deps.timeouts ? { timeouts: deps.timeouts } : {}),
    });
    this.planIntegrityValidator = deps.planIntegrityValidator ?? new PlanIntegrityValidator();
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
    await this.deps.guard.assertStartRunAllowed(planRef, resolvedContext);
    const adapter = this.deps.guard.resolveAdapter(resolvedContext);
    const verifiedArtifact = await this.planIntegrityValidator.fetchAndValidate(
      planRef,
      this.deps.planFetcher
    );
    await this.deps.guard.assertExecutionPolicyAllowed(
      planRef,
      verifiedArtifact.executionPolicy,
      resolvedContext,
      adapter
    );

    const intentId = await this.createStartRunIntent(
      resolvedContext,
      resolvedContext.targetAdapter
    );
    errorContext.intentId = intentId;

    return this.executionService.executeStartRun({
      adapter,
      plan: verifiedArtifact.plan,
      planRef,
      resolvedContext,
      traceContext,
      intentId,
    });
  }

  private async createStartRunIntent(
    resolvedContext: ResolvedRunContext,
    provider: EngineRunRef['provider']
  ): Promise<string> {
    const intentId = this.deps.idempotency.startRunIntentId(
      resolvedContext.tenantId,
      resolvedContext.runId,
      resolvedContext.logicalAttemptId,
      provider
    );
    await this.deps.intentStore.createIntent({
      intentId,
      tenantId: resolvedContext.tenantId,
      runId: resolvedContext.runId,
      provider,
      createdAt: this.deps.clock.nowIsoUtc(),
    });
    return intentId;
  }
}

function buildMetricTags(
  provider: EngineRunRef['provider'],
  tenantId: string,
  extras?: Record<string, string>
): Record<string, string> {
  return extras ? { provider, tenantId, ...extras } : { provider, tenantId };
}
