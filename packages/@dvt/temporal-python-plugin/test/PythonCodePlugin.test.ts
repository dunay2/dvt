import type { StepDefinition, StepExecutionContext } from '@dvt/adapter-temporal';
import { describe, expect, it, vi } from 'vitest';

import {
  createPythonCodePluginProfile,
  PYTHON_CODE_PLUGIN_ID,
  PythonCodeExecutionRejectedError,
  PythonCodeExecutionRuntimeError,
  PythonCodePluginRunner,
} from '../src/index.js';

const SCOPE = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' } as const;
const SOURCE = 'result = {"total": inputs["left"] + inputs["right"]}';
const CONFIG = {
  scope: SCOPE,
  runtimeRef: 'python-runtime:cpython-3-13',
  protocolVersion: 'python-json-v1' as const,
  source: SOURCE,
  inputs: { left: 2, right: 3 },
  limits: {
    timeoutMs: 10_000,
    terminationGraceMs: 500,
    maxStdoutBytes: 1_024,
    maxStderrBytes: 1_024,
    maxResultBytes: 1_024,
  },
};
const CONTEXT: StepExecutionContext = {
  executionIdentity: {
    tenantId: SCOPE.tenantId,
    runId: 'run-a',
    environmentId: SCOPE.environmentId,
  },
  runContext: { ...SCOPE, runId: 'run-a', targetAdapter: 'temporal', logicalAttemptId: 1 },
};

describe('Python code Temporal profile', () => {
  it('registers only the canonical Python kind and rejects malformed config permanently', async () => {
    const execute = vi.fn();
    const profile = createPythonCodePluginProfile({ execute });

    expect(profile.pluginId).toBe(PYTHON_CODE_PLUGIN_ID);
    expect([...profile.stepActivitiesByKind.keys()]).toEqual(['EXECUTE_PYTHON_CODE']);
    await expect(
      profile.stepActivitiesByKind.get('EXECUTE_PYTHON_CODE')?.execute(step({}), CONTEXT)
    ).rejects.toMatchObject({ nonRetryable: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('passes explicit input to a stateless runtime and returns bounded receipt evidence', async () => {
    const execute = vi.fn(async () => ({
      ok: true as const,
      result: { total: 5 },
      stdoutBytes: 0,
      stderrBytes: 0,
    }));
    const runner = new PythonCodePluginRunner({
      runtime: { execute },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
      now: vi
        .fn<() => Date>()
        .mockReturnValueOnce(new Date('2026-08-08T00:00:00.000Z'))
        .mockReturnValueOnce(new Date('2026-08-08T00:00:00.025Z')),
    });

    const result = await runner.execute({
      step: step(CONFIG),
      config: CONFIG,
      executionIdentity: CONTEXT.executionIdentity,
      runContext: CONTEXT.runContext,
    });

    expect(execute).toHaveBeenCalledWith({
      runtimeRef: CONFIG.runtimeRef,
      protocolVersion: CONFIG.protocolVersion,
      source: SOURCE,
      inputs: CONFIG.inputs,
      limits: CONFIG.limits,
    });
    expect(result.resultEvidence).toEqual({
      evidenceType: 'python-code-execution',
      environmentId: SCOPE.environmentId,
      runtimeRef: CONFIG.runtimeRef,
      protocolVersion: CONFIG.protocolVersion,
      result: { total: 5 },
      stdoutBytes: 0,
      stderrBytes: 0,
      startedAt: '2026-08-08T00:00:00.000Z',
      completedAt: '2026-08-08T00:00:00.025Z',
      durationMs: 25,
    });
    expect(JSON.stringify(result)).not.toContain(SOURCE);
    expect(JSON.stringify(result)).not.toContain('"left":2');
  });

  it('rejects scope and runtime binding drift before invoking the provider', async () => {
    const execute = vi.fn();
    const runner = new PythonCodePluginRunner({
      runtime: { execute },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
    });

    await expect(
      runner.execute({
        step: step(CONFIG),
        config: { ...CONFIG, runtimeRef: 'python-runtime:other' },
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toMatchObject({ code: 'PYTHON_RUNTIME_BINDING_MISMATCH' });
    await expect(
      runner.execute({
        step: step(CONFIG),
        config: CONFIG,
        executionIdentity: CONTEXT.executionIdentity,
        runContext: { ...CONTEXT.runContext, environmentId: 'prod' },
      })
    ).rejects.toMatchObject({ code: 'PYTHON_EXECUTION_SCOPE_MISMATCH' });
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps compiler diagnostics to a controlled permanent failure', async () => {
    const runner = new PythonCodePluginRunner({
      runtime: {
        execute: vi.fn(async () => ({
          ok: false as const,
          classification: 'rejected' as const,
          code: 'PYTHON_SOURCE_INVALID' as const,
          diagnostic: { phase: 'compile' as const, line: 2, column: 7 },
        })),
      },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
    });
    const activity = createPythonCodePluginProfile(runner).stepActivitiesByKind.get(
      'EXECUTE_PYTHON_CODE'
    );

    await expect(activity?.execute(step(CONFIG), CONTEXT)).rejects.toMatchObject({
      nonRetryable: true,
      message: expect.stringContaining('PYTHON_SOURCE_INVALID:line=2:column=7'),
    });
  });

  it('keeps provider failures retryable and strips unknown provider exceptions', async () => {
    const unavailable = new PythonCodePluginRunner({
      runtime: { execute: vi.fn(async () => Promise.reject(new Error('secret provider detail'))) },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
    });
    await expect(
      unavailable.execute({
        step: step(CONFIG),
        config: CONFIG,
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toEqual(new PythonCodeExecutionRuntimeError('PYTHON_RUNTIME_UNAVAILABLE'));
  });

  it('defends configured output limits even when the provider returns an invalid success', async () => {
    const runner = new PythonCodePluginRunner({
      runtime: {
        execute: vi.fn(async () => ({
          ok: true as const,
          result: { total: 5 },
          stdoutBytes: CONFIG.limits.maxStdoutBytes + 1,
          stderrBytes: 0,
        })),
      },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
    });

    await expect(
      runner.execute({
        step: step(CONFIG),
        config: CONFIG,
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toEqual(new PythonCodeExecutionRejectedError('PYTHON_STDOUT_LIMIT_EXCEEDED'));
  });

  it('does not start the provider after cancellation', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    const execute = vi.fn();
    const runner = new PythonCodePluginRunner({
      runtime: { execute },
      allowedRuntimeRefs: new Set([CONFIG.runtimeRef]),
      getCancellationSignal: () => controller.signal,
    });

    await expect(
      runner.execute({
        step: step(CONFIG),
        config: CONFIG,
        executionIdentity: CONTEXT.executionIdentity,
        runContext: CONTEXT.runContext,
      })
    ).rejects.toThrow('cancelled');
    expect(execute).not.toHaveBeenCalled();
  });
});

function step(config: unknown): StepDefinition {
  return {
    stepId: 'python.calculate',
    kind: 'EXECUTE_PYTHON_CODE',
    dependsOn: [],
    stepTypeConfig: config,
  } as StepDefinition;
}
