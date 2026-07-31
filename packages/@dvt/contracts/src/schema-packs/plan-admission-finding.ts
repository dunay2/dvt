import { z } from 'zod';

import {
  PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND,
  PLAN_ADMISSION_FINDING_ID_PREFIX,
  PLAN_ADMISSION_FINDING_PHASE,
  PLAN_ADMISSION_FINDING_SUBJECT_KIND,
  createPlanAdmissionFindingId,
} from '../contracts/planner/PlanAdmissionFinding.v1.js';
import { EXECUTABILITY_REJECTION_CODES } from '../contracts/planner/PlanExecutabilityValidation.v1.js';

import { NonBlankStringSchema, PlanRefSchema } from './common.js';

const PlanAdmissionFindingSubjectSchema = z
  .object({
    kind: z.enum([
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.request,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.selection,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.plan,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.step,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.node,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.resource,
      PLAN_ADMISSION_FINDING_SUBJECT_KIND.adapter,
    ]),
    id: NonBlankStringSchema,
  })
  .strict();

const PlanAdmissionEvidenceReferenceSchema = z
  .object({
    kind: z.enum([
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.request,
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.plan,
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.event,
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.artifact,
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.projectRevision,
      PLAN_ADMISSION_EVIDENCE_REFERENCE_KIND.policy,
    ]),
    id: NonBlankStringSchema,
  })
  .strict();

const PlanAdmissionEvidenceValueSchema = z.union([z.string(), z.number().finite(), z.boolean()]);

const PlanAdmissionEvidenceSchema = z
  .object({
    evidenceCode: NonBlankStringSchema,
    observedValue: PlanAdmissionEvidenceValueSchema.optional(),
    expectedValue: PlanAdmissionEvidenceValueSchema.optional(),
    unit: NonBlankStringSchema.optional(),
    subject: PlanAdmissionFindingSubjectSchema.optional(),
    reference: PlanAdmissionEvidenceReferenceSchema.optional(),
  })
  .strict();

const FindingIdSchema = z
  .string()
  .regex(new RegExp(`^${PLAN_ADMISSION_FINDING_ID_PREFIX}[a-f0-9]{64}$`, 'u'));
const RemediationCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/u);

const PlanAdmissionFindingBaseShape = {
  findingId: FindingIdSchema,
  cause: NonBlankStringSchema.optional(),
  subjects: z.array(PlanAdmissionFindingSubjectSchema).min(1).readonly(),
  evidence: z.array(PlanAdmissionEvidenceSchema).min(1).readonly(),
  remediationCode: RemediationCodeSchema.optional(),
} as const;

export const PreviewSelectionFindingSchema = z
  .object({
    ...PlanAdmissionFindingBaseShape,
    phase: z.literal(PLAN_ADMISSION_FINDING_PHASE.previewSelection),
    code: NonBlankStringSchema,
    requestId: NonBlankStringSchema,
  })
  .strict()
  .superRefine(validateFindingIdentity);

export const PlanExecutabilityFindingSchema = z
  .object({
    ...PlanAdmissionFindingBaseShape,
    phase: z.literal(PLAN_ADMISSION_FINDING_PHASE.planExecutability),
    code: z.enum(EXECUTABILITY_REJECTION_CODES),
    planRef: PlanRefSchema,
    adapterId: NonBlankStringSchema,
    degradable: z.boolean(),
  })
  .strict()
  .superRefine(validateFindingIdentity);

export const PlanAdmissionFindingSchema = z.union([
  PreviewSelectionFindingSchema,
  PlanExecutabilityFindingSchema,
]);

export const PlanAdmissionFindingCollectionSchema = z
  .tuple([PlanAdmissionFindingSchema])
  .readonly();

export type PreviewSelectionFindingSchemaT = z.infer<typeof PreviewSelectionFindingSchema>;
export type PlanExecutabilityFindingSchemaT = z.infer<typeof PlanExecutabilityFindingSchema>;
export type PlanAdmissionFindingSchemaT = z.infer<typeof PlanAdmissionFindingSchema>;
export type PlanAdmissionFindingCollectionSchemaT = z.infer<
  typeof PlanAdmissionFindingCollectionSchema
>;

function validateFindingIdentity(
  finding: PreviewSelectionFindingSchemaT | PlanExecutabilityFindingSchemaT,
  context: z.RefinementCtx
): void {
  const { findingId, remediationCode: _remediationCode, ...identity } = finding;
  const expectedFindingId = createPlanAdmissionFindingId(identity);
  if (findingId !== expectedFindingId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['findingId'],
      message: 'findingId must match the canonical plan-admission finding identity.',
    });
  }
}
