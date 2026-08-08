/** Owned concern: validate, persist and project Python code-node authoring metadata. */
import {
  PYTHON_CODE_MAX_INPUT_BYTES,
  PYTHON_CODE_MAX_SOURCE_BYTES,
  PythonCodeStepTypeConfigSchema,
  type JsonObject,
  type PythonCodeStepTypeConfig,
} from '@dvt/contracts/python-code';

import {
  PYTHON_CODE_NODE_KIND,
  PYTHON_PLUGIN_ID,
} from '../../plugins/python/pythonNodeTypeCatalog';
import type { CanonicalNode } from '../../types/canonical';

export type PythonCodeExecutionScope = PythonCodeStepTypeConfig['scope'];
export type PythonCodeAuthoringMetadata = Omit<PythonCodeStepTypeConfig, 'scope'>;

export type PythonCodeAuthoringDraft = Readonly<{
  source: string;
  inputsJson: string;
  runtimeRef: string;
  timeoutMs: string;
  terminationGraceMs: string;
  maxStdoutBytes: string;
  maxStderrBytes: string;
  maxResultBytes: string;
}>;

export const PYTHON_CODE_AUTHORING_ERROR = {
  source: 'python_source_invalid',
  inputsJson: 'python_inputs_json_invalid',
  runtimeRef: 'python_runtime_ref_invalid',
  timeoutMs: 'python_timeout_invalid',
  terminationGraceMs: 'python_termination_grace_invalid',
  maxStdoutBytes: 'python_stdout_limit_invalid',
  maxStderrBytes: 'python_stderr_limit_invalid',
  maxResultBytes: 'python_result_limit_invalid',
} as const;

export type PythonCodeAuthoringErrors = Partial<
  Record<keyof typeof PYTHON_CODE_AUTHORING_ERROR, string>
>;
export type PythonCodeAuthoringValidation =
  | Readonly<{ ok: true; metadata: PythonCodeAuthoringMetadata }>
  | Readonly<{ ok: false; errors: PythonCodeAuthoringErrors }>;

const DEFAULT_DRAFT: PythonCodeAuthoringDraft = {
  source: 'result = inputs',
  inputsJson: '{}',
  runtimeRef: 'python-runtime:default',
  timeoutMs: '30000',
  terminationGraceMs: '500',
  maxStdoutBytes: '4096',
  maxStderrBytes: '4096',
  maxResultBytes: '65536',
};

export function isPythonCodeNode(node: Pick<CanonicalNode, 'pluginId' | 'kind'>): boolean {
  return node.pluginId === PYTHON_PLUGIN_ID && node.kind === PYTHON_CODE_NODE_KIND;
}

export function createPythonCodeAuthoringDraft(
  node: CanonicalNode
): PythonCodeAuthoringDraft | null {
  if (!isPythonCodeNode(node)) return null;
  const metadata = recordValue(node.metadata?.pythonCode);
  const limits = recordValue(metadata.limits);
  const inputs = parseStoredInputs(metadata.inputs);

  return {
    source: stringValue(metadata.source) || DEFAULT_DRAFT.source,
    inputsJson: JSON.stringify(inputs, null, 2),
    runtimeRef: stringValue(metadata.runtimeRef) || DEFAULT_DRAFT.runtimeRef,
    timeoutMs: numberText(limits.timeoutMs) || DEFAULT_DRAFT.timeoutMs,
    terminationGraceMs:
      numberText(limits.terminationGraceMs) || DEFAULT_DRAFT.terminationGraceMs,
    maxStdoutBytes: numberText(limits.maxStdoutBytes) || DEFAULT_DRAFT.maxStdoutBytes,
    maxStderrBytes: numberText(limits.maxStderrBytes) || DEFAULT_DRAFT.maxStderrBytes,
    maxResultBytes: numberText(limits.maxResultBytes) || DEFAULT_DRAFT.maxResultBytes,
  };
}

export function validatePythonCodeAuthoringDraft(
  draft: PythonCodeAuthoringDraft
): PythonCodeAuthoringValidation {
  const parsedInputs = parseInputsJson(draft.inputsJson);
  if (!parsedInputs.ok) {
    return { ok: false, errors: { inputsJson: PYTHON_CODE_AUTHORING_ERROR.inputsJson } };
  }

  const parsed = PythonCodeStepTypeConfigSchema.safeParse({
    scope: {
      tenantId: 'authoring',
      projectId: 'authoring',
      environmentId: 'authoring',
    },
    runtimeRef: draft.runtimeRef.trim(),
    protocolVersion: 'python-json-v1',
    source: draft.source,
    inputs: parsedInputs.value,
    limits: {
      timeoutMs: Number(draft.timeoutMs),
      terminationGraceMs: Number(draft.terminationGraceMs),
      maxStdoutBytes: Number(draft.maxStdoutBytes),
      maxStderrBytes: Number(draft.maxStderrBytes),
      maxResultBytes: Number(draft.maxResultBytes),
    },
  });

  if (!parsed.success) {
    return { ok: false, errors: mapIssues(parsed.error.issues.map((issue) => issue.path)) };
  }

  const { scope: _scope, ...metadata } = parsed.data;
  return { ok: true, metadata };
}

