/**
 * Owned concern: define one bounded stateless Python code-execution step.
 *
 * @baseline ADR-0003: Execution Model Sovereignty
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @baseline ADR-0064: Governed Code-Runtime Provider Boundary
 * @decision A plan carries explicit bounded JSON input and an opaque runtime ref;
 *           execution starts from fresh provider state and returns bounded JSON.
 * @version 1.0.0
 */
import { z } from 'zod';

import { JsonObjectSchema, type JsonValue } from '../shared/JsonValue.v1.js';
import type { PlanOwnership } from './ExecutionPlan.v1.js';

export const EXECUTE_PYTHON_CODE_STEP_KIND = 'EXECUTE_PYTHON_CODE' as const;
export const EXECUTE_PYTHON_CODE_REQUIRED_CAPABILITY = 'executor.python-code' as const;
export const PYTHON_CODE_PROTOCOL_VERSION = 'python-json-v1' as const;

export const PYTHON_CODE_MAX_SOURCE_BYTES = 65_536 as const;
export const PYTHON_CODE_MAX_INPUT_BYTES = 65_536 as const;
export const PYTHON_CODE_MAX_STREAM_BYTES = 65_536 as const;
export const PYTHON_CODE_MAX_RESULT_BYTES = 65_536 as const;
export const PYTHON_CODE_MAX_TIMEOUT_MS = 300_000 as const;

export type PythonJsonValue = JsonValue;

const ScopeIdentifierSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);
const PythonRuntimeReferenceSchema = z
  .string()
  .regex(/^python-runtime:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);

const ScopeSchema = z
  .object({
    tenantId: ScopeIdentifierSchema,
    projectId: ScopeIdentifierSchema,
    environmentId: ScopeIdentifierSchema,
  })
  .strict();

const PythonExecutionLimitsSchema = z
  .object({
    timeoutMs: z.number().int().min(100).max(PYTHON_CODE_MAX_TIMEOUT_MS),
    terminationGraceMs: z.number().int().min(10).max(5_000),
    maxStdoutBytes: z.number().int().min(0).max(PYTHON_CODE_MAX_STREAM_BYTES),
    maxStderrBytes: z.number().int().min(0).max(PYTHON_CODE_MAX_STREAM_BYTES),
    maxResultBytes: z.number().int().min(1).max(PYTHON_CODE_MAX_RESULT_BYTES),
  })
  .strict();

export const PythonCodeStepTypeConfigSchema = z
  .object({
    scope: ScopeSchema,
    runtimeRef: PythonRuntimeReferenceSchema,
    protocolVersion: z.literal(PYTHON_CODE_PROTOCOL_VERSION),
    source: z.string().min(1),
    inputs: JsonObjectSchema,
    limits: PythonExecutionLimitsSchema,
  })
  .strict()
  .superRefine((config, context) => {
    addEncodedSizeIssue(
      config.source,
      PYTHON_CODE_MAX_SOURCE_BYTES,
      ['source'],
      'source exceeds the Python code byte limit',
      context
    );
    addEncodedSizeIssue(
      JSON.stringify(config.inputs),
      PYTHON_CODE_MAX_INPUT_BYTES,
      ['inputs'],
      'inputs exceed the Python JSON byte limit',
      context
    );
    if (config.limits.terminationGraceMs >= config.limits.timeoutMs) {
      context.addIssue({
        code: 'custom',
        path: ['limits', 'terminationGraceMs'],
        message: 'limits.terminationGraceMs must be less than limits.timeoutMs',
      });
    }
  });

export type PythonCodeStepTypeConfig = z.infer<typeof PythonCodeStepTypeConfigSchema>;

export function validatePythonCodePlanOwnership(
  config: unknown,
  planOwnership: PlanOwnership | undefined
): string | undefined {
  const parsed = PythonCodeStepTypeConfigSchema.safeParse(config);
  if (!parsed.success) {
    return `${EXECUTE_PYTHON_CODE_STEP_KIND} config must satisfy its canonical schema`;
  }
  if (planOwnership === undefined) {
    return `${EXECUTE_PYTHON_CODE_STEP_KIND} requires plan ownership`;
  }

  for (const key of ['tenantId', 'projectId', 'environmentId'] as const) {
    if (parsed.data.scope[key] !== planOwnership[key]) {
      return `${EXECUTE_PYTHON_CODE_STEP_KIND} scope.${key} must match plan ownership`;
    }
  }
  return undefined;
}

function addEncodedSizeIssue(
  value: string,
  maxBytes: number,
  path: PropertyKey[],
  message: string,
  context: z.RefinementCtx
): void {
  if (new TextEncoder().encode(value).byteLength <= maxBytes) return;
  context.addIssue({ code: 'custom', path, message });
}
