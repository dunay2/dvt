import { z } from 'zod';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
} from '../contracts/planner/ExecutionPlan.v1.js';
import type { PlanAdmissionLink } from '../contracts/planner/PlanAdmissionLink.v1.js';
import type {
  PlanExecutabilityRecord,
  PlanExecutabilityRejectionReport,
} from '../contracts/planner/PlanExecutabilityRecord.v1.js';
import { EXECUTABILITY_REJECTION_CODES } from '../contracts/planner/PlanExecutabilityValidation.v1.js';
import type { PlanRecord } from '../contracts/planner/PlanRecord.v1.js';
import { jcsCanonicalize } from '../utils/jcsCanonicalize.js';
import { sha256HexUtf8 } from '../utils/sha256HexUtf8.js';

import { NonBlankStringSchema } from './common.js';
import { ExecutionPlanSchema, PlanVersionSchema } from './execution-plan.js';
import { HexSha256Schema } from './shared.js';

export const PlanRecordStateSchema = z.enum(['ACTIVE', 'SUPERSEDED', 'ARCHIVED']);

const PlanRecordCommonSchema = z
  .object({
    planId: HexSha256Schema,
    canonicalPlanJson: NonBlankStringSchema,
    canonicalHash: HexSha256Schema,
    planVersion: PlanVersionSchema,
    schemaVersion: z.literal(CURRENT_EXECUTION_PLAN_SCHEMA_VERSION),
    contractVersion: z.literal(CURRENT_EXECUTION_PLAN_CONTRACT_VERSION),
    sourceRef: NonBlankStringSchema,
    createdAtIso: NonBlankStringSchema,
    updatedAtIso: NonBlankStringSchema,
    derivedFromPlanId: HexSha256Schema.optional(),
    supersedesPlanId: HexSha256Schema.optional(),
  })
  .strict();

export const PlanRecordShapeSchema: z.ZodType<PlanRecord> = z.discriminatedUnion('state', [
  PlanRecordCommonSchema.extend({
    state: z.literal('ACTIVE'),
  }).strict(),
  PlanRecordCommonSchema.extend({
    state: z.literal('SUPERSEDED'),
  }).strict(),
  PlanRecordCommonSchema.extend({
    state: z.literal('ARCHIVED'),
    archivedAtIso: NonBlankStringSchema,
  }).strict(),
]);

export const PlanRecordSchema: z.ZodType<PlanRecord> = PlanRecordShapeSchema.superRefine(
  (record, ctx) => {
    let canonicalPlanInput: unknown;

    try {
      canonicalPlanInput = JSON.parse(record.canonicalPlanJson);
    } catch {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanJson'],
        message: 'canonicalPlanJson must contain valid JSON',
      });
      return;
    }

    const canonicalPlanResult = ExecutionPlanSchema.safeParse(canonicalPlanInput);
    if (!canonicalPlanResult.success) {
      for (const issue of canonicalPlanResult.error.issues) {
        ctx.addIssue({
          code: 'custom',
          path: ['canonicalPlanJson', ...issue.path],
          message: issue.message,
        });
      }
      return;
    }

    const canonicalPlan = canonicalPlanResult.data;
    const expectedCanonicalPlanJson = jcsCanonicalize(canonicalPlan);
    if (record.canonicalPlanJson !== expectedCanonicalPlanJson) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalPlanJson'],
        message: 'canonicalPlanJson must equal JCS(canonical ExecutionPlan)',
      });
      return;
    }

    if (record.canonicalHash !== sha256HexUtf8(record.canonicalPlanJson)) {
      ctx.addIssue({
        code: 'custom',
        path: ['canonicalHash'],
        message: 'canonicalHash must match sha256(canonicalPlanJson)',
      });
    }

    const canonicalMetadata = canonicalPlan.metadata;
    if (record.planId !== canonicalMetadata.planId) {
      ctx.addIssue({
        code: 'custom',
        path: ['planId'],
        message: 'planId must match canonicalPlanJson.metadata.planId',
      });
    }
    if (record.planVersion !== canonicalMetadata.planVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['planVersion'],
        message: 'planVersion must match canonicalPlanJson.metadata.planVersion',
      });
    }
    if (record.schemaVersion !== canonicalMetadata.schemaVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['schemaVersion'],
        message: 'schemaVersion must match canonicalPlanJson.metadata.schemaVersion',
      });
    }
    if (record.contractVersion !== canonicalMetadata.contractVersion) {
      ctx.addIssue({
        code: 'custom',
        path: ['contractVersion'],
        message: 'contractVersion must match canonicalPlanJson.metadata.contractVersion',
      });
    }
  }
);

export const PlanExecutabilityStateSchema = z.enum(['PENDING', 'VALID', 'INVALID']);

export const PlanExecutabilityRejectionReportSchema: z.ZodType<PlanExecutabilityRejectionReport> = z
  .object({
    code: z.enum(EXECUTABILITY_REJECTION_CODES),
    reason: NonBlankStringSchema,
    degradable: z.boolean(),
    cause: NonBlankStringSchema.optional(),
  })
  .strict();

const PlanExecutabilityRecordCommonSchema = z
  .object({
    planId: HexSha256Schema,
    adapterId: NonBlankStringSchema,
  })
  .strict();

export const PlanExecutabilityRecordSchema: z.ZodType<PlanExecutabilityRecord> =
  z.discriminatedUnion('state', [
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('PENDING'),
    }).strict(),
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('VALID'),
      validatedAtIso: NonBlankStringSchema,
    }).strict(),
    PlanExecutabilityRecordCommonSchema.extend({
      state: z.literal('INVALID'),
      validatedAtIso: NonBlankStringSchema,
      rejectionReport: PlanExecutabilityRejectionReportSchema,
    }).strict(),
  ]);

export const PlanAdmissionLinkSchema: z.ZodType<PlanAdmissionLink> = z
  .object({
    planId: HexSha256Schema,
    runId: NonBlankStringSchema,
    adapterId: NonBlankStringSchema,
    admittedAtIso: NonBlankStringSchema,
  })
  .strict();
