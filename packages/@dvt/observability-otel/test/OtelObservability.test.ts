import { afterEach, describe, expect, it, vi } from 'vitest';

import { OtelObservability } from '../src';

describe('OtelObservability', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a no-op span and closes it without throwing', () => {
    const obs = new OtelObservability({ serviceName: 'test-service' });
    expect(() => {
      const span = obs.traces.startSpan('test.span');
      span.setAttribute('k', 'v');
      span.end();
    }).not.toThrow();
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
