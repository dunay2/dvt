import type { Attributes, ISpan, ITraces, SpanOptions, SpanStatus } from '@dvt/observability';
import {
  context as activeContext,
  SpanStatusCode,
  trace,
  type Span as OpenTelemetrySpan,
  type Tracer,
} from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

import {
  normalizeSpanName,
  resolveExceptionType,
  sanitizeTraceAttribute,
  sanitizeTraceAttributes,
  traceContextAttributes,
} from './otelTracePolicy.js';

let contextManagerInitialized = false;

export function ensureOpenTelemetryContextManager(): void {
  if (contextManagerInitialized) return;
  contextManagerInitialized = true;

  const manager = new AsyncLocalStorageContextManager().enable();
  if (!activeContext.setGlobalContextManager(manager)) {
    manager.disable();
  }
}

export class OpenTelemetryTraces implements ITraces {
  constructor(private readonly tracer: Tracer) {}

  startSpan(name: string, options?: SpanOptions): ISpan {
    return new OpenTelemetrySpanAdapter(this.createSpan(name, options));
  }

  withSpan<T>(name: string, options: SpanOptions | undefined, fn: (span: ISpan) => T): T {
    const openTelemetrySpan = this.createSpan(name, options);
    const span = new OpenTelemetrySpanAdapter(openTelemetrySpan);
    const spanContext = trace.setSpan(activeContext.active(), openTelemetrySpan);

    return activeContext.with(spanContext, () => runWithManagedSpan(span, fn));
  }

  private createSpan(name: string, options?: SpanOptions): OpenTelemetrySpan {
    return this.tracer.startSpan(
      normalizeSpanName(name),
      {
        attributes: sanitizeTraceAttributes({
          ...traceContextAttributes(options?.context),
          ...options?.attributes,
        }),
      },
      activeContext.active()
    );
  }
}

class OpenTelemetrySpanAdapter implements ISpan {
  private ended = false;

  constructor(private readonly span: OpenTelemetrySpan) {}

  setAttribute(key: string, value: unknown): void {
    const sanitized = sanitizeTraceAttribute(key, value);
    if (sanitized === undefined) return;
    try {
      this.span.setAttribute(key, sanitized);
    } catch {
      // Observability must not change the command outcome.
    }
  }

  setAttributes(attrs: Attributes): void {
    for (const [key, value] of Object.entries(attrs)) {
      this.setAttribute(key, value);
    }
  }

  recordException(err: unknown): void {
    try {
      this.span.recordException({
        name: resolveExceptionType(err),
        message: 'Operation failed',
      });
    } catch {
      // Observability must not change the command outcome.
    }
  }

  setStatus(status: SpanStatus, _message?: string): void {
    try {
      this.span.setStatus({
        code: status === 'ok' ? SpanStatusCode.OK : SpanStatusCode.ERROR,
      });
    } catch {
      // Observability must not change the command outcome.
    }
  }

  end(): void {
    if (this.ended) return;
    this.ended = true;
    try {
      this.span.end();
    } catch {
      // Observability must not change the command outcome.
    }
  }
}

function runWithManagedSpan<T>(span: OpenTelemetrySpanAdapter, fn: (span: ISpan) => T): T {
  try {
    const result = fn(span);
    if (isPromiseLike(result)) {
      return Promise.resolve(result).then(
        (value) => {
          span.end();
          return value;
        },
        (error: unknown) => {
          span.end();
          throw error;
        }
      ) as T;
    }
    span.end();
    return result;
  } catch (error) {
    span.end();
    throw error;
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === 'object' || typeof value === 'function') &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
