/**
 * @ownedConcern Apply start-run failure reporting, intent cleanup, and guarded
 * RunFailed emission.
 */
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import { START_RUN_FAILURE_REASON, START_RUN_MESSAGE } from './StartRunDomainConstants.js';
import type { StartRunEventFactory } from './StartRunEventFactory.js';
import type { IStartRunFailurePolicy, StartRunErrorContext } from './StartRunTypes.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type ResolvedRunContext = import('@dvt/contracts').ResolvedRunContext;
type IObservability = import('@dvt/observability').IObservability;
type EventType = import('../../contracts/runEvents.js').EventType;
type RunMetadata = import('../../contracts/runEvents.js').RunMetadata;
type IRunStateStoreRead = import('../../ports/IRunStateStore.js').IRunStateStoreRead;
type IRunStateStoreWrite = import('../../ports/IRunStateStore.js').IRunStateStoreWrite;
type IStartRunIntentStore = import('../../ports/IStartRunIntentStore.js').IStartRunIntentStore;
type IClock = import('../../utils/clock.js').IClock;

export class PostStartIntentPersistenceError extends Error {
  constructor(
    readonly intentId: string,
    readonly runRef: EngineRunRef,
    readonly originalError: unknown
  ) {
    const cause =
      originalError instanceof Error ? originalError : new Error(toErrorMessage(originalError));
    super(`Intent persistence failed after adapter.startRun succeeded: ${cause.message}`, {
      cause,
    });
    this.name = 'PostStartIntentPersistenceError';
  }
}

export interface StartRunFailurePolicyDeps {
  stateStoreRead: IRunStateStoreRead;
  stateStoreWrite: IRunStateStoreWrite;
  intentStore: IStartRunIntentStore;
  observability: IObservability;
  eventFactory: StartRunEventFactory;
  clock: IClock;
  observabilityFallbackThrottleMs?: number;
}

export class StartRunFailurePolicy implements IStartRunFailurePolicy {
  private readonly stderrFallbackThrottleMs: number;
  private lastStderrFallbackAtMs = 0;

  constructor(private readonly deps: StartRunFailurePolicyDeps) {
    this.stderrFallbackThrottleMs =
      typeof deps.observabilityFallbackThrottleMs === 'number' &&
      Number.isFinite(deps.observabilityFallbackThrottleMs) &&
      deps.observabilityFallbackThrottleMs > 0
        ? deps.observabilityFallbackThrottleMs
        : 30_000;
  }

  async markIntentResolvedBestEffort(input: {
    intentId: string;
    tenantId: string;
    runId: string;
    provider: EngineRunRef['provider'];
    traceContext: StartRunTraceContext;
  }): Promise<void> {
    try {
      await this.deps.intentStore.markResolved({
        tenantId: input.tenantId,
        intentId: input.intentId,
      });
      return;
    } catch (error) {
      try {
        this.deps.observability.metrics
          .counter('dvt.intent.mark_resolved_failed_total', {
            tenantId: input.tenantId,
            provider: input.provider,
            operation: 'markResolved',
          })
          .add(1);
      } catch {
        // no-op: observability errors must not fail reconciliation.
      }

      try {
        this.deps.observability.logs.warn({
          msg: START_RUN_MESSAGE.markResolvedFailed,
          context: input.traceContext,
          attributes: {
            intentId: input.intentId,
            tenantId: input.tenantId,
            runId: input.runId,
            provider: input.provider,
            error: toErrorMessage(error),
          },
        });
      } catch {
        try {
          const nowMs = Date.parse(this.deps.clock.nowIsoUtc());
          if (
            this.lastStderrFallbackAtMs === 0 ||
            nowMs - this.lastStderrFallbackAtMs >= this.stderrFallbackThrottleMs
          ) {
            this.lastStderrFallbackAtMs = nowMs;
            process.stderr.write(
              `[dvt][StartRunApplicationService] markResolved observability reporting failed; intentId=${input.intentId} runId=${input.runId} tenantId=${input.tenantId}\n`
            );
          }
        } catch {
          // no-op
        }
      }
    }
  }

