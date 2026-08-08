import type { StepResult } from '@dvt/adapter-temporal';
import { PythonCodeExecutionEvidenceSchema } from '@dvt/contracts/python-code';

import {
  PythonCodeExecutionRejectedError,
  PythonCodeExecutionRuntimeError,
} from './pythonCodePluginErrors.js';
import type {
  PythonCodePluginExecutionInput,
  PythonCodePluginRunnerPort,
  PythonRuntimeExecutionFailure,
  PythonRuntimeExecutionOutcome,
  PythonRuntimePort,
} from './pythonCodePluginTypes.js';

export interface PythonCodePluginRunnerOptions {
  readonly runtime: PythonRuntimePort;
  readonly allowedRuntimeRefs: ReadonlySet<string>;
  readonly getCancellationSignal?: () => globalThis.AbortSignal | undefined;
  readonly now?: () => Date;
}

export class PythonCodePluginRunner implements PythonCodePluginRunnerPort {
  private readonly getCancellationSignal: () => globalThis.AbortSignal | undefined;
  private readonly now: () => Date;

  public constructor(private readonly options: PythonCodePluginRunnerOptions) {
    this.getCancellationSignal = options.getCancellationSignal ?? (() => undefined);
    this.now = options.now ?? (() => new Date());
  }

  public async execute(input: PythonCodePluginExecutionInput): Promise<StepResult> {
    assertScope(input);
    if (!this.options.allowedRuntimeRefs.has(input.config.runtimeRef)) {
      reject('PYTHON_RUNTIME_BINDING_MISMATCH');
    }

    const signal = this.getCancellationSignal();
    assertNotAborted(signal);
    const startedAt = this.now();
    const outcome = await executeRuntimeSafely(this.options.runtime, input, signal);
    assertNotAborted(signal);
    if (!outcome.ok) throwOutcome(outcome);
    assertOutcomeLimits(input, outcome);
    const completedAt = this.now();

    const evidence = PythonCodeExecutionEvidenceSchema.safeParse({
      evidenceType: 'python-code-execution',
      environmentId: input.runContext.environmentId,
      runtimeRef: input.config.runtimeRef,
      protocolVersion: input.config.protocolVersion,
      result: outcome.result,
      stdoutBytes: outcome.stdoutBytes,
      stderrBytes: outcome.stderrBytes,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
    });
    if (!evidence.success) {
      throw new PythonCodeExecutionRuntimeError('PYTHON_EVIDENCE_INVALID');
    }

    return {
      stepId: input.step.stepId,
      status: 'COMPLETED',
      resultEvidence: evidence.data,
    };
  }
}

function assertScope(input: PythonCodePluginExecutionInput): void {
  const expected = input.config.scope;
  const actual = input.runContext;
  if (
    expected.tenantId !== actual.tenantId ||
    expected.projectId !== actual.projectId ||
    expected.environmentId !== actual.environmentId ||
    input.executionIdentity.tenantId !== actual.tenantId ||
    input.executionIdentity.environmentId !== actual.environmentId
  ) {
    reject('PYTHON_EXECUTION_SCOPE_MISMATCH');
  }
}

async function executeRuntimeSafely(
  runtime: PythonRuntimePort,
  input: PythonCodePluginExecutionInput,
  signal: globalThis.AbortSignal | undefined
): Promise<PythonRuntimeExecutionOutcome> {
  try {
    return await runtime.execute({
      runtimeRef: input.config.runtimeRef,
      protocolVersion: input.config.protocolVersion,
      source: input.config.source,
      inputs: input.config.inputs,
      limits: input.config.limits,
      ...(signal === undefined ? {} : { signal }),
    });
  } catch (error) {
    if (signal?.aborted === true) throw signal.reason ?? error;
    if (
      error instanceof PythonCodeExecutionRejectedError ||
      error instanceof PythonCodeExecutionRuntimeError
    ) {
      throw error;
    }
    throw new PythonCodeExecutionRuntimeError('PYTHON_RUNTIME_UNAVAILABLE');
  }
}

function throwOutcome(outcome: PythonRuntimeExecutionFailure): never {
  if (outcome.classification === 'rejected') {
    throw new PythonCodeExecutionRejectedError(outcome.code, outcome.diagnostic);
  }
  throw new PythonCodeExecutionRuntimeError(outcome.code);
}

function assertOutcomeLimits(
  input: PythonCodePluginExecutionInput,
  outcome: Extract<PythonRuntimeExecutionOutcome, { ok: true }>
): void {
  if (outcome.stdoutBytes > input.config.limits.maxStdoutBytes) {
    reject('PYTHON_STDOUT_LIMIT_EXCEEDED');
  }
  if (outcome.stderrBytes > input.config.limits.maxStderrBytes) {
    reject('PYTHON_STDERR_LIMIT_EXCEEDED');
  }

  let resultBytes: number;
  try {
    resultBytes = new TextEncoder().encode(JSON.stringify(outcome.result)).byteLength;
  } catch {
    reject('PYTHON_RESULT_NOT_JSON');
  }
  if (resultBytes > input.config.limits.maxResultBytes) {
    reject('PYTHON_RESULT_LIMIT_EXCEEDED');
  }
}

function assertNotAborted(signal: globalThis.AbortSignal | undefined): void {
  if (signal?.aborted === true) {
    throw signal.reason ?? new Error('Python code execution cancelled');
  }
}

function reject(code: ConstructorParameters<typeof PythonCodeExecutionRejectedError>[0]): never {
  throw new PythonCodeExecutionRejectedError(code);
}
