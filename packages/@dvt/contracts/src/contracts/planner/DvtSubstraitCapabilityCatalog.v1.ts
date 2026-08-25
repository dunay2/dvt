/**
 * Owned concern: catalogue the selected Substrait semantic identities DVT may
 * admit into the exact pinned VTX2 profile without redefining their meaning.
 *
 * Substrait remains the semantic authority. This catalog owns only DVT product
 * governance state over selected upstream identities and explicit product gaps.
 * Provider execution support, visual exposure, SQL rendering and admission
 * conformance remain separate concerns.
 *
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Keep one small versioned governance overlay over exact Substrait identities instead of duplicating its algebra or provider capability model.
 * @consequence Adding a catalog entry cannot by itself enable execution or UI exposure; #2641 owns admission and #2642 owns visual projection.
 * @version 1.0.0
 */
import { z } from 'zod';

import {
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DvtSubstraitProfileRefV1Schema,
} from './DvtSubstraitProfile.v1.js';

const NonBlankStringSchema = z
  .string()
  .refine(
    (value) => value.length > 0 && value === value.trim(),
    'Expected a non-blank string without exterior whitespace.'
  );
const OfficialSubstraitExtensionUrnSchema = z
  .string()
  .regex(
    /^extension:io\.substrait:[a-z0-9_.-]+$/,
    'Expected an official extension:io.substrait:* URN.'
  );

export const DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION =
  'dvt-substrait-capability-catalog.v1' as const;
export const DVT_SUBSTRAIT_CAPABILITY_CATEGORY = [
  'relation',
  'expression-form',
  'scalar-function',
  'aggregate-function',
  'window-function',
  'type',
] as const;
export const DVT_SUBSTRAIT_STANDARD_PROFILE_STATUS = [
  'candidate-standard',
  'supported-profile',
  'out-of-scope',
] as const;
export const DVT_SUBSTRAIT_PRODUCT_NEED_STATUS = ['candidate-extension', 'gap'] as const;

export const DvtSubstraitCapabilityCategorySchema = z.enum(DVT_SUBSTRAIT_CAPABILITY_CATEGORY);
const DvtSubstraitStandardProfileStatusSchema = z.enum(DVT_SUBSTRAIT_STANDARD_PROFILE_STATUS);
const DvtSubstraitProductNeedStatusSchema = z.enum(DVT_SUBSTRAIT_PRODUCT_NEED_STATUS);

export const DvtSubstraitCoreSemanticIdentityV1Schema = z
  .object({
    sourceKind: z.literal('core'),
    message: NonBlankStringSchema,
    selector: NonBlankStringSchema.optional(),
  })
  .strict();

export const DvtSubstraitSimpleExtensionSemanticIdentityV1Schema = z
  .object({
    sourceKind: z.literal('simple-extension'),
    urn: OfficialSubstraitExtensionUrnSchema,
    name: NonBlankStringSchema,
  })
  .strict();

export const DvtSubstraitStandardSemanticIdentityV1Schema = z.discriminatedUnion('sourceKind', [
  DvtSubstraitCoreSemanticIdentityV1Schema,
  DvtSubstraitSimpleExtensionSemanticIdentityV1Schema,
]);

export type DvtSubstraitCapabilityCategory = z.infer<typeof DvtSubstraitCapabilityCategorySchema>;
export type DvtSubstraitStandardSemanticIdentityV1 = z.infer<
  typeof DvtSubstraitStandardSemanticIdentityV1Schema
>;

function encodeCapabilitySegment(value: string): string {
  return encodeURIComponent(value);
}

export function buildDvtSubstraitStandardCapabilityId(
  category: DvtSubstraitCapabilityCategory,
  identity: DvtSubstraitStandardSemanticIdentityV1
): string {
  const segments =
    identity.sourceKind === 'core'
      ? ['substrait', 'core', category, identity.message, identity.selector]
      : ['substrait', 'simple-extension', category, identity.urn, identity.name];
  return segments
    .filter((segment): segment is string => segment !== undefined)
    .map(encodeCapabilitySegment)
    .join('/');
}

