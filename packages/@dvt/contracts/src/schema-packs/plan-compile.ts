/**
 * @file packages/@dvt/contracts/src/schema-packs/plan-compile.ts
 * @baseline ADR-0005: Contract Formalization Tooling
 * @baseline ADR-0035: Planner Public Contract Evolution Protocol
 * @baseline ADR-0046: Execution Plan Definition And Run Execution Policy Separation
 * @decision Publish plan-compile request and response schemas as a bounded planner contract pack
 * @consequence Planner callers receive validated execution plans without coupling compile output to runtime policy persistence
 * @version 1.0.0
 */
import { z } from 'zod';

import { PlannerPolicyClassSetSchema } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';

import { NonBlankStringSchema } from './common.js';
import { ExecutionPlanSchema } from './execution-plan.js';
import { PlannerObservabilitySchema, PlannerSelectionSchema } from './planner-context.js';
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
