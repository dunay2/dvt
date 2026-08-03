import {
  InMemorySpanExporter,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OtelObservability } from '../src';
import { resolveTraceEndpoint } from '../src/otelTracePolicy.js';

const observabilityInstances: OtelObservability[] = [];

function createObservedTestAdapter(exporter: SpanExporter): OtelObservability {
  const observability = new OtelObservability({
    serviceName: 'test-service',
    spanExporter: exporter,
  });
  observabilityInstances.push(observability);
  return observability;
}

function spanByName(spans: readonly ReadableSpan[], name: string): ReadableSpan {
  const span = spans.find((candidate) => candidate.name === name);
  expect(span, `missing span ${name}`).toBeDefined();
  return span!;
}

describe('OtelObservability', () => {
  afterEach(async () => {
    await Promise.all(observabilityInstances.splice(0).map((instance) => instance.shutdown()));
    vi.restoreAllMocks();
  });

  it('exports nested asynchronous spans in one trace with correct parentage', async () => {
    const exporter = new InMemorySpanExporter();
    const obs = createObservedTestAdapter(exporter);

    await obs.traces.withSpan(
      'api.startRun',
      { attributes: { operation: 'start_run' } },
      async () => {
        await Promise.resolve();
        await obs.traces.withSpan(
          'engine.startRun',
          { attributes: { provider: 'temporal' } },
          async () => {
            await Promise.resolve();
            await obs.traces.withSpan(
              'temporal.startRun',
              { attributes: { adapter: 'temporal' } },
              async () => undefined
            );
          }
        );
      }
    );
    await obs.forceFlush();

    const spans = exporter.getFinishedSpans();
    const apiSpan = spanByName(spans, 'api.startRun');
    const engineSpan = spanByName(spans, 'engine.startRun');
    const temporalSpan = spanByName(spans, 'temporal.startRun');

    expect(new Set(spans.map((span) => span.spanContext().traceId)).size).toBe(1);
    expect(engineSpan.parentSpanContext?.spanId).toBe(apiSpan.spanContext().spanId);
    expect(temporalSpan.parentSpanContext?.spanId).toBe(engineSpan.spanContext().spanId);
  });

  it('normalizes OTLP trace endpoints without a backtracking expression', () => {
    expect(resolveTraceEndpoint('https://collector.example////')).toBe(
      'https://collector.example/v1/traces'
    );
    expect(resolveTraceEndpoint('https://collector.example/v1/traces/')).toBe(
      'https://collector.example/v1/traces'
    );
  });

  it('exports only governed trace attributes and bounded exception details', async () => {
    const exporter = new InMemorySpanExporter();
    const obs = createObservedTestAdapter(exporter);

    await obs.traces.withSpan(
      'engine.startRun',
      {
        context: {
          adapter: 'temporal',
          runId: 'run-sensitive-id',
          planId: 'plan-sensitive-id',
        },
        attributes: {
          operation: 'start_run',
          provider: 'temporal',
          planUri: 'file:///private/workspace/secret-plan.json',
          authorization: 'Bearer secret-token-value',
          sql: 'select password from credentials',
        },
      },
      async (span) => {
        span.recordException(new Error('secret-token-value at C:\\private\\workspace'));
        span.setStatus('error', 'secret-token-value');
      }
    );
    await obs.forceFlush();

    const span = spanByName(exporter.getFinishedSpans(), 'engine.startRun');
    expect(span.attributes).toMatchObject({
      operation: 'start_run',
      provider: 'temporal',
      adapter: 'temporal',
    });
    expect(span.attributes).not.toHaveProperty('planUri');
    expect(span.attributes).not.toHaveProperty('authorization');
    expect(span.attributes).not.toHaveProperty('sql');
    expect(
      JSON.stringify({ attributes: span.attributes, events: span.events, status: span.status })
    ).not.toMatch(/secret-token-value|private|workspace|credentials/i);
  });

  it('does not duplicate an exception recorded by the observed operation', async () => {
    const exporter = new InMemorySpanExporter();
    const obs = createObservedTestAdapter(exporter);
    const failure = new Error('submission failed');

    await expect(
      obs.traces.withSpan('temporal.startRun', undefined, async (span) => {
        span.recordException(failure);
        span.setStatus('error');
        throw failure;
      })
    ).rejects.toBe(failure);
    await obs.forceFlush();

    const span = spanByName(exporter.getFinishedSpans(), 'temporal.startRun');
    expect(span.events.filter((event) => event.name === 'exception')).toHaveLength(1);
  });

  it('does not let a throwing exporter change the observed callback outcome', async () => {
    const exporter: SpanExporter = {
      export() {
        throw new Error('collector unavailable');
      },
      async shutdown() {},
    };
    const obs = createObservedTestAdapter(exporter);

    await expect(
      obs.traces.withSpan('api.startRun', undefined, async () => {
        await Promise.resolve();
        return 'accepted';
      })
    ).resolves.toBe('accepted');
    await expect(obs.forceFlush()).resolves.toBeUndefined();
  });

  it('enforces forbidden high-cardinality metric labels', () => {
    const obs = new OtelObservability({ serviceName: 'test-service' });
    expect(() => obs.metrics.counter('dvt.steps.started', { runId: 'r-1' })).toThrow(
      /Forbidden metric label key/
    );
  });

  it('attaches ambient run context to structured logs emitted inside withContext', () => {
    const obs = new OtelObservability({ serviceName: 'test-service' });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    obs.withContext(
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        adapter: 'temporal',
        runId: 'run-1',
        planId: 'plan-1',
        planSha: 'a'.repeat(64),
        stepId: 'step-load',
        attemptId: '2',
      },
      () => {
        obs.logs.info({
          msg: 'run.diagnostics',
          attributes: {
            durationMs: 1234,
            status: 'FAILED',
            errorCode: 'SINK_WRITE_FAILED',
          },
        });
      }
    );

    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(consoleLog.mock.calls[0]?.[0] as string)).toMatchObject({
      level: 'info',
      msg: 'run.diagnostics',
      context: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        adapter: 'temporal',
        runId: 'run-1',
        planId: 'plan-1',
        planSha: 'a'.repeat(64),
        stepId: 'step-load',
        attemptId: '2',
      },
      attributes: {
        durationMs: 1234,
        status: 'FAILED',
        errorCode: 'SINK_WRITE_FAILED',
      },
    });
  });

  it('preserves ambient run context for structured logs emitted after an async boundary', async () => {
    const obs = new OtelObservability({ serviceName: 'test-service' });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    await obs.withContext(
      {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        adapter: 'temporal',
        runId: 'run-async',
        planId: 'plan-async',
      },
      async () => {
        await Promise.resolve();

        obs.logs.info({
          msg: 'run.async.diagnostics',
          attributes: {
            durationMs: 25,
          },
        });
      }
    );

    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(consoleLog.mock.calls[0]?.[0] as string)).toMatchObject({
      level: 'info',
      msg: 'run.async.diagnostics',
      context: {
        tenantId: 'tenant-a',
        projectId: 'project-a',
        environmentId: 'dev',
        adapter: 'temporal',
        runId: 'run-async',
        planId: 'plan-async',
      },
      attributes: {
        durationMs: 25,
      },
    });
  });

  it('keeps explicit log context when it differs from the ambient context', () => {
    const obs = new OtelObservability({ serviceName: 'test-service' });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    obs.withContext({ runId: 'ambient-run' }, () => {
      obs.logs.warn({
        msg: 'run.diagnostics',
        context: { runId: 'explicit-run', stepId: 'step-explicit' },
      });
    });

    expect(consoleLog).toHaveBeenCalledTimes(1);
    expect(JSON.parse(consoleLog.mock.calls[0]?.[0] as string)).toMatchObject({
      level: 'warn',
      msg: 'run.diagnostics',
      context: { runId: 'explicit-run', stepId: 'step-explicit' },
    });
  });
});