export function buildDvtSubstraitProductNeedCapabilityId(
  category: DvtSubstraitCapabilityCategory,
  productNeedId: string
): string {
  return ['dvt', 'product-need', category, productNeedId].map(encodeCapabilitySegment).join('/');
}

const EvidenceRefsSchema = z
  .array(NonBlankStringSchema)
  .min(1)
  .superRefine((refs, context) => {
    const seen = new Set<string>();
    refs.forEach((ref, index) => {
      if (seen.has(ref)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate evidence reference ${ref}.`,
          path: [index],
        });
      }
      seen.add(ref);
    });
  });

export const DvtSubstraitStandardCapabilityV1Schema = z
  .object({
    kind: z.literal('standard'),
    entryId: NonBlankStringSchema,
    category: DvtSubstraitCapabilityCategorySchema,
    identity: DvtSubstraitStandardSemanticIdentityV1Schema,
    profileStatus: DvtSubstraitStandardProfileStatusSchema,
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    const expectedEntryId = buildDvtSubstraitStandardCapabilityId(entry.category, entry.identity);
    if (entry.entryId !== expectedEntryId) {
      context.addIssue({
        code: 'custom',
        message: `Capability entryId must be derived from the exact Substrait identity: ${expectedEntryId}.`,
        path: ['entryId'],
      });
    }

    const functionCategories = new Set<DvtSubstraitCapabilityCategory>([
      'scalar-function',
      'aggregate-function',
      'window-function',
    ]);
    if (entry.identity.sourceKind === 'core' && functionCategories.has(entry.category)) {
      context.addIssue({
        code: 'custom',
        message: 'Substrait function families must use their official simple-extension identity.',
        path: ['identity'],
      });
    }
    if (
      entry.identity.sourceKind === 'simple-extension' &&
      (entry.category === 'relation' || entry.category === 'expression-form')
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Relations and expression forms in the standard-backed catalog require core identity.',
        path: ['identity'],
      });
    }
  });

export const DvtSubstraitProductNeedCapabilityV1Schema = z
  .object({
    kind: z.literal('product-need'),
    entryId: NonBlankStringSchema,
    category: DvtSubstraitCapabilityCategorySchema,
    productNeedId: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a stable kebab-case product need id.'),
    productNeed: NonBlankStringSchema,
    profileStatus: DvtSubstraitProductNeedStatusSchema,
    extensionPoint: NonBlankStringSchema.optional(),
    evidenceRefs: EvidenceRefsSchema,
  })
  .strict()
  .superRefine((entry, context) => {
    const expectedEntryId = buildDvtSubstraitProductNeedCapabilityId(
      entry.category,
      entry.productNeedId
    );
    if (entry.entryId !== expectedEntryId) {
      context.addIssue({
        code: 'custom',
        message: `Product-need entryId must be derived from productNeedId: ${expectedEntryId}.`,
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
    const seenEntryIds = new Set<string>();
    catalog.entries.forEach((entry, index) => {
      if (seenEntryIds.has(entry.entryId)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate Substrait capability entry ${entry.entryId}.`,
          path: ['entries', index, 'entryId'],
        });
      }
      seenEntryIds.add(entry.entryId);
    });
  });

export type DvtSubstraitStandardCapabilityV1 = z.infer<
  typeof DvtSubstraitStandardCapabilityV1Schema
>;
export type DvtSubstraitProductNeedCapabilityV1 = z.infer<
  typeof DvtSubstraitProductNeedCapabilityV1Schema
>;
export type DvtSubstraitCapabilityEntryV1 = z.infer<typeof DvtSubstraitCapabilityEntryV1Schema>;
export type DvtSubstraitCapabilityCatalogV1 = z.infer<typeof DvtSubstraitCapabilityCatalogV1Schema>;

