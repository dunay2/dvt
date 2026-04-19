import { z } from 'zod';

import { PlannerPolicyClassSetSchema } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';

import { NonBlankStringSchema } from './common.js';
import { ExecutionPlanSchema } from './execution-plan.js';
import {
  PlannerEnvironmentContextSchema,
  PlannerObservabilitySchema,
  PlannerSelectionSchema,
} from './planner-context.js';
import { GenericGraphSourceV1Schema } from './planner-graph.js';

export const PlanCompileScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

export const PlanCompileRequestV1Schema = z
  .object({
    context: PlanCompileScopeSchema,
    selection: PlannerSelectionSchema,
    graphSource: GenericGraphSourceV1Schema,
    policies: PlannerPolicyClassSetSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: PlannerObservabilitySchema.optional(),
  })
  .strict();

export const PlanCompileResponseV1Schema = z
  .object({
    plan: ExecutionPlanSchema,
    compile: z
      .object({
        persisted: z.literal(false),
        executabilityValidated: z.literal(false),
      })
      .strict(),
  })
  .strict();

export type PlanCompileScopeSchemaT = z.infer<typeof PlanCompileScopeSchema>;
export type PlanCompileRequestV1SchemaT = z.infer<typeof PlanCompileRequestV1Schema>;
export type PlanCompileResponseV1SchemaT = z.infer<typeof PlanCompileResponseV1Schema>;
