import { z } from 'zod';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  type ExecutionPlan,
  type PlanCore,
} from '../contracts/planner/ExecutionPlan.v1.js';
import { MAX_RETRY_POLICY_ATTEMPTS } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';
import {
  CURRENT_EXECUTION_PLAN_VERSION,
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
} from '../contracts/planner/PlanVersion.v1.js';

import { PlannerObservabilitySchema } from './planner-context.js';
import { HexSha256Schema } from './shared.js';

export const PlanVersionSchema = z.enum(SUPPORTED_EXECUTION_PLAN_VERSIONS);

export const ExecutionStepV1Schema = z
  .object({
    stepId: z.string().min(1),
    kind: z.string().min(1),
    dependsOn: z.array(z.string().min(1)),
    retryPolicy: z
      .object({
        maxAttempts: z.number().int().min(1).max(MAX_RETRY_POLICY_ATTEMPTS),
        initialInterval: z.string().regex(/^[1-9]\d*s$/u),
        maximumInterval: z.string().regex(/^[1-9]\d*s$/u),
        backoffCoefficient: z.number().finite().min(1),
      })
      .strict()
      .superRefine((policy, ctx) => {
        const initialSeconds = Number.parseInt(policy.initialInterval.slice(0, -1), 10);
        const maximumSeconds = Number.parseInt(policy.maximumInterval.slice(0, -1), 10);
        if (maximumSeconds < initialSeconds) {
          ctx.addIssue({
            code: 'custom',
            path: ['maximumInterval'],
            message: 'maximumInterval must be greater than or equal to initialInterval.',
          });
        }
      })
      .optional(),
    stepTypeConfig: z.record(z.string(), z.unknown()).optional(),
    type: z.enum(['task', 'gateway']).optional(),
    gateway: z
      .object({
        dslVersion: z.literal('1.0'),
        expression: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict();

const CurrentPlanCoreSchema = z
  .object({
    metadata: z
      .object({
        planVersion: z.literal(CURRENT_EXECUTION_PLAN_VERSION),
        inputHashSha256: HexSha256Schema,
      })
      .strict(),
    steps: z.array(ExecutionStepV1Schema),
  })
  .strict();

const CurrentExecutionPlanV1Schema = CurrentPlanCoreSchema.extend({
  metadata: z
    .object({
      planVersion: z.literal(CURRENT_EXECUTION_PLAN_VERSION),
      schemaVersion: z.literal(CURRENT_EXECUTION_PLAN_SCHEMA_VERSION),
      contractVersion: z.literal(CURRENT_EXECUTION_PLAN_CONTRACT_VERSION),
      inputHashSha256: HexSha256Schema,
      planId: HexSha256Schema,
      createdAtIso: z.string().min(1),
      plannerVersion: z.string().min(1).optional(),
      plannerGitSha: z.string().length(40).optional(),
    })
    .strict(),
  observability: PlannerObservabilitySchema,
}).strict();

export const PLAN_CORE_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentPlanCoreSchema,
} as const;

export const EXECUTION_PLAN_VERSIONED_SCHEMAS = {
  [CURRENT_EXECUTION_PLAN_VERSION]: CurrentExecutionPlanV1Schema,
} as const;

export const PlanCoreSchema = CurrentPlanCoreSchema as z.ZodType<PlanCore>;
export const ExecutionPlanSchema = CurrentExecutionPlanV1Schema as z.ZodType<ExecutionPlan>;

export type ExecutionStepV1SchemaT = z.infer<typeof ExecutionStepV1Schema>;
export type PlanCoreSchemaT = z.infer<typeof PlanCoreSchema>;
export type ExecutionPlanSchemaT = z.infer<typeof ExecutionPlanSchema>;
