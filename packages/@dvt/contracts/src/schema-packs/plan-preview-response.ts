import { z } from 'zod';

import {
  EXECUTABILITY_REJECTION_CODES,
  type ExecutabilityValidationResult,
} from '../contracts/planner/PlanExecutabilityValidation.v1.js';
import {
  PLAN_PREVIEW_PROVENANCE_KIND,
  PlanPreviewProvenanceSchema,
} from '../contracts/planner/PlanPreviewProvenance.v1.js';
import { summarizeTransformationSqlFirstPlan } from '../contracts/planner/TransformationFlowCompiler.v1.js';
import {
  PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
  PLAN_PREVIEW_REJECTED_OUTCOME_KIND,
  PREVIEW_PROFILE,
} from '../contracts/planner/TransformationFlowPreview.v1.js';

import {
  NonBlankStringSchema,
  PlanRefSchema,
  Sha256HexStringSchema,
  TransformationExecutorSchema,
} from './common.js';
import { ExecutionPlanSchema } from './execution-plan.js';
import { PlanExecutabilityFindingSchema } from './plan-admission-finding.js';
import { PreviewProfileSchema } from './plan-preview-profile.js';

function addPlanPreviewResponseIssue(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  message: string
): void {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path,
    message,
  });
}

function haveMatchingValues(
  actualValues: readonly string[],
  expectedValues: readonly string[]
): boolean {
  if (actualValues.length !== expectedValues.length) {
    return false;
  }

  return actualValues.every((value, index) => value === expectedValues[index]);
}

export const PlanPreviewSummarySchema = z
  .object({
    executor: TransformationExecutorSchema,
    nodeCount: z.number().int().nonnegative(),
    stepCount: z.number().int().nonnegative(),
    sourceTables: z.array(NonBlankStringSchema),
    sinkTables: z.array(NonBlankStringSchema),
  })
  .strict();

export const PlanPreviewPersistedRecordSchema = z
  .object({
    planRecordId: NonBlankStringSchema,
    canonicalPlanSha256: Sha256HexStringSchema,
  })
  .strict();

export const PlanPreviewValidationSchema = z
  .object({
    valid: z.literal(true),
    warnings: z.array(z.string()),
  })
  .strict();

const PlanPreviewIdentityPayloadSchema = z.object({
  previewProfile: PreviewProfileSchema,
  plan: ExecutionPlanSchema,
  planRef: PlanRefSchema,
  planSummary: PlanPreviewSummarySchema.optional(),
  persisted: PlanPreviewPersistedRecordSchema,
  provenance: PlanPreviewProvenanceSchema.optional(),
});

function validatePlanPreviewIdentity(
  response: z.infer<typeof PlanPreviewIdentityPayloadSchema>,
  ctx: z.RefinementCtx
): void {
  if (response.previewProfile !== PREVIEW_PROFILE.transformationSqlFirstV2) {
    return;
  }

  if (response.provenance === undefined) {
    addPlanPreviewResponseIssue(
      ctx,
      ['provenance'],
      'transformation-sql-first-v2 responses require graphArtifact and sqlArtifact provenance.'
    );
  } else if (response.provenance.kind !== PLAN_PREVIEW_PROVENANCE_KIND.transformationGitArtifacts) {
    addPlanPreviewResponseIssue(
      ctx,
      ['provenance', 'kind'],
      'transformation-sql-first-v2 responses require transformation Git artifact provenance.'
    );
  }

  if (response.planSummary === undefined) {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary'],
      'transformation-sql-first-v2 responses require planSummary.'
    );
    return;
  }

  if (response.planSummary.executor !== 'postgres') {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary', 'executor'],
      'transformation-sql-first-v2 responses require executor postgres.'
    );
  }

  let expectedSummary: ReturnType<typeof summarizeTransformationSqlFirstPlan> | undefined;
  try {
    expectedSummary = summarizeTransformationSqlFirstPlan(response.plan);
  } catch (error: unknown) {
    addPlanPreviewResponseIssue(
      ctx,
      ['plan'],
      error instanceof Error
        ? error.message
        : 'transformation-sql-first-v2 responses require the canonical compiler plan shape.'
    );
    return;
  }

  if (response.planSummary.nodeCount !== expectedSummary.nodeCount) {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary', 'nodeCount'],
      `transformation-sql-first-v2 responses require nodeCount ${expectedSummary.nodeCount}.`
    );
  }

  if (response.planSummary.stepCount !== expectedSummary.stepCount) {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary', 'stepCount'],
      `transformation-sql-first-v2 responses require stepCount ${expectedSummary.stepCount}.`
    );
  }

  if (!haveMatchingValues(response.planSummary.sourceTables, expectedSummary.sourceTables)) {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary', 'sourceTables'],
      'transformation-sql-first-v2 responses require sourceTables derived from the canonical compiler plan.'
    );
  }

  if (!haveMatchingValues(response.planSummary.sinkTables, expectedSummary.sinkTables)) {
    addPlanPreviewResponseIssue(
      ctx,
      ['planSummary', 'sinkTables'],
      'transformation-sql-first-v2 responses require sinkTables derived from the canonical compiler plan.'
    );
  }
}

