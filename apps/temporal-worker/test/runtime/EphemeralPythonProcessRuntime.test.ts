import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PythonRuntimeExecutionRequest } from '@dvt/temporal-python-plugin';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { EphemeralPythonProcessRuntime } from '../../src/runtime/EphemeralPythonProcessRuntime.js';

const RUNTIME_REF = 'python-runtime:cpython-test';
const PYTHON_BIN = locatePythonBinary();

if (PYTHON_BIN === undefined) {
  throw new Error(
    'A CPython executable is required for the governed Python runtime proof. Set DVT_TEST_PYTHON_BIN.'
  );
}

describe('EphemeralPythonProcessRuntime', () => {
  let workdirRoot: string;
  let runtime: EphemeralPythonProcessRuntime;

  beforeEach(async () => {
    workdirRoot = await mkdtemp(join(tmpdir(), 'dvt-python-runtime-test-'));
    runtime = new EphemeralPythonProcessRuntime({
      runtimes: new Map([[RUNTIME_REF, PYTHON_BIN]]),
      workdirRoot,
    });
  });

  afterEach(async () => {
    await rm(workdirRoot, { recursive: true, force: true });
  });

  it('executes with explicit JSON input and returns only bounded result metadata', async () => {
    const outcome = await runtime.execute(
      request(
        [
          'import sys',
          'print("visible only as a count")',
          'print("stderr count", file=sys.stderr)',
          'result = {"total": inputs["left"] + inputs["right"]}',
        ].join('\n'),
        { left: 2, right: 3 }
      )
    );

    expect(outcome).toEqual({
      ok: true,
      result: { total: 5 },
      stdoutBytes: Buffer.byteLength('visible only as a count\n'),
      stderrBytes: Buffer.byteLength('stderr count\n'),
    });
    expect(await readdir(workdirRoot)).toEqual([]);
    expect(JSON.stringify(outcome)).not.toContain('visible only as a count');
  });

  it('uses the real compiler before executing any user statement', async () => {
    const sentinel = join(workdirRoot, 'must-not-exist.txt');
    const outcome = await runtime.execute(
      request(
        [
          'open(inputs["sentinel"], "w", encoding="utf-8").write("executed")',
          'if True print("invalid")',
          'result = 1',
        ].join('\n'),
        { sentinel }
      )
    );

    expect(outcome).toMatchObject({
      ok: false,
      classification: 'rejected',
      code: 'PYTHON_SOURCE_INVALID',
      diagnostic: { phase: 'compile', line: 2 },
    });
    await expect(readFile(sentinel, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('starts from fresh interpreter state for every step', async () => {
    const first = await runtime.execute(
      request('import builtins\nbuiltins.DVT_HIDDEN_STATE = 42\nresult = True')
    );
    const second = await runtime.execute(
      request('import builtins\nresult = hasattr(builtins, "DVT_HIDDEN_STATE")')
    );

    expect(first).toMatchObject({ ok: true, result: true });
    expect(second).toMatchObject({ ok: true, result: false });
  });

  it('terminates code that exceeds its wall-time limit', async () => {
    const outcome = await runtime.execute(
      request('while True:\n    pass', {}, { timeoutMs: 150, terminationGraceMs: 25 })
    );

    expect(outcome).toMatchObject({
      ok: false,
      classification: 'rejected',
      code: 'PYTHON_EXECUTION_TIMEOUT',
    });
  });

  it('rejects bounded streams and non-JSON results without returning their content', async () => {
    const streamOutcome = await runtime.execute(
      request('print("secret" * 100)\nresult = 1', {}, { maxStdoutBytes: 16 })
    );
    const resultOutcome = await runtime.execute(request('result = {1, 2, 3}'));

    expect(streamOutcome).toMatchObject({
      ok: false,
      classification: 'rejected',
      code: 'PYTHON_STDOUT_LIMIT_EXCEEDED',
    });
    expect(resultOutcome).toMatchObject({
      ok: false,
      classification: 'rejected',
      code: 'PYTHON_RESULT_NOT_JSON',
    });
    expect(JSON.stringify(streamOutcome)).not.toContain('secret');
  });

  it('does not inherit arbitrary worker environment variables', async () => {
    process.env.DVT_PYTHON_TEST_SECRET = 'must-not-cross-the-boundary';
    try {
      const outcome = await runtime.execute(
        request(
          'import os\nresult = {"secret": os.environ.get("DVT_PYTHON_TEST_SECRET")}'
        )
      );
      expect(outcome).toMatchObject({ ok: true, result: { secret: null } });
    } finally {
      delete process.env.DVT_PYTHON_TEST_SECRET;
    }
  });

  it('terminates the process on cancellation and propagates the cancellation reason', async () => {
    const controller = new AbortController();
    const execution = runtime.execute(
      request('while True:\n    pass', {}, { timeoutMs: 5_000 }, controller.signal)
    );
    setTimeout(() => controller.abort(new Error('cancelled by Temporal')), 50).unref();

    await expect(execution).rejects.toThrow('cancelled by Temporal');
    expect(await readdir(workdirRoot)).toEqual([]);
  });

  it('fails closed for an unknown runtime ref', async () => {
    const outcome = await runtime.execute({ ...request('result = 1'), runtimeRef: 'python-runtime:other' });

    expect(outcome).toMatchObject({
      ok: false,
      classification: 'runtime',
      code: 'PYTHON_RUNTIME_UNAVAILABLE',
    });
  });
});

function request(
  source: string,
  inputs: Record<string, null | boolean | number | string> = {},
  limitPatch: Partial<PythonRuntimeExecutionRequest['limits']> = {},
  signal?: AbortSignal
): PythonRuntimeExecutionRequest {
  return {
    runtimeRef: RUNTIME_REF,
    protocolVersion: 'python-json-v1',
    source,
    inputs,
    limits: {
      timeoutMs: 5_000,
      terminationGraceMs: 100,
      maxStdoutBytes: 4_096,
      maxStderrBytes: 4_096,
      maxResultBytes: 4_096,
      ...limitPatch,
    },
    ...(signal === undefined ? {} : { signal }),
  };
}

function locatePythonBinary(): string | undefined {
  const candidates = [
    process.env.DVT_TEST_PYTHON_BIN,
    '/usr/bin/python3',
    '/usr/local/bin/python3',
    process.platform === 'win32' ? 'C:\\Python313\\python.exe' : undefined,
  ];
  return candidates.find((candidate): candidate is string =>
    candidate === undefined ? false : existsSync(candidate)
  );
}
