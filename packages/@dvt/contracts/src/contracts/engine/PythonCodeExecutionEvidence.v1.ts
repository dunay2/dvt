import { z } from 'zod';

import { JsonValueSchema, type JsonValue } from '../shared/JsonValue.v1.js';
import {
  PYTHON_CODE_MAX_RESULT_BYTES,
  PYTHON_CODE_MAX_STREAM_BYTES,
} from '../shared/PythonCodeLimits.v1.js';
import {
  isIsoUtcString,
  isNonBlankString,
  NON_BLANK_STRING_MESSAGE,
  STRICT_ISO_UTC_STRING_MESSAGE,
} from '../../utils/contractPrimitives.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => isNonBlankString(value), {
    message: NON_BLANK_STRING_MESSAGE,
  })
  .brand<'NonBlankString'>();

const IsoUtcStringSchema = NonBlankStringSchema.refine((value) => isIsoUtcString(value), {
  message: STRICT_ISO_UTC_STRING_MESSAGE,
}).brand<'IsoUtcString'>();

const PythonRuntimeReferenceSchema = z
  .string()
  .regex(/^python-runtime:[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u);

export interface PythonCodeExecutionEvidence {
  readonly evidenceType: 'python-code-execution';
  readonly environmentId: string;
  readonly runtimeRef: string;
  readonly protocolVersion: 'python-json-v1';
  readonly result: JsonValue;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
}

export const PythonCodeExecutionEvidenceSchema = z
  .object({
    evidenceType: z.literal('python-code-execution'),
    environmentId: NonBlankStringSchema,
    runtimeRef: PythonRuntimeReferenceSchema,
    protocolVersion: z.literal('python-json-v1'),
    result: JsonValueSchema,
    stdoutBytes: z.number().int().min(0).max(PYTHON_CODE_MAX_STREAM_BYTES),
    stderrBytes: z.number().int().min(0).max(PYTHON_CODE_MAX_STREAM_BYTES),
    startedAt: IsoUtcStringSchema,
    completedAt: IsoUtcStringSchema,
    durationMs: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((evidence, context) => {
    const encoded = new TextEncoder().encode(JSON.stringify(evidence.result));
    if (encoded.byteLength > PYTHON_CODE_MAX_RESULT_BYTES) {
      context.addIssue({
        code: 'custom',
        path: ['result'],
        message: 'result exceeds the Python JSON evidence byte limit',
      });
    }
  }) satisfies z.ZodType<PythonCodeExecutionEvidence>;
