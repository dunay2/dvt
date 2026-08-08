import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type {
  PythonRuntimeExecutionOutcome,
  PythonRuntimeExecutionRequest,
  PythonRuntimePort,
} from '@dvt/temporal-python-plugin';

import {
  parsePythonProcessEnvelope,
  PYTHON_CODE_PROCESS_WRAPPER,
} from './pythonCodeProcessProtocol.js';

const PROTOCOL_OVERHEAD_BYTES = 4_096;

export interface EphemeralPythonProcessRuntimeOptions {
  readonly runtimes: ReadonlyMap<string, string>;
  readonly workdirRoot?: string;
}

interface ProcessCompletion {
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  readonly stdout: Uint8Array;
  readonly rawStderrBytes: number;
  readonly timedOut: boolean;
  readonly cancelled: boolean;
  readonly protocolOverflow: boolean;
  readonly stderrOverflow: boolean;
  readonly spawnFailed: boolean;
}

export class EphemeralPythonProcessRuntime implements PythonRuntimePort {
  private readonly workdirRoot: string;

  public constructor(private readonly options: EphemeralPythonProcessRuntimeOptions) {
    this.workdirRoot = options.workdirRoot ?? join(tmpdir(), 'dvt', 'python-worker');
  }

  public async execute(
    request: PythonRuntimeExecutionRequest
  ): Promise<PythonRuntimeExecutionOutcome> {
    const executable = this.options.runtimes.get(request.runtimeRef);
    if (executable === undefined) {
      return runtimeFailure('PYTHON_RUNTIME_UNAVAILABLE');
    }
    assertNotAborted(request.signal);

    await mkdir(this.workdirRoot, { recursive: true });
    const workdir = await mkdtemp(join(this.workdirRoot, 'step-'));
    try {
      const completion = await runProcess(executable, workdir, request);
      if (completion.cancelled) {
        throw request.signal?.reason ?? new Error('Python code execution cancelled');
      }
      if (completion.timedOut) {
        return rejectedFailure('PYTHON_EXECUTION_TIMEOUT', 'execute');
      }
      if (completion.stderrOverflow) {
        return rejectedFailure('PYTHON_STDERR_LIMIT_EXCEEDED', 'execute');
      }
      if (completion.protocolOverflow) {
        return runtimeFailure('PYTHON_RUNTIME_PROTOCOL_INVALID');
      }
      if (completion.spawnFailed) {
        return runtimeFailure('PYTHON_RUNTIME_UNAVAILABLE');
      }
      if (completion.exitCode !== 0 || completion.signalCode !== null) {
        return rejectedFailure('PYTHON_EXECUTION_FAILED', 'execute');
      }

      const text = decodeProtocol(completion.stdout);
      if (text === undefined) {
        return runtimeFailure('PYTHON_RUNTIME_PROTOCOL_INVALID');
      }
      const outcome = parsePythonProcessEnvelope(text);
      if (outcome === undefined) {
        return runtimeFailure('PYTHON_RUNTIME_PROTOCOL_INVALID');
      }
      if (!outcome.ok) return outcome;

      const stderrBytes = outcome.stderrBytes + completion.rawStderrBytes;
      if (stderrBytes > request.limits.maxStderrBytes) {
        return rejectedFailure('PYTHON_STDERR_LIMIT_EXCEEDED', 'execute');
      }
      return { ...outcome, stderrBytes };
    } finally {
      await rm(workdir, { recursive: true, force: true });
    }
  }
}