export const PlanPreviewPersistResponseSchema = PlanPreviewIdentityPayloadSchema.extend({
  validation: PlanPreviewValidationSchema,
})
  .strict()
  .superRefine(validatePlanPreviewIdentity);

const PlanPreviewSelectionRejectedOutcomeSchema = z
  .object({
    contractVersion: z.literal(PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION),
    kind: z.literal(PLAN_PREVIEW_REJECTED_OUTCOME_KIND.selectionRejected),
    rejection: z
      .object({
        code: z.literal('REJECTED'),
        cause: NonBlankStringSchema.optional(),
        reason: NonBlankStringSchema,
      })
      .strict(),
  })
  .strict();

type ExecutabilityValidationError = Extract<
  ExecutabilityValidationResult,
  { readonly status: 'ERROR' }
>;
type ExecutabilityValidationErrorWire = Omit<ExecutabilityValidationError, 'cause'> & {
  readonly cause?: string | undefined;
};

const ExecutabilityValidationErrorSchema: z.ZodType<ExecutabilityValidationErrorWire> = z
  .object({
    status: z.literal('ERROR'),
    code: z.enum(EXECUTABILITY_REJECTION_CODES),
    planId: NonBlankStringSchema,
    adapterId: NonBlankStringSchema,
    degradable: z.boolean(),
    reason: NonBlankStringSchema,
    findings: z.tuple([PlanExecutabilityFindingSchema]).readonly().optional(),
    cause: NonBlankStringSchema.optional(),
  })
  .strict();

const PlanPreviewPlanInvalidOutcomeSchema = PlanPreviewIdentityPayloadSchema.extend({
  contractVersion: z.literal(PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION),
  kind: z.literal(PLAN_PREVIEW_REJECTED_OUTCOME_KIND.planInvalid),
  validation: ExecutabilityValidationErrorSchema,
})
  .strict()
  .superRefine(validatePlanPreviewIdentity);

export const PlanPreviewRejectedOutcomeSchema = z.union([
  PlanPreviewSelectionRejectedOutcomeSchema,
  PlanPreviewPlanInvalidOutcomeSchema,
]);

export type PlanPreviewSummarySchemaT = z.infer<typeof PlanPreviewSummarySchema>;
export type PlanPreviewPersistedRecordSchemaT = z.infer<typeof PlanPreviewPersistedRecordSchema>;
export type PlanPreviewValidationSchemaT = z.infer<typeof PlanPreviewValidationSchema>;
export type PlanPreviewPersistResponseSchemaT = z.infer<typeof PlanPreviewPersistResponseSchema>;
export type PlanPreviewRejectedOutcomeSchemaT = z.infer<typeof PlanPreviewRejectedOutcomeSchema>;
