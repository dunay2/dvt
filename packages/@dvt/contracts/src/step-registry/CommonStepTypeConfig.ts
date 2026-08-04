import { z } from 'zod';

const HexSha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const CompiledCodeRefSchema = z
  .object({
    sha256: HexSha256Schema,
    storageUri: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    encoding: z.literal('utf-8').optional(),
  })
  .strict();

export const CommonStepTypeConfigSchema = z
  .object({
    stepTimeoutMs: z.number().positive().optional(),
    concurrency: z
      .object({
        maxInFlight: z.number().int().positive(),
      })
      .strict()
      .optional(),
    custom: z.record(z.string(), z.unknown()).optional(),
    compiledCodeRef: CompiledCodeRefSchema.optional(),
  })
  .strict();
