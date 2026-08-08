import type {
  JsonValue,
  PythonRuntimeExecutionOutcome,
  PythonRuntimeFailureCode,
  PythonRuntimeFailurePhase,
} from '@dvt/temporal-python-plugin';
import { JsonValueSchema } from '@dvt/contracts/python-code';

export const PYTHON_CODE_PROCESS_WRAPPER = String.raw`
import contextlib
import json
import sys

_protocol_out = sys.__stdout__
_json_load = json.load
_json_dumps = json.dumps

class _DvtStreamLimit(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code

class _DvtBoundedText:
    encoding = "utf-8"

    def __init__(self, max_bytes, code):
        self.max_bytes = max_bytes
        self.code = code
        self.bytes_written = 0

    def write(self, value):
        if not isinstance(value, str):
            value = str(value)
        encoded_size = len(value.encode("utf-8"))
        if self.bytes_written + encoded_size > self.max_bytes:
            raise _DvtStreamLimit(self.code)
        self.bytes_written += encoded_size
        return len(value)

    def flush(self):
        return None

    def isatty(self):
        return False

def _emit(value):
    _protocol_out.write(_json_dumps(value, ensure_ascii=False, separators=(",", ":")))
    _protocol_out.flush()

def _failure(code, phase, line=None, column=None, classification="rejected"):
    diagnostic = {"phase": phase}
    if isinstance(line, int) and line > 0:
        diagnostic["line"] = line
    if isinstance(column, int) and column > 0:
        diagnostic["column"] = column
    _emit({
        "ok": False,
        "classification": classification,
        "code": code,
        "diagnostic": diagnostic,
    })

try:
    request = _json_load(sys.stdin)
    source = request["source"]
    inputs = request["inputs"]
    limits = request["limits"]
    try:
        compiled = compile(source, "<dvt-python-node>", "exec")
    except SyntaxError as error:
        _failure("PYTHON_SOURCE_INVALID", "compile", error.lineno, error.offset)
        raise SystemExit(0)

    stdout = _DvtBoundedText(limits["maxStdoutBytes"], "PYTHON_STDOUT_LIMIT_EXCEEDED")
    stderr = _DvtBoundedText(limits["maxStderrBytes"], "PYTHON_STDERR_LIMIT_EXCEEDED")
    namespace = {
        "__name__": "__dvt_python_node__",
        "__builtins__": __builtins__,
        "inputs": inputs,
    }
    try:
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            exec(compiled, namespace, namespace)
    except _DvtStreamLimit as error:
        _failure(error.code, "execute")
        raise SystemExit(0)
    except BaseException:
        _failure("PYTHON_EXECUTION_FAILED", "execute")
        raise SystemExit(0)

    if "result" not in namespace:
        _failure("PYTHON_RESULT_MISSING", "serialize")
        raise SystemExit(0)

    try:
        encoded_result = _json_dumps(
            namespace["result"], ensure_ascii=False, separators=(",", ":")
        )
    except BaseException:
        _failure("PYTHON_RESULT_NOT_JSON", "serialize")
        raise SystemExit(0)

    if len(encoded_result.encode("utf-8")) > limits["maxResultBytes"]:
        _failure("PYTHON_RESULT_LIMIT_EXCEEDED", "serialize")
        raise SystemExit(0)

    _emit({
        "ok": True,
        "result": namespace["result"],
        "stdoutBytes": stdout.bytes_written,
        "stderrBytes": stderr.bytes_written,
    })
except SystemExit:
    raise
except BaseException:
    _failure("PYTHON_RUNTIME_PROTOCOL_INVALID", "protocol", classification="runtime")
`;

const FAILURE_CODES: ReadonlySet<PythonRuntimeFailureCode> = new Set([
  'PYTHON_SOURCE_INVALID',
  'PYTHON_RESULT_MISSING',
  'PYTHON_RESULT_NOT_JSON',
  'PYTHON_STDOUT_LIMIT_EXCEEDED',
  'PYTHON_STDERR_LIMIT_EXCEEDED',
  'PYTHON_RESULT_LIMIT_EXCEEDED',
  'PYTHON_EXECUTION_TIMEOUT',
  'PYTHON_EXECUTION_FAILED',
  'PYTHON_RUNTIME_PROTOCOL_INVALID',
  'PYTHON_RUNTIME_UNAVAILABLE',
]);
const FAILURE_PHASES: ReadonlySet<PythonRuntimeFailurePhase> = new Set([
  'compile',
  'execute',
  'serialize',
  'protocol',
]);

export function parsePythonProcessEnvelope(value: string): PythonRuntimeExecutionOutcome | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || typeof parsed.ok !== 'boolean') return undefined;

  if (parsed.ok) {
    const result = JsonValueSchema.safeParse(parsed.result);
    if (
      !result.success ||
      !isNonNegativeInteger(parsed.stdoutBytes) ||
      !isNonNegativeInteger(parsed.stderrBytes)
    ) {
      return undefined;
    }
    return {
      ok: true,
      result: result.data as JsonValue,
      stdoutBytes: parsed.stdoutBytes,
      stderrBytes: parsed.stderrBytes,
    };
  }

  if (
    (parsed.classification !== 'rejected' && parsed.classification !== 'runtime') ||
    typeof parsed.code !== 'string' ||
    !FAILURE_CODES.has(parsed.code as PythonRuntimeFailureCode)
  ) {
    return undefined;
  }
  const diagnostic = parseDiagnostic(parsed.diagnostic);
  if (diagnostic === undefined) return undefined;
  return {
    ok: false,
    classification: parsed.classification,
    code: parsed.code as PythonRuntimeFailureCode,
    diagnostic,
  };
}

function parseDiagnostic(value: unknown):
  | { phase: PythonRuntimeFailurePhase; line?: number; column?: number }
  | undefined {
  if (!isRecord(value) || typeof value.phase !== 'string') return undefined;
  if (!FAILURE_PHASES.has(value.phase as PythonRuntimeFailurePhase)) return undefined;
  if (value.line !== undefined && !isPositiveInteger(value.line)) return undefined;
  if (value.column !== undefined && !isPositiveInteger(value.column)) return undefined;
  return {
    phase: value.phase as PythonRuntimeFailurePhase,
    ...(value.line === undefined ? {} : { line: value.line }),
    ...(value.column === undefined ? {} : { column: value.column }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}
