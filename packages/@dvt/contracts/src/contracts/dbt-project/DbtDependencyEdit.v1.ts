/**
 * Owned concern: publish the semantic command and typed outcomes for one
 * lossless selected-model DBT dependency edit.
 *
 * @baseline ADR-0060: DBT Project Authoring Authority
 * @decision The client names semantic identities; the server owns source patches.
 * @consequence Arbitrary replacement source is absent from this boundary.
 * @version 1.0.0
 */
import { z } from 'zod';

import { isSha256HexString, SHA256_HEX_STRING_MESSAGE } from '../../utils/contractPrimitives.js';

const NonBlankStringSchema = z.string().trim().min(1);
const IdentifierSchema = NonBlankStringSchema.max(512);
const PathSchema = NonBlankStringSchema.max(4_096);
const Sha256Schema = NonBlankStringSchema.refine(isSha256HexString, {
  message: SHA256_HEX_STRING_MESSAGE,
});

export const DBT_DEPENDENCY_EDIT_FINDING_CODE = [
  'dbt_dependency_edit_authority_refused',
  'dbt_dependency_edit_analysis_stale',
  'dbt_dependency_edit_analysis_not_ready',
  'dbt_dependency_edit_region_not_found',
  'dbt_dependency_edit_region_code_only',
  'dbt_dependency_edit_target_changed',
  'dbt_dependency_edit_target_not_found',
  'dbt_dependency_edit_target_incompatible',
  'dbt_dependency_edit_literal_unrepresentable',
  'dbt_dependency_edit_candidate_stale',
  'dbt_dependency_edit_validation_failed',
  'dbt_dependency_edit_semantic_mismatch',
  'dbt_dependency_edit_invariant_failed',
] as const;

export const DbtDependencyEditRequestSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-request.v1'),
    canvasId: IdentifierSchema,
    selectedUniqueId: IdentifierSchema,
    expectedProjectContentSetSha256: Sha256Schema,
    expectedAnalysisSha256: Sha256Schema,
    expectedSelectedAnalysisSha256: Sha256Schema,
    regionId: IdentifierSchema,
    expectedTargetUniqueId: IdentifierSchema,
    nextTargetUniqueId: IdentifierSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict();

const DbtDependencyEditFindingSubjectSchema = z
  .object({
    kind: z.enum(['project', 'file', 'resource', 'region', 'adapter']),
    uniqueId: IdentifierSchema.optional(),
    path: PathSchema.optional(),
    regionId: IdentifierSchema.optional(),
  })
  .strict()
  .superRefine((subject, context) => {
    if (subject.kind === 'file' && subject.path === undefined) {
      addIssue(context, ['path'], 'File findings require a path');
    }
    if (subject.kind === 'resource' && subject.uniqueId === undefined) {
      addIssue(context, ['uniqueId'], 'Resource findings require an identity');
    }
    if (subject.kind === 'region' && subject.regionId === undefined) {
      addIssue(context, ['regionId'], 'Region findings require a region identity');
    }
  });

export const DbtDependencyEditFindingSchema = z
  .object({
    code: z.enum(DBT_DEPENDENCY_EDIT_FINDING_CODE),
    subject: DbtDependencyEditFindingSubjectSchema,
    evidence: z
      .object({
        reasonCode: NonBlankStringSchema.max(256).optional(),
        expectedValue: NonBlankStringSchema.max(4_096).optional(),
        actualValue: NonBlankStringSchema.max(4_096).nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const DbtDependencyEditAppliedReceiptSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-applied-receipt.v1'),
    receiptId: Sha256Schema,
    canvasId: IdentifierSchema,
    selectedUniqueId: IdentifierSchema,
    regionId: IdentifierSchema,
    path: PathSchema,
    previousTargetUniqueId: IdentifierSchema,
    nextTargetUniqueId: IdentifierSchema,
    expectedContentSha256: Sha256Schema,
    appliedContentSha256: Sha256Schema,
    previousProjectContentSetSha256: Sha256Schema,
    projectContentSetSha256: Sha256Schema,
    previousAnalysisSha256: Sha256Schema,
    analysisSha256: Sha256Schema,
    previousSelectedAnalysisSha256: Sha256Schema,
    selectedAnalysisSha256: Sha256Schema,
    idempotencyKey: NonBlankStringSchema.max(256),
    requestHash: Sha256Schema,
    deduplicated: z.boolean(),
  })
  .strict()
  .superRefine((receipt, context) => {
    if (receipt.previousTargetUniqueId === receipt.nextTargetUniqueId) {
      addIssue(context, ['nextTargetUniqueId'], 'Applied receipts cannot describe a no-op');
    }
    if (receipt.expectedContentSha256 === receipt.appliedContentSha256) {
      addIssue(
        context,
        ['appliedContentSha256'],
        'Applied receipts require a changed file revision'
      );
    }
    if (receipt.previousProjectContentSetSha256 === receipt.projectContentSetSha256) {
      addIssue(
        context,
        ['projectContentSetSha256'],
        'Applied receipts require a changed content set'
      );
    }
  });

const DbtDependencyEditAppliedResultSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-result.v1'),
    kind: z.literal('applied'),
    receipt: DbtDependencyEditAppliedReceiptSchema,
  })
  .strict();

const DbtDependencyEditNoChangeResultSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-result.v1'),
    kind: z.literal('no_change'),
    canvasId: IdentifierSchema,
    selectedUniqueId: IdentifierSchema,
    regionId: IdentifierSchema,
    targetUniqueId: IdentifierSchema,
    projectContentSetSha256: Sha256Schema,
    analysisSha256: Sha256Schema,
    selectedAnalysisSha256: Sha256Schema,
  })
  .strict();

const DbtDependencyEditRefusedResultSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-result.v1'),
    kind: z.literal('refused'),
    finding: DbtDependencyEditFindingSchema,
  })
  .strict();

const DbtDependencyEditConflictSchema = z
  .object({
    path: PathSchema,
    currentContentSha256: Sha256Schema.nullable(),
  })
  .strict();

const DbtDependencyEditConflictResultSchema = z
  .object({
    schemaVersion: z.literal('dbt-dependency-edit-result.v1'),
    kind: z.literal('conflict'),
    conflicts: z.array(DbtDependencyEditConflictSchema).min(1),
  })
  .strict()
  .superRefine((result, context) => {
    let previousPath: string | undefined;
    result.conflicts.forEach((conflict, index) => {
      if (previousPath !== undefined && conflict.path <= previousPath) {
        addIssue(context, ['conflicts', index, 'path'], 'Conflicts must be unique and sorted');
      }
      previousPath = conflict.path;
    });
  });

export const DbtDependencyEditResultSchema = z.discriminatedUnion('kind', [
  DbtDependencyEditAppliedResultSchema,
  DbtDependencyEditNoChangeResultSchema,
  DbtDependencyEditRefusedResultSchema,
  DbtDependencyEditConflictResultSchema,
]);

export type DbtDependencyEditRequest = z.infer<typeof DbtDependencyEditRequestSchema>;
export type DbtDependencyEditFinding = z.infer<typeof DbtDependencyEditFindingSchema>;
export type DbtDependencyEditAppliedReceipt = z.infer<typeof DbtDependencyEditAppliedReceiptSchema>;
export type DbtDependencyEditResult = z.infer<typeof DbtDependencyEditResultSchema>;

function addIssue(context: z.RefinementCtx, path: (string | number)[], message: string): void {
  context.addIssue({ code: 'custom', path, message });
}
