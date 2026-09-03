/**
 * Typed evidence required to admit semantics into the pinned DVT Substrait profile.
 * Provider execution and visual exposure are explicit, independent postures.
 */
import { z } from 'zod';

import type { DvtSubstraitCapabilityCatalogV1 } from './DvtSubstraitCapabilityCatalog.v1.js';

const NonBlankStringSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value === value.trim(),
    'Expected a non-blank string without exterior whitespace.'
  );
const EvidenceRefsSchema = z.array(NonBlankStringSchema).min(1);

export const DvtSubstraitTargetConformanceV1Schema = z
  .object({
    targetId: NonBlankStringSchema,
    status: z.enum(['unavailable', 'mapped', 'provider-accepted']),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict();

export const DvtSubstraitVisualExposureV1Schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not-exposed'), rationale: NonBlankStringSchema }).strict(),
  z.object({ status: z.literal('exposed'), evidenceRefs: EvidenceRefsSchema }).strict(),
]);

export const DvtSubstraitStableIdentityPostureV1Schema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('not-applicable'), rationale: NonBlankStringSchema }).strict(),
  z.object({ status: z.literal('proved'), evidenceRefs: EvidenceRefsSchema }).strict(),
]);

export const DvtSubstraitStandardAdmissionEvidenceV1Schema = z
  .object({
    kind: z.literal('standard-admission'),
    productUseCaseRef: NonBlankStringSchema,
    standardIdentityRef: NonBlankStringSchema,
    canonicalFixtureRef: NonBlankStringSchema,
    semanticValidationRef: NonBlankStringSchema,
    negativeValidationRef: NonBlankStringSchema,
    stableIdentity: DvtSubstraitStableIdentityPostureV1Schema,
    targetConformance: z.array(DvtSubstraitTargetConformanceV1Schema).min(1),
    visualExposure: DvtSubstraitVisualExposureV1Schema,
  })
  .strict()
  .superRefine((admission, context) => {
    const seenTargets = new Set<string>();
    admission.targetConformance.forEach((target, index) => {
      if (seenTargets.has(target.targetId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate target conformance posture ${target.targetId}.`,
          path: ['targetConformance', index, 'targetId'],
        });
      }
      seenTargets.add(target.targetId);
    });
  });

export const DvtSubstraitExtensionProposalV1Schema = z
  .object({
    kind: z.literal('dvt-extension-proposal'),
    extensionId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a stable kebab-case extension id.'),
    productUseCaseRef: NonBlankStringSchema,
    coreSearchRef: NonBlankStringSchema,
    standardExtensionSearchRef: NonBlankStringSchema,
    upstreamGapRef: NonBlankStringSchema,
    boundedVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'Expected a bounded semantic version.'),
    failClosedEvidenceRef: NonBlankStringSchema,
    convergenceRef: NonBlankStringSchema,
    reviewedStandardEntryIds: z.array(NonBlankStringSchema),
    targetConformance: DvtSubstraitTargetConformanceV1Schema,
    visualExposure: DvtSubstraitVisualExposureV1Schema,
  })
  .strict();

export type DvtSubstraitStandardAdmissionEvidenceV1 = z.infer<
  typeof DvtSubstraitStandardAdmissionEvidenceV1Schema
>;
export type DvtSubstraitExtensionProposalV1 = z.infer<typeof DvtSubstraitExtensionProposalV1Schema>;

export function assertDvtSubstraitExtensionProposalV1(
  catalog: DvtSubstraitCapabilityCatalogV1,
  input: unknown
): DvtSubstraitExtensionProposalV1 {
  const proposal = DvtSubstraitExtensionProposalV1Schema.parse(input);
  const standardIds = new Set(
    catalog.entries.filter((entry) => entry.kind === 'standard').map((entry) => entry.entryId)
  );
  const duplicateId = proposal.reviewedStandardEntryIds.find((entryId) => standardIds.has(entryId));
  if (duplicateId !== undefined) {
    throw new Error(
      `DVT extension ${proposal.extensionId} duplicates admitted or candidate standard capability ${duplicateId}.`
    );
  }
  return proposal;
}
