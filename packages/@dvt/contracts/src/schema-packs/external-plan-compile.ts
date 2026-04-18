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

export const ExternalPlanCompileScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

export const ExternalPlanCompileRequestV1Schema = z
  .object({
    context: ExternalPlanCompileScopeSchema,
    selection: PlannerSelectionSchema,
    graphSource: GenericGraphSourceV1Schema,
    policies: PlannerPolicyClassSetSchema.optional(),
    environment: PlannerEnvironmentContextSchema.optional(),
    observability: PlannerObservabilitySchema.optional(),
  })
  .strict();

export const ExternalPlanCompileResponseV1Schema = z
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

export type ExternalPlanCompileScopeSchemaT = z.infer<typeof ExternalPlanCompileScopeSchema>;
export type ExternalPlanCompileRequestV1SchemaT = z.infer<
  typeof ExternalPlanCompileRequestV1Schema
>;
export type ExternalPlanCompileResponseV1SchemaT = z.infer<
  typeof ExternalPlanCompileResponseV1Schema
>;
