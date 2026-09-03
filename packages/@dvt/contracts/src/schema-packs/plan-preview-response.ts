import { z } from 'zod';

import {
  EXECUTABILITY_REJECTION_CODES,
  type ExecutabilityValidationResult,
} from '../contracts/planner/PlanExecutabilityValidation.v1.js';
import { PlanPreviewProvenanceSchema } from '../contracts/planner/PlanPreviewProvenance.v1.js';
import {
  PLAN_PREVIEW_REJECTED_OUTCOME_CONTRACT_VERSION,
  PLAN_PREVIEW_REJECTED_OUTCOME_KIND,
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

export const PlanPreviewPersistResponseSchema = PlanPreviewIdentityPayloadSchema.extend({
  validation: PlanPreviewValidationSchema,
}).strict();

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
}).strict();

export const PlanPreviewRejectedOutcomeSchema = z.union([
  PlanPreviewSelectionRejectedOutcomeSchema,
  PlanPreviewPlanInvalidOutcomeSchema,
]);

export type PlanPreviewSummarySchemaT = z.infer<typeof PlanPreviewSummarySchema>;
export type PlanPreviewPersistedRecordSchemaT = z.infer<typeof PlanPreviewPersistedRecordSchema>;
export type PlanPreviewValidationSchemaT = z.infer<typeof PlanPreviewValidationSchema>;
export type PlanPreviewPersistResponseSchemaT = z.infer<typeof PlanPreviewPersistResponseSchema>;
export type PlanPreviewRejectedOutcomeSchemaT = z.infer<typeof PlanPreviewRejectedOutcomeSchema>;
