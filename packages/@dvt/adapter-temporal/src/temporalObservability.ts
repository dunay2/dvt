import { createNoopObservability } from '@dvt/observability';
import type { Attributes, IObservability, ObservabilityContext } from '@dvt/observability';

import type { TemporalAdapterConfig } from './config.js';

export function resolveTemporalObservability(observability?: IObservability): IObservability {
  return observability ?? createNoopObservability();
}

export function buildTemporalContext(
  config: TemporalAdapterConfig,
  overrides: Partial<ObservabilityContext> = {}
): ObservabilityContext {
  return {
    adapter: 'temporal',
    taskQueue: overrides.taskQueue ?? config.taskQueue,
    tenantId: overrides.tenantId,
    projectId: overrides.projectId,
    environmentId: overrides.environmentId,
    runId: overrides.runId,
    planId: overrides.planId,
    stepId: overrides.stepId,
    attemptId: overrides.attemptId,
  };
}

export function buildTemporalMetricTags(
  operation: string,
  result?: string
): Record<string, string> {
  return result === undefined
    ? { adapter: 'temporal', operation }
    : { adapter: 'temporal', operation, result };
}

export function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (
    typeof error === 'number' ||
    typeof error === 'boolean' ||
    typeof error === 'bigint' ||
    typeof error === 'symbol'
  ) {
    return String(error);
  }
  return 'Unknown error';
}

type TemporalObservedLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface TemporalObservedOutcome {
  readonly result?: string;
  readonly logLevel?: TemporalObservedLogLevel;
  readonly logMessage?: string;
  readonly logAttributes?: Attributes;
}

export interface ObservedTemporalOperationArgs<T> {
  readonly observability: IObservability;
  readonly context: ObservabilityContext;
  readonly spanName: string;
  readonly spanAttributes?: Attributes;
  readonly counterName: string;
  readonly durationName?: string;
  readonly metricOperation: string;
  readonly recordDurationOnError?: boolean;
  readonly run: () => Promise<T>;
  readonly onSuccess?: (value: T) => TemporalObservedOutcome;
  readonly onError?: (error: unknown) => TemporalObservedOutcome;
}

export async function runObservedTemporalOperation<T>(
  args: ObservedTemporalOperationArgs<T>
): Promise<T> {
  const startedAt = Date.now();

  return args.observability.withContext(args.context, () =>
    args.observability.traces.withSpan(
      args.spanName,
      {
        context: args.context,
        attributes: args.spanAttributes,
      },
      async (span) => {
        try {
          const value = await args.run();
          const outcome = args.onSuccess?.(value) ?? {};
          const result = outcome.result ?? 'ok';
          args.observability.metrics
            .counter(args.counterName, buildTemporalMetricTags(args.metricOperation, result))
            .add(1);
          if (args.durationName) {
            args.observability.metrics
              .histogram(args.durationName, buildTemporalMetricTags(args.metricOperation))
              .record(Date.now() - startedAt);
          }
          emitTemporalObservedLog(args.observability, args.context, outcome);
          span.setStatus('ok');
          return value;
        } catch (error) {
          const outcome = args.onError?.(error) ?? {};
          const result = outcome.result ?? 'error';
          args.observability.metrics
            .counter(args.counterName, buildTemporalMetricTags(args.metricOperation, result))
            .add(1);
          if (args.durationName && args.recordDurationOnError) {
            args.observability.metrics
              .histogram(args.durationName, buildTemporalMetricTags(args.metricOperation))
              .record(Date.now() - startedAt);
          }
          emitTemporalObservedLog(args.observability, args.context, outcome, error);
          span.recordException(error);
          span.setStatus('error', toErrorMessage(error));
          throw error;
        }
      }
    )
  );
}

function emitTemporalObservedLog(
  observability: IObservability,
  context: ObservabilityContext,
  outcome: TemporalObservedOutcome,
  err?: unknown
): void {
  if (!outcome.logMessage) {
    return;
  }

  const entry = {
    msg: outcome.logMessage,
    context,
    attributes: outcome.logAttributes,
    err,
  };

  switch (outcome.logLevel ?? 'info') {
    case 'debug':
      observability.logs.debug(entry);
      return;
    case 'warn':
      observability.logs.warn(entry);
      return;
    case 'error':
      observability.logs.error(entry);
      return;
    case 'info':
    default:
      observability.logs.info(entry);
  }
}

export async function withTimeoutMs<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const guardedPromise = promise.catch((error) => {
    if (timedOut) {
      return new Promise<never>(() => undefined);
    }
    throw error;
  });
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  try {
    return await Promise.race([guardedPromise, timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}

export async function withAbortSignalTimeout<T>(
  run: (signal: globalThis.AbortSignal) => Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  const controller = new globalThis.AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, ms);

  try {
    return await run(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw Object.assign(new Error(`${label} timed out after ${ms}ms`), { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
