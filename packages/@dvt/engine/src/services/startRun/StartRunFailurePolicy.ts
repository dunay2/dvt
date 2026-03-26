import type { EngineRunRef, ResolvedRunContext } from '@dvt/contracts';
import type { IObservability } from '@dvt/observability';

import type { EventType, RunMetadata } from '../../contracts/runEvents.js';
import type { IRunStateStoreRead, IRunStateStoreWrite } from '../../ports/IRunStateStore.js';
import type { IStartRunIntentStore } from '../../ports/IStartRunIntentStore.js';
import type { IClock } from '../../utils/clock.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import { START_RUN_FAILURE_REASON, START_RUN_MESSAGE } from './StartRunDomainConstants.js';
import type { StartRunEventFactory } from './StartRunEventFactory.js';
import type { StartRunErrorContext, StartRunTraceContext } from './StartRunTypes.js';

export class PostStartIntentPersistenceError extends Error {
  constructor(
    readonly intentId: string,
    readonly runRef: EngineRunRef,
    readonly originalError: unknown
  ) {
    const cause = originalError instanceof Error ? originalError : new Error(String(originalError));
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

export class StartRunFailurePolicy {
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
      await this.deps.intentStore.markResolved(input.intentId);
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
              `[dvt][StartRunCoordinator] markResolved observability reporting failed; intentId=${input.intentId} runId=${input.runId} tenantId=${input.tenantId}\n`
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
          provider: resolvedContext.targetAdapter,
          error: toErrorMessage(error),
        },
      });
    } catch {
      // no-op: observability reporting must not hide the domain error.
    }

    if (error instanceof PostStartIntentPersistenceError) {
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
      throw error;
    }

    const failMeta = await this.deps.stateStoreRead
      .getRunMetadataByRunId(resolvedContext.tenantId, resolvedContext.runId)
      .catch(() => null);
    if (failMeta) {
      const pendingIntent = errorContext.intentId
        ? await this.deps.intentStore.getIntent(errorContext.intentId).catch(() => null)
        : null;
      if (pendingIntent?.status === 'PENDING') {
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
        throw error;
      }

      await this.emitRunEvent(failMeta, 'RunFailed', {
        reason: START_RUN_FAILURE_REASON.startRunFailure,
      }).catch((emitErr: unknown) => {
        try {
          this.deps.observability.logs.error({
            msg: START_RUN_MESSAGE.runFailedEmissionFailed,
            context: traceContext,
            err: emitErr instanceof Error ? emitErr.message : String(emitErr),
            attributes: {
              error: toErrorMessage(emitErr),
            },
          });
        } catch {
          // no-op: observability reporting must not hide the domain error.
        }
      });
    }
    throw error;
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
