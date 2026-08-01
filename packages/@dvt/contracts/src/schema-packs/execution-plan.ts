import { z } from 'zod';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
  type ExecutionPlan,
  type PlanCore,
} from '../contracts/planner/ExecutionPlan.v1.js';
import {
  PLAN_EXECUTION_DECISION_REASON,
  PLAN_EXECUTION_DECISION_STATUS,
} from '../contracts/planner/PlanExecutionDecision.v1.js';
import { MAX_RETRY_POLICY_ATTEMPTS } from '../contracts/planner/PlannerPolicyVocabulary.v2.js';
import {
  CURRENT_EXECUTION_PLAN_VERSION,
  SUPPORTED_EXECUTION_PLAN_VERSIONS,
} from '../contracts/planner/PlanVersion.v1.js';

import { NonBlankStringSchema } from './common.js';
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
        backoffCoefficient: z
          .number()
          .refine(Number.isFinite, { message: 'backoffCoefficient must be finite.' })
          .min(1),
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

const PlanOwnershipSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

const OrderedNodeIdsSchema = z
  .array(NonBlankStringSchema)
  .min(1)
  .superRefine((nodeIds, ctx) => {
    for (let index = 1; index < nodeIds.length; index += 1) {
      if ((nodeIds[index - 1] ?? '') >= (nodeIds[index] ?? '')) {
        ctx.addIssue({
          code: 'custom',
          path: [index],
          message: 'node ids must be unique and ordered.',
        });
      }
    }
  });

const PlanExecutionRunDecisionSchema = z
  .object({
    subjectId: NonBlankStringSchema,
    subjectKind: z.literal('node'),
    status: z.literal(PLAN_EXECUTION_DECISION_STATUS.run),
    reasonCode: z.enum([
      PLAN_EXECUTION_DECISION_REASON.selectedRoot,
      PLAN_EXECUTION_DECISION_REASON.selectedClosure,
    ]),
  })
  .strict();

const PlanExecutionSkipDecisionSchema = z
  .object({
    subjectId: NonBlankStringSchema,
    subjectKind: z.literal('node'),
    status: z.literal(PLAN_EXECUTION_DECISION_STATUS.skip),
    reasonCode: z.literal(PLAN_EXECUTION_DECISION_REASON.outsideSelectedClosure),
  })
  .strict();

const PlanExecutionPartialDecisionSchema = z
  .object({
    subjectId: z.literal('selection'),
    subjectKind: z.literal('selection'),
    status: z.literal(PLAN_EXECUTION_DECISION_STATUS.partial),
    reasonCode: z.literal(PLAN_EXECUTION_DECISION_REASON.boundedSelection),
    includedNodeIds: OrderedNodeIdsSchema,
    excludedNodeIds: OrderedNodeIdsSchema,
  })
  .strict()
  .superRefine((decision, ctx) => {
    const included = new Set(decision.includedNodeIds);
    const overlap = decision.excludedNodeIds.find((nodeId) => included.has(nodeId));
    if (overlap !== undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['excludedNodeIds'],
        message: `included and excluded scope must be disjoint; found ${overlap}.`,
      });
    }
  });

const PlanExecutionDecisionSchema = z.discriminatedUnion('status', [
  PlanExecutionRunDecisionSchema,
  PlanExecutionSkipDecisionSchema,
  PlanExecutionPartialDecisionSchema,
]);

const PlanExecutionDecisionsSchema = z
  .array(PlanExecutionDecisionSchema)
  .min(1)
  .superRefine((decisions, ctx) => {
    const partialIndexes = decisions.flatMap((decision, index) =>
      decision.status === PLAN_EXECUTION_DECISION_STATUS.partial ? [index] : []
    );
    if (partialIndexes.length > 1 || (partialIndexes.length === 1 && partialIndexes[0] !== 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'the optional PARTIAL selection decision must be the first and only one.',
      });
    }

    const nodeDecisions = decisions.filter((decision) => decision.subjectKind === 'node');
    for (let index = 1; index < nodeDecisions.length; index += 1) {
      if ((nodeDecisions[index - 1]?.subjectId ?? '') >= (nodeDecisions[index]?.subjectId ?? '')) {
        ctx.addIssue({
          code: 'custom',
          message: 'node decisions must have unique subjects in deterministic order.',
        });
        break;
      }
    }
  });

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
      ownership: PlanOwnershipSchema.optional(),
      plannerVersion: z.string().min(1).optional(),
      plannerGitSha: z.string().length(40).optional(),
    })
    .strict(),
  observability: PlannerObservabilitySchema,
  decisions: PlanExecutionDecisionsSchema.optional(),
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
