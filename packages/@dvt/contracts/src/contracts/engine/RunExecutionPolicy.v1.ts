import { z } from 'zod';

import type { RunExecutionPolicy } from '../../types/contracts.js';

export type { RunExecutionPolicy } from '../../types/contracts.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'String must contain at least one non-whitespace character',
  });

export const RunExecutionPolicySchema: z.ZodType<RunExecutionPolicy> = z
  .object({
    pluginCompatibilityFingerprint: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
    requiresCapabilities: z.array(NonBlankStringSchema).optional(),
  })
  .strict();
