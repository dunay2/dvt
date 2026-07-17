/** Owned concern: validate the exact HTTP representation of dbt YAML description transactions. */
import { z } from 'zod';

const NonBlankStringSchema = z.string().trim().min(1);
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const DescriptionSchema = z.string().max(65_536).nullable();

const ResourceSchema = z
  .object({
    uniqueId: NonBlankStringSchema.max(512),
    resourceType: z.enum(['model', 'seed', 'snapshot', 'source', 'exposure', 'metric']),
    name: NonBlankStringSchema.max(512),
    sourceName: NonBlankStringSchema.max(512).optional(),
  })
  .strict();

const AnalysisReceiptSchema = z
  .object({
    freshness: z.enum(['fresh', 'stale-last-valid', 'invalid', 'unavailable']),
    analysisSha256: Sha256Schema,
    projectContentSetSha256: Sha256Schema,
  })
  .strict();

export const DbtYamlDescriptionProposalBodySchema = z
  .object({
    canvasId: NonBlankStringSchema.max(256),
    resourceUniqueId: NonBlankStringSchema.max(512),
    nextDescription: DescriptionSchema,
  })
  .strict();

export const DbtYamlDescriptionEditProposalSchema = z
  .object({
    schemaVersion: z.literal('dbt-yaml-description-edit-proposal.v1'),
    canvasId: NonBlankStringSchema.max(256),
    resource: ResourceSchema,
    path: NonBlankStringSchema.max(4_096),
    previousDescription: DescriptionSchema,
    nextDescription: DescriptionSchema,
    expectedContentSha256: Sha256Schema,
    candidateContent: z.string().max(1_000_000),
    candidateContentSha256: Sha256Schema,
    unifiedDiff: z.string().max(1_100_000),
    proposalDigest: Sha256Schema,
  })
  .strict();

export const DbtYamlDescriptionApplyBodySchema = z
  .object({
    proposal: DbtYamlDescriptionEditProposalSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict();

export const DbtYamlDescriptionAppliedReceiptSchema = z
  .object({
    schemaVersion: z.literal('dbt-yaml-description-edit-applied-receipt.v1'),
    receiptId: Sha256Schema,
    canvasId: NonBlankStringSchema.max(256),
    resource: ResourceSchema,
    path: NonBlankStringSchema.max(4_096),
    previousDescription: DescriptionSchema,
    nextDescription: DescriptionSchema,
    expectedContentSha256: Sha256Schema,
    appliedContentSha256: Sha256Schema,
    proposalDigest: Sha256Schema,
    idempotencyKey: NonBlankStringSchema.max(256),
    requestHash: Sha256Schema,
    deduplicated: z.boolean(),
    analysis: AnalysisReceiptSchema,
  })
  .strict();

export const DbtYamlDescriptionRevertBodySchema = z
  .object({
    appliedReceipt: DbtYamlDescriptionAppliedReceiptSchema,
    idempotencyKey: NonBlankStringSchema.max(256),
  })
  .strict();