async function runProcess(
  executable: string,
  workdir: string,
  request: PythonRuntimeExecutionRequest
): Promise<ProcessCompletion> {
  let child: ChildProcessWithoutNullStreams;
  try {
    const options: SpawnOptionsWithoutStdio = {
      cwd: workdir,
      env: sanitizedPythonEnvironment(),
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
    };
    child = spawn(executable, ['-I', '-B', '-c', PYTHON_CODE_PROCESS_WRAPPER], {
      ...options,
      stdio: 'pipe',
    });
  } catch {
    return failedToSpawn();
  }

  const stdoutChunks: Uint8Array[] = [];
  let stdoutBytes = 0;
  let rawStderrBytes = 0;
  let timedOut = false;
  let cancelled = false;
  let protocolOverflow = false;
  let stderrOverflow = false;
  let spawnFailed = false;
  let forceKillTimer: NodeJS.Timeout | undefined;
  let settled = false;

  const protocolLimit = request.limits.maxResultBytes + PROTOCOL_OVERHEAD_BYTES;
  const completion = new Promise<ProcessCompletion>((resolve) => {
    const finish = (exitCode: number | null, signalCode: NodeJS.Signals | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (forceKillTimer !== undefined) clearTimeout(forceKillTimer);
      request.signal?.removeEventListener('abort', abort);
      resolve({
        exitCode,
        signalCode,
        stdout: concatenate(stdoutChunks, stdoutBytes),
        rawStderrBytes,
        timedOut,
        cancelled,
        protocolOverflow,
        stderrOverflow,
        spawnFailed,
      });
    };

    const terminate = (): void => {
      killProcessTree(child, 'SIGTERM');
      if (forceKillTimer !== undefined) return;
      forceKillTimer = setTimeout(() => {
        killProcessTree(child, 'SIGKILL');
      }, request.limits.terminationGraceMs);
      forceKillTimer.unref();
    };

    const abort = (): void => {
      cancelled = true;
      terminate();
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutBytes += chunk.byteLength;
      if (stdoutBytes > protocolLimit) {
        protocolOverflow = true;
        terminate();
        return;
      }
      stdoutChunks.push(Uint8Array.from(chunk));
    });
    child.stderr.on('data', (chunk: Buffer) => {
      rawStderrBytes += chunk.byteLength;
      if (rawStderrBytes > request.limits.maxStderrBytes) {
        stderrOverflow = true;
        terminate();
      }
    });
    child.once('error', () => {
      spawnFailed = true;
      finish(null, null);
    });
    child.once('close', finish);
    child.stdin.on('error', () => {
      // EPIPE is expected when the runtime exits before consuming the request.
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      terminate();
    }, request.limits.timeoutMs);
    timeout.unref();

    request.signal?.addEventListener('abort', abort, { once: true });
    if (request.signal?.aborted === true) {
      abort();
    }
  });

  child.stdin.end(
    JSON.stringify({
      protocolVersion: request.protocolVersion,
      source: request.source,
      inputs: request.inputs,
      limits: request.limits,
    })
  );

  return completion;
}

function killProcessTree(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals
): void {
  if (child.pid === undefined) return;
  if (process.platform !== 'win32') {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall through to direct child termination when the process group is gone.
    }
  }
  try {
    child.kill(signal);
  } catch {
    // Process already exited.
  }
}

function sanitizedPythonEnvironment(): NodeJS.ProcessEnv {
  return {
    PYTHONIOENCODING: 'utf-8',
    PYTHONUTF8: '1',
    ...(process.platform === 'win32' && process.env.SystemRoot !== undefined
      ? { SystemRoot: process.env.SystemRoot }
      : {}),
  };
}

function concatenate(chunks: readonly Uint8Array[], size: number): Uint8Array {
  const output = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function decodeProtocol(bytes: Uint8Array): string | undefined {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

function rejectedFailure(
  code:
    | 'PYTHON_EXECUTION_TIMEOUT'
    | 'PYTHON_EXECUTION_FAILED'
    | 'PYTHON_STDERR_LIMIT_EXCEEDED',
  phase: 'execute'
): PythonRuntimeExecutionOutcome {
  return { ok: false, classification: 'rejected', code, diagnostic: { phase } };
}

function runtimeFailure(
  code: 'PYTHON_RUNTIME_UNAVAILABLE' | 'PYTHON_RUNTIME_PROTOCOL_INVALID'
): PythonRuntimeExecutionOutcome {
  return {
    ok: false,
    classification: 'runtime',
    code,
    diagnostic: { phase: 'protocol' },
  };
}

function failedToSpawn(): ProcessCompletion {
  return {
    exitCode: null,
    signalCode: null,
    stdout: new Uint8Array(),
    rawStderrBytes: 0,
    timedOut: false,
    cancelled: false,
    protocolOverflow: false,
    stderrOverflow: false,
    spawnFailed: true,
  };
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('Python code execution cancelled');
  }
}
