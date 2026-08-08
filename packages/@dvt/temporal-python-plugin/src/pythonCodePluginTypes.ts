import type {
  StepDefinition,
  StepExecutionIdentity,
  TemporalStepPluginRunner,
} from '@dvt/adapter-temporal';
import type { ResolvedRunContext } from '@dvt/contracts';
import type {
  JsonObject,
  JsonValue,
  PythonCodeStepTypeConfig,
} from '@dvt/contracts/python-code';

export type PythonRuntimeFailureCode =
  | 'PYTHON_SOURCE_INVALID'
  | 'PYTHON_RESULT_MISSING'
  | 'PYTHON_RESULT_NOT_JSON'
  | 'PYTHON_STDOUT_LIMIT_EXCEEDED'
  | 'PYTHON_STDERR_LIMIT_EXCEEDED'
  | 'PYTHON_RESULT_LIMIT_EXCEEDED'
  | 'PYTHON_EXECUTION_TIMEOUT'
  | 'PYTHON_EXECUTION_FAILED'
  | 'PYTHON_RUNTIME_PROTOCOL_INVALID'
  | 'PYTHON_RUNTIME_UNAVAILABLE';

export type PythonRuntimeFailureClassification = 'rejected' | 'runtime';
export type PythonRuntimeFailurePhase = 'compile' | 'execute' | 'serialize' | 'protocol';

export interface PythonRuntimeDiagnostic {
  readonly phase: PythonRuntimeFailurePhase;
  readonly line?: number;
  readonly column?: number;
}

export interface PythonRuntimeExecutionRequest {
  readonly runtimeRef: string;
  readonly protocolVersion: PythonCodeStepTypeConfig['protocolVersion'];
  readonly source: string;
  readonly inputs: JsonObject;
  readonly limits: PythonCodeStepTypeConfig['limits'];
  readonly signal?: globalThis.AbortSignal;
}

export interface PythonRuntimeExecutionSuccess {
  readonly ok: true;
  readonly result: JsonValue;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
}

export interface PythonRuntimeExecutionFailure {
  readonly ok: false;
  readonly classification: PythonRuntimeFailureClassification;
  readonly code: PythonRuntimeFailureCode;
  readonly diagnostic?: PythonRuntimeDiagnostic;
}

export type PythonRuntimeExecutionOutcome =
  | PythonRuntimeExecutionSuccess
  | PythonRuntimeExecutionFailure;

export interface PythonRuntimePort {
  execute(request: PythonRuntimeExecutionRequest): Promise<PythonRuntimeExecutionOutcome>;
}

export interface PythonCodePluginExecutionInput {
  readonly step: StepDefinition;
  readonly config: PythonCodeStepTypeConfig;
  readonly executionIdentity: StepExecutionIdentity;
  readonly runContext: ResolvedRunContext;
}

export type PythonCodePluginRunnerPort =
  TemporalStepPluginRunner<PythonCodePluginExecutionInput>;
