/**
 * Owned concern: define transport-neutral configuration shared by registered step types.
 *
 * @baseline ADR-0003: Execution Model
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @decision Keep common timeout, concurrency, and custom fields independent of step-family artifacts.
 * @consequence Step contracts reuse one strict schema without introducing artifact-specific reference models.
 * @version 2.0.0
 */
import { z } from 'zod';

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
  })
  .strict();
