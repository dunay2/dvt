import { z } from 'zod';

import type { PlanCore } from '../contracts/planner/ExecutionPlan.v1.js';
import { PlannerPolicyClassSetSchema } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';
import { jcsCanonicalize } from '../utils/jcsCanonicalize.js';
import { sha256HexUtf8 } from '../utils/sha256HexUtf8.js';

import { NonBlankStringSchema, RunExecutionPolicySchema } from './common.js';
import { ExecutionPlanSchema, PlanCoreSchema } from './execution-plan.js';
import {
  PlannerEnvironmentContextSchema,
  PlannerObservabilitySchema,
  PlannerSelectionSchema,
} from './planner-context.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

export const PlannerInputEnvelopeV1Schema = z
  .object({
    graphSource: GenericGraphSourceV1Schema,
    selection: PlannerSelectionSchema,
    policies: PlannerPolicyClassSetSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: PlannerObservabilitySchema,
    requestedBy: z.string().min(1).optional(),
    requestId: z.string().min(1).optional(),
    requestedAtIso: z.string().min(1).optional(),
  })
  .strict();

export const PlannerBuildResultV1Schema = z
  .object({
    plan: ExecutionPlanSchema,
    executionPolicy: RunExecutionPolicySchema,
    canonicalPlanCoreJson: NonBlankStringSchema,
  })
  .strict()
  .superRefine((result, ctx) => {
    let canonicalPlanCoreInput: unknown;

    try {
      canonicalPlanCoreInput = JSON.parse(result.canonicalPlanCoreJson);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message: 'canonicalPlanCoreJson must contain valid JSON',
      });
      return;
    }

    const canonicalPlanCoreResult = PlanCoreSchema.safeParse(canonicalPlanCoreInput);
    if (!canonicalPlanCoreResult.success) {
      for (const issue of canonicalPlanCoreResult.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: ['canonicalPlanCoreJson', ...issue.path],
          message: issue.message,
        });
      }
      return;
    }

    const expectedPlanCore = {
      metadata: {
        planVersion: result.plan.metadata.planVersion,
        inputHashSha256: result.plan.metadata.inputHashSha256,
      },
      steps: result.plan.steps,
    } satisfies PlanCore;
    const expectedCanonicalPlanCoreJson = jcsCanonicalize(expectedPlanCore);

    if (result.canonicalPlanCoreJson !== expectedCanonicalPlanCoreJson) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanCoreJson'],
        message:
          'canonicalPlanCoreJson must equal JCS(planCore) derived from plan.metadata.{planVersion,inputHashSha256} and plan.steps',
      });
      return;
    }

    if (sha256HexUtf8(result.canonicalPlanCoreJson) !== result.plan.metadata.planId.toLowerCase()) {
      ctx.addIssue({
        code: 'custom',
        path: ['plan', 'metadata', 'planId'],
        message: 'plan.metadata.planId must match sha256(canonicalPlanCoreJson)',
      });
    }
  });

export type PlannerInputEnvelopeV1SchemaT = z.infer<typeof PlannerInputEnvelopeV1Schema>;
export type PlannerBuildResultV1SchemaT = z.infer<typeof PlannerBuildResultV1Schema>;
