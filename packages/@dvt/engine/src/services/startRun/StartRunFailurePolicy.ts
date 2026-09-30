/**
 * @ownedConcern Apply start-run failure reporting, intent cleanup, and guarded
 * RunFailed emission.
 */
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import { readStartRunAuthority } from './readStartRunAuthority.js';
import {
  START_RUN_AUTHORITY_REASON,
  START_RUN_FAILURE_REASON,
  START_RUN_MESSAGE,
  START_RUN_METRIC,
} from './StartRunDomainConstants.js';
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
    super(`${START_RUN_MESSAGE.intentPersistenceError}: ${cause.message}`, {
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
          .counter(START_RUN_METRIC.intentMarkResolvedFailedTotal, {
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
              `${START_RUN_MESSAGE.markResolvedReportingFailed} intentId=${input.intentId} runId=${input.runId} tenantId=${input.tenantId}\n`
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

    const { intentId } = errorContext;
    if (intentId === undefined) {
      this.reportUnavailableAuthority(START_RUN_AUTHORITY_REASON.intentMissing, traceContext);
      throw error;
    }

    const metadata = await readStartRunAuthority(() =>
      this.deps.stateStoreRead.getRunMetadataByRunId(
        resolvedContext.tenantId,
        resolvedContext.runId
      )
    );
    if (metadata.kind !== 'found') {
      this.reportUnavailableAuthority(
        metadata.kind === 'failed'
          ? START_RUN_AUTHORITY_REASON.metadataReadFailed
          : START_RUN_AUTHORITY_REASON.metadataMissing,
        traceContext
      );
      throw error;
    }
    const intent = await readStartRunAuthority(() =>
      this.deps.intentStore.getIntent({ tenantId: resolvedContext.tenantId, intentId })
    );
    if (intent.kind !== 'found') {
      this.reportUnavailableAuthority(
        intent.kind === 'failed'
          ? START_RUN_AUTHORITY_REASON.intentReadFailed
          : START_RUN_AUTHORITY_REASON.intentMissing,
        traceContext
      );
      throw error;
    }
    if (intent.value.status === 'PENDING') {
      this.reportSkipRunFailedPendingIntent(intent.value, traceContext);
      throw error;
    }

    await this.emitRunFailedBestEffort(metadata.value, traceContext);
    throw error;
  }

  private reportStartRunFailure(
    error: unknown,
    provider: EngineRunRef['provider'],
    metricTags: Record<string, string>,
    traceContext: StartRunTraceContext
  ): void {
    try {
      this.deps.observability.metrics.counter(START_RUN_METRIC.startFailedTotal, metricTags).add(1);
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

  private reportUnavailableAuthority(
    reasonCode: (typeof START_RUN_AUTHORITY_REASON)[keyof typeof START_RUN_AUTHORITY_REASON],
    traceContext: StartRunTraceContext
  ): void {
    try {
      this.deps.observability.logs.warn({
        msg: START_RUN_MESSAGE.skipRunFailedUnavailableAuthority,
        context: traceContext,
        attributes: { reasonCode },
      });
    } catch {
      // Diagnostics cannot grant authority or replace the original start error.
    }
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
