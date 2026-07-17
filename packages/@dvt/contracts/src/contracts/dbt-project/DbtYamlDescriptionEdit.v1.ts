/**
 * Owned concern: version the exact proposal, apply receipt, and conditional
 * revert language for one dbt YAML resource description.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Visual description edits carry a content-addressed proposal and never expose a generic node update.
 * @consequence API and browser share one strict transaction vocabulary while files remain semantic authority.
 * @version 1.0.0
 */
import { z } from 'zod';

export const DBT_YAML_DESCRIPTION_RESOURCE_TYPE = [
  'model',
  'seed',
  'snapshot',
  'source',
  'exposure',
  'metric',
] as const;

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256HexStringSchema = z.string().regex(/^[a-f0-9]{64}$/u);
const DescriptionSchema = z.string().max(65_536).nullable();

export const DbtYamlDescriptionResourceIdentitySchema = z
  .object({
    uniqueId: NonBlankStringSchema.max(512),
    resourceType: z.enum(DBT_YAML_DESCRIPTION_RESOURCE_TYPE),
    name: NonBlankStringSchema.max(512),
    sourceName: NonBlankStringSchema.max(512).optional(),
  })
  .strict()
  .superRefine((resource, context) => {
    if (resource.resourceType === 'source' && resource.sourceName === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'sourceName is required for dbt source resources.',
        path: ['sourceName'],
      });
    }
    if (resource.resourceType !== 'source' && resource.sourceName !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'sourceName is valid only for dbt source resources.',
        path: ['sourceName'],
      });
    }
  });

export const DbtYamlDescriptionAnalysisReceiptSchema = z
  .object({
    freshness: z.enum(['fresh', 'stale-last-valid', 'invalid', 'unavailable']),
    analysisSha256: Sha256HexStringSchema,
    projectContentSetSha256: Sha256HexStringSchema,
  })
  .strict();

export const DbtYamlDescriptionEditProposalSchema = z
  .object({
    schemaVersion: z.literal('dbt-yaml-description-edit-proposal.v1'),
    canvasId: NonBlankStringSchema.max(256),
    resource: DbtYamlDescriptionResourceIdentitySchema,
    path: NonBlankStringSchema.max(4_096),
    previousDescription: DescriptionSchema,
    nextDescription: DescriptionSchema,
    expectedContentSha256: Sha256HexStringSchema,
    candidateContent: z.string().max(1_000_000),
    candidateContentSha256: Sha256HexStringSchema,
    unifiedDiff: z.string().max(1_100_000),
    proposalDigest: Sha256HexStringSchema,
  })
  .strict();

export const DbtYamlDescriptionAppliedReceiptSchema = z
  .object({
    schemaVersion: z.literal('dbt-yaml-description-edit-applied-receipt.v1'),
    receiptId: Sha256HexStringSchema,
    canvasId: NonBlankStringSchema.max(256),
    resource: DbtYamlDescriptionResourceIdentitySchema,
    path: NonBlankStringSchema.max(4_096),
    previousDescription: DescriptionSchema,
    nextDescription: DescriptionSchema,
    expectedContentSha256: Sha256HexStringSchema,
    appliedContentSha256: Sha256HexStringSchema,
    proposalDigest: Sha256HexStringSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
    requestHash: Sha256HexStringSchema,
    deduplicated: z.boolean(),
    analysis: DbtYamlDescriptionAnalysisReceiptSchema,
  })
  .strict();

export const DbtYamlDescriptionRevertedReceiptSchema = z
  .object({
    schemaVersion: z.literal('dbt-yaml-description-edit-reverted-receipt.v1'),
    receiptId: Sha256HexStringSchema,
    appliedReceiptId: Sha256HexStringSchema,
    canvasId: NonBlankStringSchema.max(256),
    resource: DbtYamlDescriptionResourceIdentitySchema,
    path: NonBlankStringSchema.max(4_096),
    restoredDescription: DescriptionSchema,
    expectedContentSha256: Sha256HexStringSchema,
    revertedContentSha256: Sha256HexStringSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
    requestHash: Sha256HexStringSchema,
    deduplicated: z.boolean(),
    analysis: DbtYamlDescriptionAnalysisReceiptSchema,
  })
  .strict();

export const ProposeDbtYamlDescriptionEditRequestSchema = z
  .object({
    canvasId: NonBlankStringSchema.max(256),
    resourceUniqueId: NonBlankStringSchema.max(512),
    nextDescription: DescriptionSchema,
  })
  .strict();

export const ApplyDbtYamlDescriptionEditRequestSchema = z
  .object({
    proposal: DbtYamlDescriptionEditProposalSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict();

export const RevertDbtYamlDescriptionEditRequestSchema = z
  .object({
    appliedReceipt: DbtYamlDescriptionAppliedReceiptSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict();

export type DbtYamlDescriptionResourceType = (typeof DBT_YAML_DESCRIPTION_RESOURCE_TYPE)[number];
export type DbtYamlDescriptionResourceIdentity = z.infer<
  typeof DbtYamlDescriptionResourceIdentitySchema
>;
export type DbtYamlDescriptionAnalysisReceipt = z.infer<
  typeof DbtYamlDescriptionAnalysisReceiptSchema
>;
export type DbtYamlDescriptionEditProposal = z.infer<typeof DbtYamlDescriptionEditProposalSchema>;
export type DbtYamlDescriptionAppliedReceipt = z.infer<
  typeof DbtYamlDescriptionAppliedReceiptSchema
>;
export type DbtYamlDescriptionRevertedReceipt = z.infer<
  typeof DbtYamlDescriptionRevertedReceiptSchema
>;
export type ProposeDbtYamlDescriptionEditRequest = z.infer<
  typeof ProposeDbtYamlDescriptionEditRequestSchema
>;
export type ApplyDbtYamlDescriptionEditRequest = z.infer<
  typeof ApplyDbtYamlDescriptionEditRequestSchema
>;
export type RevertDbtYamlDescriptionEditRequest = z.infer<
  typeof RevertDbtYamlDescriptionEditRequestSchema
>;
