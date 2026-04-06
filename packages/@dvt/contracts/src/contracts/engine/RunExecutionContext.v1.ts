import { z } from 'zod';

import type { RunExecutionContext, RunExecutionContextRef } from '../../types/contracts.js';

const NonBlankStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, {
    message: 'String must contain at least one non-whitespace character',
  });

const ProviderSchema = z.enum(['temporal', 'conductor', 'mock']);

export const RunExecutionContextRefSchema: z.ZodType<RunExecutionContextRef> = z
  .object({
    uri: NonBlankStringSchema,
    sha256: NonBlankStringSchema,
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    pluginCompatibilityFingerprint: NonBlankStringSchema.optional(),
  })
  .strict();

export const RunExecutionContextSchema: z.ZodType<RunExecutionContext> = z
  .object({
    schemaVersion: NonBlankStringSchema,
    planId: NonBlankStringSchema,
    planVersion: NonBlankStringSchema,
    planSha256: NonBlankStringSchema,
    pluginCompatibilityFingerprint: NonBlankStringSchema.optional(),
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    targetAdapter: ProviderSchema,
    createdAtIso: NonBlankStringSchema,
    createdBy: NonBlankStringSchema,
    pluginContexts: z.record(
      z.string().min(1),
      z
        .record(z.string().min(1), NonBlankStringSchema)
        .refine(
          (ctx) => Object.keys(ctx).length > 0,
          'Plugin context must include at least one key'
        )
    ),
  })
  .strict();
