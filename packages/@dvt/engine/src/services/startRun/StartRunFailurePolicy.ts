/** @ownedConcern Guard start-run failure writes using preparation and authority observations. */
import type { StartRunTraceContext } from '../../core/lifecycle/StartRunTraceContext.js';
import { toErrorMessage } from '../../utils/errorUtils.js';

import { readStartRunAuthority } from './readStartRunAuthority.js';
import {
  START_RUN_AUTHORITY_REASON,
  START_RUN_FAILURE_REASON,
  START_RUN_MESSAGE,
} from './StartRunDomainConstants.js';
import type { StartRunEventFactory } from './StartRunEventFactory.js';
import { StartRunFailureDiagnostics } from './StartRunFailureDiagnostics.js';
import type { IStartRunFailurePolicy, StartRunErrorContext } from './StartRunTypes.js';

type EngineRunRef = import('@dvt/contracts').EngineRunRef;
type ResolvedRunContext = import('@dvt/contracts').ResolvedRunContext;
type IObservability = import('@dvt/observability').IObservability;
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
    super(`${START_RUN_MESSAGE.intentPersistenceError}: ${cause.message}`, { cause });
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
  private readonly diagnostics: StartRunFailureDiagnostics;
  private readonly deps: Pick<
    StartRunFailurePolicyDeps,
    'stateStoreRead' | 'stateStoreWrite' | 'intentStore' | 'eventFactory'
  >;

  constructor(deps: StartRunFailurePolicyDeps) {
    this.deps = {
      stateStoreRead: deps.stateStoreRead,
      stateStoreWrite: deps.stateStoreWrite,
      intentStore: deps.intentStore,
      eventFactory: deps.eventFactory,
    };
    this.diagnostics = new StartRunFailureDiagnostics({
      observability: deps.observability,
      clock: deps.clock,
      ...(deps.observabilityFallbackThrottleMs === undefined
        ? {}
        : { observabilityFallbackThrottleMs: deps.observabilityFallbackThrottleMs }),
    });
  }

  async markIntentResolvedBestEffort(
    input: Parameters<IStartRunFailurePolicy['markIntentResolvedBestEffort']>[0]
  ): Promise<void> {
    try {
      await this.deps.intentStore.markResolved({
        tenantId: input.tenantId,
        intentId: input.intentId,
      });
    } catch (error) {
      this.diagnostics.markResolvedFailed(error, input);
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
    this.diagnostics.startFailed(error, resolvedContext.targetAdapter, metricTags, traceContext);
    if (error instanceof PostStartIntentPersistenceError) {
      this.diagnostics.postStartPersistenceFailed(error, traceContext);
      throw error;
    }
    if (
      errorContext.preparation?.disposition !== 'created' ||
      errorContext.phase === 'admission' ||
      errorContext.phase === 'intent'
    )
      throw error;

    const { intentId } = errorContext;
    if (intentId === undefined) {
      this.diagnostics.unavailableAuthority(START_RUN_AUTHORITY_REASON.intentMissing, traceContext);
      throw error;
    }
    const metadata = await readStartRunAuthority(() =>
      this.deps.stateStoreRead.getRunMetadataByRunId(
        resolvedContext.tenantId,
        resolvedContext.runId
      )
    );
    if (metadata.kind !== 'found') {
      this.diagnostics.unavailableAuthority(
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
      this.diagnostics.unavailableAuthority(
        intent.kind === 'failed'
          ? START_RUN_AUTHORITY_REASON.intentReadFailed
          : START_RUN_AUTHORITY_REASON.intentMissing,
        traceContext
      );
      throw error;
    }
    if (intent.value.status === 'PENDING') {
      this.diagnostics.pendingIntent(intent.value, traceContext);
      throw error;
    }
    await this.emitRunFailedBestEffort(metadata.value, traceContext);
    throw error;
  }

  private async emitRunFailedBestEffort(
    meta: RunMetadata,
    traceContext: StartRunTraceContext
  ): Promise<void> {
    try {
      await this.deps.stateStoreWrite.appendAndEnqueueTx(meta.runId, [
        this.deps.eventFactory.buildRunEvent(meta, 'RunFailed', {
          reason: START_RUN_FAILURE_REASON.startRunFailure,
        }),
      ]);
    } catch (error) {
      this.diagnostics.runFailedEmissionFailed(error, traceContext);
    }
  }
}
