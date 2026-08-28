/**
 * Owned concern: define runtime validation schemas for the canonical
 * start-run boundary contract.
 *
 * The schema pack must derive its public truth from `StartRunBoundary.v1.ts`
 * rather than re-declare ad hoc contract literals.
 */
import { z } from 'zod';

import {
  START_RUN_BACKPRESSURE_CODE,
  START_RUN_DUPLICATE_OF,
  START_RUN_RATE_LIMIT_CODE,
  START_RUN_RESULT_KIND,
  START_RUN_SYSTEM_BACKPRESSURE_CODES,
  SUPPORTED_START_RUN_TARGET_ADAPTERS,
} from '../contracts/engine/StartRunBoundary.v1.js';
import { ExecutionSelectionSchema } from '../contracts/planner/ExecutionSelection.v1.js';
import { EXECUTABILITY_REJECTION_CODES } from '../contracts/planner/PlanExecutabilityValidation.v1.js';
import { PlannerPolicyClassSetSchema } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';

import { NonBlankStringSchema, PlanRefSchema, RunExecutionContextRefSchema } from './common.js';
import { PlannerObservabilitySchema } from './planner-context.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

export const StartRunTargetAdapterSchema = z.enum(SUPPORTED_START_RUN_TARGET_ADAPTERS);

export const StartRunPlanRefSchema = PlanRefSchema;

function addStartRunCommandIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({
    code: 'custom',
    path,
    message,
  });
}

export const StartRunCommandSchema = z
  .object({
    planRef: StartRunPlanRefSchema.optional(),
    runExecutionContextRef: RunExecutionContextRefSchema.optional(),
    graphSource: GenericGraphSourceV1Schema.optional(),
    policies: PlannerPolicyClassSetSchema.optional(),
    observability: PlannerObservabilitySchema,
    runId: NonBlankStringSchema,
    targetAdapter: StartRunTargetAdapterSchema,
    selection: ExecutionSelectionSchema,
  })
  .strict()
  .superRefine((command, ctx) => {
    const hasPlanRef = command.planRef !== undefined;
    const hasGraphSource = command.graphSource !== undefined;

    if (hasPlanRef) {
      if (hasGraphSource) {
        addStartRunCommandIssue(
          ctx,
          ['graphSource'],
          'planRef startRun commands cannot include graphSource.'
        );
      }
      if (command.policies !== undefined) {
        addStartRunCommandIssue(
          ctx,
          ['policies'],
          'planRef startRun commands cannot include planner policies.'
        );
      }
      if (command.observability !== undefined) {
        addStartRunCommandIssue(
          ctx,
          ['observability'],
          'planRef startRun commands cannot include planner observability.'
        );
      }
      return;
    }

    if (!hasGraphSource) {
      addStartRunCommandIssue(
        ctx,
        ['graphSource'],
        'startRun commands require either planRef or graphSource.'
      );
    }
  });

const StartRunAcceptedResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.accepted),
    runId: NonBlankStringSchema,
    accepted: z.literal(true),
  })
  .strict();

const StartRunDuplicateResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.duplicate),
    runId: NonBlankStringSchema,
    accepted: z.literal(true),
    duplicateOf: z.enum([START_RUN_DUPLICATE_OF.run, START_RUN_DUPLICATE_OF.intent]),
  })
  .strict();

const StartRunTenantBackpressureResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.tenantBackpressure),
    accepted: z.literal(false),
    code: z.literal(START_RUN_BACKPRESSURE_CODE.tenant),
    retryAfterSeconds: z.number().int().positive(),
  })
  .strict();

const StartRunSystemBackpressureResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.systemBackpressure),
    accepted: z.literal(false),
    code: z.enum(START_RUN_SYSTEM_BACKPRESSURE_CODES),
    retryAfterSeconds: z.number().int().positive(),
  })
  .strict();

const StartRunRateLimitedResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.rateLimited),
    accepted: z.literal(false),
    code: z.literal(START_RUN_RATE_LIMIT_CODE.outboxExceeded),
    retryAfterSeconds: z.number().int().positive().optional(),
  })
  .strict();

const StartRunPlanRejectedResultSchema = z
  .object({
    kind: z.literal(START_RUN_RESULT_KIND.planRejected),
    accepted: z.literal(false),
    code: z.enum(EXECUTABILITY_REJECTION_CODES),
    reason: NonBlankStringSchema,
    cause: NonBlankStringSchema.optional(),
    supportedVersions: z.array(NonBlankStringSchema).optional(),
  })
  .strict();

export const StartRunResultSchema = z.discriminatedUnion('kind', [
  StartRunAcceptedResultSchema,
  StartRunDuplicateResultSchema,
  StartRunTenantBackpressureResultSchema,
  StartRunSystemBackpressureResultSchema,
  StartRunRateLimitedResultSchema,
  StartRunPlanRejectedResultSchema,
]);

export type StartRunTargetAdapterSchemaT = z.infer<typeof StartRunTargetAdapterSchema>;
export type StartRunPlanRefSchemaT = z.infer<typeof StartRunPlanRefSchema>;
export type StartRunCommandSchemaT = z.infer<typeof StartRunCommandSchema>;
export type StartRunResultSchemaT = z.infer<typeof StartRunResultSchema>;
