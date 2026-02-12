/**
 * ExecutionPlan Schema (Zod)
 *
 * Source of truth for workflow execution plans.
 * Automatically generates TypeScript types and can generate JSON Schema.
 *
 * @see IWorkflowEngine.v1.1.md § 3 - Execution Plan Minimal Contract
 */

import { z } from 'zod';

/**
 * Execution Plan Metadata
 */
export const ExecutionPlanMetadataSchema = z
  .object({
    /** Unique plan identifier */
    planId: z.string().min(1, 'planId cannot be empty'),

    /** Plan version (semver format) */
    planVersion: z
      .string()
      .regex(/^v?\d+\.\d+(\.\d+)?$/, 'planVersion must follow semver: v1.0 or 1.0.0'),

    /** Required capabilities (optional) */
    requiresCapabilities: z.array(z.string()).optional(),

    /** Fallback behavior when capabilities missing */
    fallbackBehavior: z.enum(['reject', 'emulate', 'degrade']).optional(),

    /** Target adapter (resolved before startRun) */
    targetAdapter: z.enum(['temporal', 'conductor']).optional(),
  })
  .strict();

/**
 * Execution Plan Step (minimal structure)
 */
export const ExecutionPlanStepSchema = z.object({
  /** Step identifier */
  stepId: z.string().min(1, 'stepId cannot be empty'),
});

/**
 * ExecutionPlan Schema (complete)
 */
export const ExecutionPlanSchema = z
  .object({
    /** Plan metadata */
    metadata: ExecutionPlanMetadataSchema,

    /** Execution steps (at least one required) */
    steps: z.array(ExecutionPlanStepSchema).min(1, 'ExecutionPlan must have at least one step'),
  })
  .strict();

/**
 * Inferred TypeScript type
 */
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ExecutionPlanMetadata = z.infer<typeof ExecutionPlanMetadataSchema>;
export type ExecutionPlanStep = z.infer<typeof ExecutionPlanStepSchema>;

/**
 * Safe validation with error details
 */
export function parseExecutionPlan(data: unknown): ExecutionPlan {
  try {
    return ExecutionPlanSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`ExecutionPlan validation failed:\n  - ${messages.join('\n  - ')}`);
    }
    throw error;
  }
}

/**
 * Safe validation without throwing
 */
export function safeParseExecutionPlan(
  data: unknown
): ReturnType<typeof ExecutionPlanSchema.safeParse> {
  return ExecutionPlanSchema.safeParse(data);
}