export function applyPythonCodeAuthoringDraft(
  node: CanonicalNode,
  draft: PythonCodeAuthoringDraft
): CanonicalNode {
  const validation = validatePythonCodeAuthoringDraft(draft);
  if (!validation.ok) return node;
  return {
    ...node,
    metadata: {
      ...node.metadata,
      pythonCode: validation.metadata,
      code: validation.metadata.source,
      language: 'python',
      runtimeRef: validation.metadata.runtimeRef,
    },
  };
}

export function projectPythonCodeStepTypeConfig(args: {
  node: CanonicalNode;
  executionScope: PythonCodeExecutionScope | undefined;
}):
  | Readonly<{ ok: true; stepTypeConfig: PythonCodeStepTypeConfig }>
  | Readonly<{ ok: false; message: string }> {
  if (!isPythonCodeNode(args.node)) {
    return { ok: false, message: `Node ${args.node.id} is not a Python code node.` };
  }
  if (args.executionScope === undefined) {
    return {
      ok: false,
      message: `Python node ${args.node.name} requires an authorized execution scope.`,
    };
  }

  const metadata = recordValue(args.node.metadata?.pythonCode);
  const parsed = PythonCodeStepTypeConfigSchema.safeParse({
    ...metadata,
    scope: {
      tenantId: args.executionScope.tenantId,
      projectId: args.executionScope.projectId,
      environmentId: args.executionScope.environmentId,
    },
  });

  return parsed.success
    ? { ok: true, stepTypeConfig: parsed.data }
    : {
        ok: false,
        message:
          `Python node ${args.node.name} is not fully configured ` +
          `(invalid fields: ${[
            ...new Set(parsed.error.issues.map((issue) => issue.path.join('.') || 'config')),
          ].join(', ')}).`,
      };
}

export function seedPythonCodeNodeMetadata(): Record<string, unknown> {
  const validation = validatePythonCodeAuthoringDraft(DEFAULT_DRAFT);
  if (!validation.ok) {
    throw new Error('The canonical Python authoring seed is invalid.');
  }
  return {
    pythonCode: validation.metadata,
    code: validation.metadata.source,
    language: 'python',
    runtimeRef: validation.metadata.runtimeRef,
  };
}

function parseInputsJson(value: string):
  | Readonly<{ ok: true; value: JsonObject }>
  | Readonly<{ ok: false }> {
  if (new TextEncoder().encode(value).byteLength > PYTHON_CODE_MAX_INPUT_BYTES) {
    return { ok: false };
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? { ok: true, value: parsed as JsonObject } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function parseStoredInputs(value: unknown): JsonObject {
  return isRecord(value) ? (value as JsonObject) : {};
}

function mapIssues(paths: readonly (readonly PropertyKey[])[]): PythonCodeAuthoringErrors {
  const errors: PythonCodeAuthoringErrors = {};
  for (const [group, field] of paths) {
    if (group === 'source') errors.source = PYTHON_CODE_AUTHORING_ERROR.source;
    if (group === 'inputs') errors.inputsJson = PYTHON_CODE_AUTHORING_ERROR.inputsJson;
    if (group === 'runtimeRef') errors.runtimeRef = PYTHON_CODE_AUTHORING_ERROR.runtimeRef;
    if (group === 'limits' && field === 'timeoutMs')
      errors.timeoutMs = PYTHON_CODE_AUTHORING_ERROR.timeoutMs;
    if (group === 'limits' && field === 'terminationGraceMs')
      errors.terminationGraceMs = PYTHON_CODE_AUTHORING_ERROR.terminationGraceMs;
    if (group === 'limits' && field === 'maxStdoutBytes')
      errors.maxStdoutBytes = PYTHON_CODE_AUTHORING_ERROR.maxStdoutBytes;
    if (group === 'limits' && field === 'maxStderrBytes')
      errors.maxStderrBytes = PYTHON_CODE_AUTHORING_ERROR.maxStderrBytes;
    if (group === 'limits' && field === 'maxResultBytes')
      errors.maxResultBytes = PYTHON_CODE_AUTHORING_ERROR.maxResultBytes;
  }

  if (
    new TextEncoder().encode(String(paths)).byteLength > PYTHON_CODE_MAX_SOURCE_BYTES ||
    Object.keys(errors).length === 0
  ) {
    errors.source = PYTHON_CODE_AUTHORING_ERROR.source;
  }
  return errors;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function recordValue(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberText(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
