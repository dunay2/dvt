import { describe, expect, it } from 'vitest';

import { createDefaultStepTypeRegistry } from '../src/index.js';
import {
  EXECUTE_PYTHON_CODE_REQUIRED_CAPABILITY,
  EXECUTE_PYTHON_CODE_STEP_KIND,
  PYTHON_CODE_MAX_INPUT_BYTES,
  PYTHON_CODE_MAX_RESULT_BYTES,
  PYTHON_CODE_MAX_SOURCE_BYTES,
  PYTHON_CODE_MAX_STREAM_BYTES,
  PYTHON_CODE_PROTOCOL_VERSION,
  PythonCodeExecutionEvidenceSchema,
  PythonCodeStepTypeConfigSchema,
} from '../src/python-code.js';

const SCOPE = {
  tenantId: 'tenant-a',
  projectId: 'project-a',
  environmentId: 'dev',
} as const;

function config(): Record<string, unknown> {
  return {
    scope: SCOPE,
    runtimeRef: 'python-runtime:cpython-3-13',
    protocolVersion: PYTHON_CODE_PROTOCOL_VERSION,
    source: 'result = {"total": inputs["left"] + inputs["right"]}',
    inputs: { left: 2, right: 3 },
    limits: {
      timeoutMs: 10_000,
      terminationGraceMs: 500,
      maxStdoutBytes: 4_096,
      maxStderrBytes: 4_096,
      maxResultBytes: 8_192,
    },
  };
}

describe('PythonCodeStepTypeConfigSchema', () => {
  it('accepts one bounded stateless Python request', () => {
    expect(PythonCodeStepTypeConfigSchema.safeParse(config()).success).toBe(true);
  });

  it.each([
    ['raw executable path', { ...config(), runtimeRef: '/usr/bin/python3' }],
    ['wrong runtime namespace', { ...config(), runtimeRef: 'kernel:python3' }],
    ['wrong protocol', { ...config(), protocolVersion: 'python-pickle-v1' }],
    ['blank source', { ...config(), source: '' }],
    ['source above limit', { ...config(), source: 'x'.repeat(PYTHON_CODE_MAX_SOURCE_BYTES + 1) }],
    [
      'input above limit',
      { ...config(), inputs: { payload: 'x'.repeat(PYTHON_CODE_MAX_INPUT_BYTES + 1) } },
    ],
    ['non-JSON input', { ...config(), inputs: { missing: undefined } }],
    [
      'timeout above limit',
      {
        ...config(),
        limits: {
          ...(config().limits as Record<string, unknown>),
          timeoutMs: 300_001,
        },
      },
    ],
    [
      'termination grace not below timeout',
      {
        ...config(),
        limits: {
          ...(config().limits as Record<string, unknown>),
          timeoutMs: 500,
          terminationGraceMs: 500,
        },
      },
    ],
    [
      'stdout above global limit',
      {
        ...config(),
        limits: {
          ...(config().limits as Record<string, unknown>),
          maxStdoutBytes: PYTHON_CODE_MAX_STREAM_BYTES + 1,
        },
      },
    ],
    [
      'result above global limit',
      {
        ...config(),
        limits: {
          ...(config().limits as Record<string, unknown>),
          maxResultBytes: PYTHON_CODE_MAX_RESULT_BYTES + 1,
        },
      },
    ],
    ['unknown field', { ...config(), install: ['pandas'] }],
  ])('rejects %s', (_label, value) => {
    expect(PythonCodeStepTypeConfigSchema.safeParse(value).success).toBe(false);
  });
});

describe('EXECUTE_PYTHON_CODE registry profile', () => {
  const registry = createDefaultStepTypeRegistry();

  it('registers one canonical Temporal capability', () => {
    expect(registry.isKnown(EXECUTE_PYTHON_CODE_STEP_KIND)).toBe(true);
    expect(registry.getExecutionProfile?.(EXECUTE_PYTHON_CODE_STEP_KIND)).toEqual({
      supportedAdapters: ['temporal'],
      requiredCapabilities: [EXECUTE_PYTHON_CODE_REQUIRED_CAPABILITY],
    });
  });

  it('requires exact plan ownership', () => {
    expect(
      registry.validate(EXECUTE_PYTHON_CODE_STEP_KIND, config(), {
        planOwnership: SCOPE,
      }).success
    ).toBe(true);
    expect(registry.validate(EXECUTE_PYTHON_CODE_STEP_KIND, config()).success).toBe(false);
    expect(
      registry.validate(EXECUTE_PYTHON_CODE_STEP_KIND, config(), {
        planOwnership: { ...SCOPE, environmentId: 'prod' },
      }).success
    ).toBe(false);
  });
});

describe('PythonCodeExecutionEvidenceSchema', () => {
  const receipt = {
    evidenceType: 'python-code-execution',
    environmentId: SCOPE.environmentId,
    runtimeRef: 'python-runtime:cpython-3-13',
    protocolVersion: PYTHON_CODE_PROTOCOL_VERSION,
    result: { total: 5 },
    stdoutBytes: 0,
    stderrBytes: 0,
    startedAt: '2026-08-08T00:00:00.000Z',
    completedAt: '2026-08-08T00:00:00.050Z',
    durationMs: 50,
  } as const;

  it('accepts bounded JSON evidence without raw streams', () => {
    expect(PythonCodeExecutionEvidenceSchema.safeParse(receipt).success).toBe(true);
  });

  it.each([
    ['source', { ...receipt, source: 'result = secret' }],
    ['inputs', { ...receipt, inputs: { secret: true } }],
    ['stdout', { ...receipt, stdout: 'secret' }],
    ['stderr', { ...receipt, stderr: 'secret' }],
    [
      'oversized stdout count',
      { ...receipt, stdoutBytes: PYTHON_CODE_MAX_STREAM_BYTES + 1 },
    ],
    [
      'oversized result',
      { ...receipt, result: 'x'.repeat(PYTHON_CODE_MAX_RESULT_BYTES + 1) },
    ],
  ])('rejects %s in canonical evidence', (_label, value) => {
    expect(PythonCodeExecutionEvidenceSchema.safeParse(value).success).toBe(false);
  });
});
