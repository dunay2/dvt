import type {
  PythonRuntimeDiagnostic,
  PythonRuntimeFailureCode,
} from './pythonCodePluginTypes.js';

export type PythonCodeRejectionCode =
  | PythonRuntimeFailureCode
  | 'PYTHON_EXECUTION_SCOPE_MISMATCH'
  | 'PYTHON_RUNTIME_BINDING_MISMATCH'
  | 'PYTHON_EVIDENCE_LIMIT_EXCEEDED';

export class PythonCodeExecutionRejectedError extends Error {
  public constructor(
    readonly code: PythonCodeRejectionCode,
    readonly diagnostic?: PythonRuntimeDiagnostic
  ) {
    super(code);
    this.name = 'PythonCodeExecutionRejectedError';
  }
}

export class PythonCodeExecutionRuntimeError extends Error {
  public constructor(readonly code: PythonRuntimeFailureCode | 'PYTHON_EVIDENCE_INVALID') {
    super(code);
    this.name = 'PythonCodeExecutionRuntimeError';
  }
}
