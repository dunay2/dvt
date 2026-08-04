/**
 * Owned concern: define transport-neutral configuration shared by registered step types.
 *
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Keep common timeout, concurrency, and compiled-code fields independent of DBT.
 * @consequence Step contracts can reuse one strict schema without depending on another step family.
 * @version 1.0.0
 */
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
