/**
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Validate and serialize the capability read model deterministically.
 * @consequence Supported status rejects without complete admission evidence.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  DvtSubstraitStandardAdmissionEvidenceV1Schema,
  type DvtSubstraitStandardAdmissionEvidenceV1,
} from './DvtSubstraitCapabilityAdmission.v1.js';
import {
  DvtSubstraitCapabilityCategorySchema,
  DvtSubstraitProductNeedStatusSchema,
  DvtSubstraitStandardProfileStatusSchema,
  DvtSubstraitStandardSemanticIdentityV1Schema,
  buildDvtSubstraitProductNeedCapabilityId,
  buildDvtSubstraitStandardCapabilityId,
} from './DvtSubstraitCapabilityIdentity.v1.js';
import { DvtSubstraitProfileRefV1Schema } from './DvtSubstraitProfile.v1.js';
const NonBlankStringSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value === value.trim(),
    'Expected a non-blank string without exterior whitespace.'
  );
const EvidenceRefsSchema = z.array(NonBlankStringSchema).min(1);
const compareStrings = (left: string, right: string): number =>
  left === right ? 0 : left < right ? -1 : 1;
export const DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION =
  'dvt-substrait-capability-catalog.v1' as const;

export const DvtSubstraitStandardCapabilityV1Schema = z
  .object({
    kind: z.literal('standard'),
    entryId: NonBlankStringSchema,
    category: DvtSubstraitCapabilityCategorySchema,
    identity: DvtSubstraitStandardSemanticIdentityV1Schema,
    profileStatus: DvtSubstraitStandardProfileStatusSchema,
    evidenceRefs: EvidenceRefsSchema,
    admission: DvtSubstraitStandardAdmissionEvidenceV1Schema.optional(),
  })
  .strict()
  .superRefine((entry, context) => {
    const expectedId = buildDvtSubstraitStandardCapabilityId(entry.category, entry.identity);
    if (entry.entryId !== expectedId) {
      context.addIssue({
        code: 'custom',
        message: `Capability entryId must be derived from the exact Substrait identity: ${expectedId}.`,
        path: ['entryId'],
      });
    }
    const functionCategory = ['scalar-function', 'aggregate-function', 'window-function'].includes(
      entry.category
    );
    if (entry.identity.sourceKind === 'core' && functionCategory) {
      context.addIssue({
        code: 'custom',
        message: 'Substrait function families require their official simple-extension identity.',
        path: ['identity'],
      });
    }
    if (
      entry.identity.sourceKind === 'simple-extension' &&
      (entry.category === 'relation' || entry.category === 'expression-form')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Relations and expression forms require core Substrait identity.',
        path: ['identity'],
      });
    }
    if (entry.profileStatus === 'supported-profile' && entry.admission === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'supported-profile requires complete standard-first admission evidence.',
        path: ['admission'],
      });
    }
    if (entry.profileStatus !== 'supported-profile' && entry.admission !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Only supported-profile capabilities may carry admission evidence.',
        path: ['admission'],
      });
    }
  });
export const DvtSubstraitProductNeedCapabilityV1Schema = z
  .object({
    kind: z.literal('product-need'),
    entryId: NonBlankStringSchema,
    category: DvtSubstraitCapabilityCategorySchema,
    productNeedId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    productNeed: NonBlankStringSchema,
    profileStatus: DvtSubstraitProductNeedStatusSchema,
    extensionPoint: NonBlankStringSchema.optional(),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    const expectedId = buildDvtSubstraitProductNeedCapabilityId(
      entry.category,
      entry.productNeedId
    );
    if (entry.entryId !== expectedId) {
      context.addIssue({
        code: 'custom',
        message: `Expected derived entryId ${expectedId}.`,
        path: ['entryId'],
      });
    }
    if (entry.profileStatus === 'candidate-extension' && entry.extensionPoint === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'candidate-extension requires an explicit Substrait extension point.',
        path: ['extensionPoint'],
      });
    }
  });
export const DvtSubstraitCapabilityEntryV1Schema = z.discriminatedUnion('kind', [
  DvtSubstraitStandardCapabilityV1Schema,
  DvtSubstraitProductNeedCapabilityV1Schema,
]);
export const DvtSubstraitCapabilityCatalogV1Schema = z
  .object({
    schemaVersion: z.literal(DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION),
    profile: DvtSubstraitProfileRefV1Schema,
    entries: z.array(DvtSubstraitCapabilityEntryV1Schema),
  })
  .strict()
  .superRefine((catalog, context) => {
    const seen = new Set<string>();
    catalog.entries.forEach((entry, index) => {
      if (seen.has(entry.entryId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate Substrait capability entry ${entry.entryId}.`,
          path: ['entries', index, 'entryId'],
        });
      }
      seen.add(entry.entryId);
    });
  });

export type DvtSubstraitStandardCapabilityV1 = z.infer<
  typeof DvtSubstraitStandardCapabilityV1Schema
>;
export type DvtSubstraitProductNeedCapabilityV1 = z.infer<
  typeof DvtSubstraitProductNeedCapabilityV1Schema
>;
export type DvtSubstraitCapabilityCatalogV1 = z.infer<typeof DvtSubstraitCapabilityCatalogV1Schema>;

function canonicalAdmission(
  admission: DvtSubstraitStandardAdmissionEvidenceV1
): DvtSubstraitStandardAdmissionEvidenceV1 {
  return {
    ...admission,
    targetConformance: admission.targetConformance
      .map((target) => ({ ...target, evidenceRefs: [...target.evidenceRefs].sort(compareStrings) }))
      .sort((left, right) => compareStrings(left.targetId, right.targetId)),
    stableIdentity:
      admission.stableIdentity.status === 'proved'
        ? {
            ...admission.stableIdentity,
            evidenceRefs: [...admission.stableIdentity.evidenceRefs].sort(compareStrings),
          }
        : admission.stableIdentity,
    visualExposure:
      admission.visualExposure.status === 'exposed'
        ? {
            ...admission.visualExposure,
            evidenceRefs: [...admission.visualExposure.evidenceRefs].sort(compareStrings),
          }
        : admission.visualExposure,
  };
}

export function canonicalizeDvtSubstraitCapabilityCatalogV1(
  input: unknown
): DvtSubstraitCapabilityCatalogV1 {
  const parsed = DvtSubstraitCapabilityCatalogV1Schema.parse(input);
  return {
    ...parsed,
    entries: parsed.entries
      .map((entry) => ({
        ...entry,
        evidenceRefs: [...entry.evidenceRefs].sort(compareStrings),
        ...(entry.kind === 'standard' && entry.admission
          ? { admission: canonicalAdmission(entry.admission) }
          : {}),
      }))
      .sort((left, right) => compareStrings(left.entryId, right.entryId)),
  };
}

export function serializeDvtSubstraitCapabilityCatalogV1(input: unknown): string {
  return JSON.stringify(canonicalizeDvtSubstraitCapabilityCatalogV1(input));
}