  async handleStartRunError(input: {
    error: unknown;
    resolvedContext: ResolvedRunContext;
    metricTags: Record<string, string>;
    traceContext: StartRunTraceContext;
    errorContext: StartRunErrorContext;
  }): Promise<never> {
    const { error, resolvedContext, metricTags, traceContext, errorContext } = input;
    this.reportStartRunFailure(error, resolvedContext.targetAdapter, metricTags, traceContext);

    if (error instanceof PostStartIntentPersistenceError) {
      this.reportPostStartIntentPersistence(error, traceContext);
      throw error;
    }

    if (
      errorContext.preparation?.disposition !== 'created' ||
      errorContext.phase === 'admission' ||
      errorContext.phase === 'intent'
    ) {
      throw error;
    }

    const failMeta = await this.getFailureMetadata(resolvedContext.tenantId, resolvedContext.runId);
    if (failMeta === null) throw error;

    const pendingIntent = await this.getPendingIntent(
      resolvedContext.tenantId,
      errorContext.intentId
    );
    if (pendingIntent?.status === 'PENDING') {
      this.reportSkipRunFailedPendingIntent(pendingIntent, traceContext);
      throw error;
    }

    await this.emitRunFailedBestEffort(failMeta, traceContext);
    throw error;
  }

  private reportStartRunFailure(
    error: unknown,
    provider: EngineRunRef['provider'],
    metricTags: Record<string, string>,
    traceContext: StartRunTraceContext
  ): void {
    try {
      this.deps.observability.metrics.counter('dvt.run.start_failed_total', metricTags).add(1);
    } catch {
      // no-op: observability reporting must not hide the domain error.
    }
    try {
      this.deps.observability.logs.error({
        msg: START_RUN_MESSAGE.startRunFailed,
        context: traceContext,
        err: toErrorMessage(error),
        attributes: {
          provider,
          error: toErrorMessage(error),
        },
      });
    } catch {
      // no-op: observability reporting must not hide the domain error.
    }
  }

  private reportPostStartIntentPersistence(
    error: PostStartIntentPersistenceError,
    traceContext: StartRunTraceContext
  ): void {
    try {
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.postStartIntentPersistenceFailed,
        context: traceContext,
        attributes: {
          intentId: error.intentId,
          runId: error.runRef.runId,
          provider: error.runRef.provider,
          error: toErrorMessage(error.originalError),
        },
      });
    } catch {
      // no-op: observability reporting must not hide the domain error.
    }
  }

  private reportSkipRunFailedPendingIntent(
    pendingIntent: Awaited<ReturnType<IStartRunIntentStore['getIntent']>>,
    traceContext: StartRunTraceContext
  ): void {
    if (pendingIntent === null) return;
    try {
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.skipRunFailedPendingIntent,
        context: traceContext,
        attributes: {
          intentId: pendingIntent.intentId,
          runId: pendingIntent.runId,
          provider: pendingIntent.provider,
        },
      });
    } catch {
      // no-op: observability reporting must not hide the domain error.
    }
  }

  private async getFailureMetadata(tenantId: string, runId: string): Promise<RunMetadata | null> {
    return this.deps.stateStoreRead.getRunMetadataByRunId(tenantId, runId).catch(() => null);
  }

  private async getPendingIntent(
    tenantId: string,
    intentId: string | undefined
  ): Promise<Awaited<ReturnType<IStartRunIntentStore['getIntent']>> | null> {
    if (intentId === undefined) return null;
    return this.deps.intentStore.getIntent({ tenantId, intentId }).catch(() => null);
  }

  private async emitRunFailedBestEffort(
    meta: RunMetadata,
    traceContext: StartRunTraceContext
  ): Promise<void> {
    await this.emitRunEvent(meta, 'RunFailed', {
      reason: START_RUN_FAILURE_REASON.startRunFailure,
    }).catch((emitErr: unknown) => {
      try {
        this.deps.observability.logs.error({
          msg: START_RUN_MESSAGE.runFailedEmissionFailed,
          context: traceContext,
          err: toErrorMessage(emitErr),
          attributes: {
            error: toErrorMessage(emitErr),
          },
        });
      } catch {
        // no-op: observability reporting must not hide the domain error.
      }
    });
  }

  private async emitRunEvent(
    meta: RunMetadata,
    eventType: EventType,
    payload?: Record<string, unknown>
  ): Promise<void> {
    await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
      this.deps.eventFactory.buildRunEvent(meta, eventType, payload),
    ]);
  }
}