export function canonicalizeDvtSubstraitCapabilityCatalogV1(
  input: unknown
): DvtSubstraitCapabilityCatalogV1 {
  const parsed = DvtSubstraitCapabilityCatalogV1Schema.parse(input);
  return {
    schemaVersion: parsed.schemaVersion,
    profile: parsed.profile,
    entries: parsed.entries
      .map((entry) => ({
        ...entry,
        evidenceRefs: [...entry.evidenceRefs].sort(),
      }))
      .sort((left, right) => left.entryId.localeCompare(right.entryId)),
  };
}

export function serializeDvtSubstraitCapabilityCatalogV1(input: unknown): string {
  return JSON.stringify(canonicalizeDvtSubstraitCapabilityCatalogV1(input));
}

function standardCandidate(
  category: DvtSubstraitCapabilityCategory,
  identity: DvtSubstraitStandardSemanticIdentityV1,
  evidenceRefs: readonly string[]
): DvtSubstraitStandardCapabilityV1 {
  return DvtSubstraitStandardCapabilityV1Schema.parse({
    kind: 'standard',
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard',
    evidenceRefs: [...evidenceRefs],
  });
}

function productNeed(
  category: DvtSubstraitCapabilityCategory,
  productNeedId: string,
  description: string,
  profileStatus: 'candidate-extension' | 'gap',
  evidenceRefs: readonly string[],
  extensionPoint?: string
): DvtSubstraitProductNeedCapabilityV1 {
  return DvtSubstraitProductNeedCapabilityV1Schema.parse({
    kind: 'product-need',
    entryId: buildDvtSubstraitProductNeedCapabilityId(category, productNeedId),
    category,
    productNeedId,
    productNeed: description,
    profileStatus,
    ...(extensionPoint === undefined ? {} : { extensionPoint }),
    evidenceRefs: [...evidenceRefs],
  });
}

const DVT_STUDY_EVIDENCE = 'dvt:#2640';
const ALGEBRA_EVIDENCE = [DVT_STUDY_EVIDENCE, 'substrait:v0.101.0:proto/substrait/algebra.proto'];
const TYPE_EVIDENCE = [DVT_STUDY_EVIDENCE, 'substrait:v0.101.0:proto/substrait/type.proto'];
const STRING_FUNCTION_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_string.yaml',
];
const COMPARISON_FUNCTION_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_comparison.yaml',
];
const BOOLEAN_FUNCTION_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_boolean.yaml',
];
const AGGREGATE_GENERIC_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_aggregate_generic.yaml',
];
const ARITHMETIC_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_arithmetic.yaml',
];
const ARITHMETIC_DECIMAL_EVIDENCE = [
  DVT_STUDY_EVIDENCE,
  'substrait:v0.101.0:extensions/functions_arithmetic_decimal.yaml',
];

