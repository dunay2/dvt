import { createNoopObservability } from '@dvt/observability';
import type { IObservability } from '@dvt/observability';
import { vi } from 'vitest';

export function makeTrackingObservability(): {
  observability: IObservability;
  logs: {
    debug: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  metrics: {
    counter: ReturnType<typeof vi.fn>;
    histogram: ReturnType<typeof vi.fn>;
    gauge: ReturnType<typeof vi.fn>;
  };
  spans: {
    startSpan: ReturnType<typeof vi.fn>;
    withSpan: ReturnType<typeof vi.fn>;
  };
} {
  const add = vi.fn();
  const record = vi.fn();
  const set = vi.fn();
  const span = {
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    recordException: vi.fn(),
    setStatus: vi.fn(),
    end: vi.fn(),
  };

  const metrics = {
    counter: vi.fn(() => ({ add })),
    histogram: vi.fn(() => ({ record })),
    gauge: vi.fn(() => ({ set })),
  };

  const logs = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  const spans = {
    startSpan: vi.fn(() => span),
    withSpan: vi.fn(async (_name, _options, fn) => {
      try {
        return await fn(span);
      } finally {
        span.end();
      }
    }),
  };

  return {
    observability: {
      ...createNoopObservability(),
      metrics,
      logs,
      traces: spans,
    },
    logs,
    metrics,
    spans,
  };
}
