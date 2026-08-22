/**
 * Owned concern: validate scoped plan-store record contracts.
 */
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';
import { z } from 'zod';

import {
  CURRENT_EXECUTION_PLAN_CONTRACT_VERSION,
  CURRENT_EXECUTION_PLAN_SCHEMA_VERSION,
} from '../contracts/planner/ExecutionPlan.v1.js';
import type { ExecutionPlan } from '../contracts/planner/ExecutionPlan.v1.js';
import type { PlanAdmissionLink } from '../contracts/planner/PlanAdmissionLink.v1.js';
import type {
  PlanExecutabilityRecord,
  PlanExecutabilityRejectionReport,
} from '../contracts/planner/PlanExecutabilityRecord.v1.js';
import { EXECUTABILITY_REJECTION_CODES } from '../contracts/planner/PlanExecutabilityValidation.v1.js';
import type { PlanRecord } from '../contracts/planner/PlanRecord.v1.js';

import { NonBlankStringSchema } from './common.js';
import { ExecutionPlanSchema, PlanVersionSchema } from './execution-plan.js';
import { HexSha256Schema } from './shared.js';

export const PlanRecordStateSchema = z.enum(['ACTIVE', 'SUPERSEDED', 'ARCHIVED']);

export const PlanStoreScopeSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
  })
  .strict();

const PlanRecordCommonSchema = z
  .object({
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
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
    const canonicalPlan = parseCanonicalPlan(record, ctx);
    if (canonicalPlan === null) {
      return;
    }
    if (hasCanonicalPlanJsonMismatch(record, canonicalPlan, ctx)) {
      return;
    }
    validateCanonicalOwnership(record, canonicalPlan, ctx);
    validateCanonicalHash(record, ctx);
    validateCanonicalMetadata(record, canonicalPlan, ctx);
  }
);

function parseCanonicalPlan(record: PlanRecord, ctx: z.RefinementCtx): ExecutionPlan | null {
  let canonicalPlanInput: unknown;

  try {
    canonicalPlanInput = JSON.parse(record.canonicalPlanJson);
  } catch {
    addPlanRecordIssue(ctx, ['canonicalPlanJson'], 'canonicalPlanJson must contain valid JSON');
    return null;
  }

  const canonicalPlanResult = ExecutionPlanSchema.safeParse(canonicalPlanInput);
  if (canonicalPlanResult.success) {
    return canonicalPlanResult.data;
  }

  for (const issue of canonicalPlanResult.error.issues) {
    addPlanRecordIssue(ctx, ['canonicalPlanJson', ...issue.path], issue.message);
  }
  return null;
}

function hasCanonicalPlanJsonMismatch(
  record: PlanRecord,
  canonicalPlan: ExecutionPlan,
  ctx: z.RefinementCtx
): boolean {
  const expectedCanonicalPlanJson = jcsCanonicalize(canonicalPlan);
  if (record.canonicalPlanJson === expectedCanonicalPlanJson) {
    return false;
  }

  addPlanRecordIssue(
    ctx,
    ['canonicalPlanJson'],
    'canonicalPlanJson must equal JCS(canonical ExecutionPlan)'
  );
  return true;
}

function validateCanonicalHash(record: PlanRecord, ctx: z.RefinementCtx): void {
  if (record.canonicalHash === sha256HexUtf8(record.canonicalPlanJson)) {
    return;
  }

  addPlanRecordIssue(ctx, ['canonicalHash'], 'canonicalHash must match sha256(canonicalPlanJson)');
}

function validateCanonicalMetadata(
  record: PlanRecord,
  canonicalPlan: ExecutionPlan,
  ctx: z.RefinementCtx
): void {
  const metadata = canonicalPlan.metadata;
  const checks = [
    {
      actual: record.planId,
      expected: metadata.planId,
      message: 'planId must match canonicalPlanJson.metadata.planId',
      path: ['planId'],
    },
    {
      actual: record.planVersion,
      expected: metadata.planVersion,
      message: 'planVersion must match canonicalPlanJson.metadata.planVersion',
      path: ['planVersion'],
    },
    {
      actual: record.schemaVersion,
      expected: metadata.schemaVersion,
      message: 'schemaVersion must match canonicalPlanJson.metadata.schemaVersion',
      path: ['schemaVersion'],
    },
    {
      actual: record.contractVersion,
      expected: metadata.contractVersion,
      message: 'contractVersion must match canonicalPlanJson.metadata.contractVersion',
      path: ['contractVersion'],
    },
  ] as const;

  for (const check of checks) {
    if (check.actual !== check.expected) {
      addPlanRecordIssue(ctx, [...check.path], check.message);
    }
  }
}

function validateCanonicalOwnership(
  record: PlanRecord,
  canonicalPlan: ExecutionPlan,
  ctx: z.RefinementCtx
): void {
  const ownership = canonicalPlan.metadata.ownership;
  if (ownership === undefined) {
    addPlanRecordIssue(
      ctx,
      ['canonicalPlanJson', 'metadata', 'ownership'],
      'canonicalPlanJson.metadata.ownership is required for persisted plan records'
    );
    return;
  }

  const checks = [
    {
      actual: record.tenantId,
      expected: ownership.tenantId,
      message: 'tenantId must match canonicalPlanJson.metadata.ownership.tenantId',
      path: ['tenantId'],
    },
    {
      actual: record.projectId,
      expected: ownership.projectId,
      message: 'projectId must match canonicalPlanJson.metadata.ownership.projectId',
      path: ['projectId'],
    },
    {
      actual: record.environmentId,
      expected: ownership.environmentId,
      message: 'environmentId must match canonicalPlanJson.metadata.ownership.environmentId',
      path: ['environmentId'],
    },
  ] as const;

  for (const check of checks) {
    if (check.actual !== check.expected) {
      addPlanRecordIssue(ctx, [...check.path], check.message);
    }
  }
}

function addPlanRecordIssue(
  ctx: z.RefinementCtx,
  path: readonly PropertyKey[],
  message: string
): void {
  ctx.addIssue({
    code: 'custom',
    path: path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
    message,
  });
}

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
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
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
    tenantId: NonBlankStringSchema,
    projectId: NonBlankStringSchema,
    environmentId: NonBlankStringSchema,
    planId: HexSha256Schema,
    runId: NonBlankStringSchema,
    adapterId: NonBlankStringSchema,
    admittedAtIso: NonBlankStringSchema,
  })
  .strict();