const STANDARD_SEED: DvtSubstraitStandardCapabilityV1[] = [
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.ReadRel', selector: 'read_type.named_table' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.RelCommon', selector: 'emit_kind.emit' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate('relation', { sourceKind: 'core', message: 'substrait.ProjectRel' }, ALGEBRA_EVIDENCE),
  standardCandidate('relation', { sourceKind: 'core', message: 'substrait.FilterRel' }, ALGEBRA_EVIDENCE),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.JoinRel', selector: 'JoinType.JOIN_TYPE_INNER' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.JoinRel', selector: 'JoinType.JOIN_TYPE_LEFT' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate('relation', { sourceKind: 'core', message: 'substrait.AggregateRel' }, ALGEBRA_EVIDENCE),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.SetRel', selector: 'SetOp.SET_OP_UNION_DISTINCT' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.SetRel', selector: 'SetOp.SET_OP_UNION_ALL' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'relation',
    {
      sourceKind: 'core',
      message: 'substrait.SetRel',
      selector: 'SetOp.SET_OP_INTERSECTION_MULTISET',
    },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'relation',
    { sourceKind: 'core', message: 'substrait.SetRel', selector: 'SetOp.SET_OP_MINUS_PRIMARY' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate('relation', { sourceKind: 'core', message: 'substrait.SortRel' }, ALGEBRA_EVIDENCE),
  standardCandidate('relation', { sourceKind: 'core', message: 'substrait.FetchRel' }, ALGEBRA_EVIDENCE),

  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.literal' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.selection' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.scalar_function' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.cast' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.if_then' },
    ALGEBRA_EVIDENCE
  ),
  standardCandidate(
    'expression-form',
    { sourceKind: 'core', message: 'substrait.Expression', selector: 'rex_type.window_function' },
    ALGEBRA_EVIDENCE
  ),

  ...['trim', 'upper', 'lower', 'concat', 'concat_ws'].map((name) =>
    standardCandidate(
      'scalar-function',
      { sourceKind: 'simple-extension', urn: 'extension:io.substrait:functions_string', name },
      STRING_FUNCTION_EVIDENCE
    )
  ),
  ...['coalesce', 'equal', 'not_equal', 'gt', 'gte', 'lt', 'lte', 'is_null', 'is_not_null'].map(
    (name) =>
      standardCandidate(
        'scalar-function',
        { sourceKind: 'simple-extension', urn: 'extension:io.substrait:functions_comparison', name },
        COMPARISON_FUNCTION_EVIDENCE
      )
  ),
  standardCandidate(
    'scalar-function',
    { sourceKind: 'simple-extension', urn: 'extension:io.substrait:functions_boolean', name: 'and' },
    BOOLEAN_FUNCTION_EVIDENCE
  ),
  standardCandidate(
    'aggregate-function',
    {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_aggregate_generic',
      name: 'count',
    },
    AGGREGATE_GENERIC_EVIDENCE
  ),
  standardCandidate(
    'aggregate-function',
    { sourceKind: 'simple-extension', urn: 'extension:io.substrait:functions_arithmetic', name: 'sum' },
    ARITHMETIC_EVIDENCE
  ),
  standardCandidate(
    'aggregate-function',
    {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic_decimal',
      name: 'sum',
    },
    ARITHMETIC_DECIMAL_EVIDENCE
  ),
  standardCandidate(
    'window-function',
    {
      sourceKind: 'simple-extension',
      urn: 'extension:io.substrait:functions_arithmetic',
      name: 'row_number',
    },
    ARITHMETIC_EVIDENCE
  ),

  ...[
    'bool',
    'i32',
    'i64',
    'fp64',
    'string',
    'date',
    'decimal',
    'precision_timestamp',
    'precision_timestamp_tz',
    'uuid',
  ].map((selector) =>
    standardCandidate(
      'type',
      { sourceKind: 'core', message: 'substrait.Type', selector: `kind.${selector}` },
      TYPE_EVIDENCE
    )
  ),
];

const PRODUCT_NEED_SEED: DvtSubstraitProductNeedCapabilityV1[] = [
  productNeed(
    'type',
    'postgres-jsonb',
    'Portable PostgreSQL JSONB semantics without inventing a fake core JSON type.',
    'candidate-extension',
    [DVT_STUDY_EVIDENCE, 'substrait:v0.101.0:extensions/'],
    'simple-extension-type'
  ),
  productNeed(
    'type',
    'postgres-unbounded-numeric',
    'Truthful mapping for PostgreSQL numeric without explicit precision and scale.',
    'gap',
    TYPE_EVIDENCE
  ),
  productNeed(
    'relation',
    'cardinality-changing-table-function',
    'Portable UNNEST/EXPLODE-style cardinality-changing table-function semantics.',
    'gap',
    [DVT_STUDY_EVIDENCE, 'substrait:v0.101.0:table-functions']
  ),
];

export const DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 = canonicalizeDvtSubstraitCapabilityCatalogV1({
  schemaVersion: DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
  profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
  entries: [...STANDARD_SEED, ...PRODUCT_NEED_SEED],
});

export function findDvtSubstraitCapabilityV1(
  entryId: string
): DvtSubstraitCapabilityEntryV1 | undefined {
  return DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find((entry) => entry.entryId === entryId);
}
