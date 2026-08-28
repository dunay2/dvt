/**
 * Owned concern: catalogue selected Substrait semantic identities that DVT may
 * admit into the exact pinned VTX2 profile without redefining their meaning.
 *
 * Provider execution, visual exposure, rendering and semantic admission remain
 * separate concerns. This file owns only DVT product-governance state.
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
const OfficialExtensionUrnSchema = z
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
const StandardProfileStatusSchema = z.enum(DVT_SUBSTRAIT_STANDARD_PROFILE_STATUS);
const ProductNeedStatusSchema = z.enum(DVT_SUBSTRAIT_PRODUCT_NEED_STATUS);

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
    urn: OfficialExtensionUrnSchema,
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

function encodeCapabilitySegments(segments: readonly string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
}

function compareCodeUnitStrings(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function buildDvtSubstraitStandardCapabilityId(
  category: DvtSubstraitCapabilityCategory,
  identity: DvtSubstraitStandardSemanticIdentityV1
): string {
  if (identity.sourceKind === 'core') {
    return encodeCapabilitySegments(
      ['substrait', 'core', category, identity.message, identity.selector].filter(
        (segment): segment is string => segment !== undefined
      )
    );
  }
  return encodeCapabilitySegments([
    'substrait',
    'simple-extension',
    category,
    identity.urn,
    identity.name,
  ]);
}

export function buildDvtSubstraitProductNeedCapabilityId(
  category: DvtSubstraitCapabilityCategory,
  productNeedId: string
): string {
  return encodeCapabilitySegments(['dvt', 'product-need', category, productNeedId]);
}

export const DvtSubstraitStandardCapabilityV1Schema = z
  .object({
    kind: z.literal('standard'),
    entryId: NonBlankStringSchema,
    category: DvtSubstraitCapabilityCategorySchema,
    identity: DvtSubstraitStandardSemanticIdentityV1Schema,
    profileStatus: StandardProfileStatusSchema,
    evidenceRefs: EvidenceRefsSchema,
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
        message:
          'Relations and expression forms in the standard-backed catalog require core identity.',
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
    profileStatus: ProductNeedStatusSchema,
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
        message: `Product-need entryId must be derived from productNeedId: ${expectedId}.`,
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
        evidenceRefs: [...entry.evidenceRefs].sort(compareCodeUnitStrings),
      }))
      .sort((left, right) => compareCodeUnitStrings(left.entryId, right.entryId)),
  };
}

export function serializeDvtSubstraitCapabilityCatalogV1(input: unknown): string {
  return JSON.stringify(canonicalizeDvtSubstraitCapabilityCatalogV1(input));
}

const STUDY = 'dvt:#2640';
const PILOT = 'dvt:#2598';
const ALGEBRA = [STUDY, 'substrait:v0.101.0:proto/substrait/algebra.proto'];
const TYPES = [STUDY, 'substrait:v0.101.0:proto/substrait/type.proto'];
const FUNCTIONS_STRING = [STUDY, 'substrait:v0.101.0:extensions/functions_string.yaml'];
const FUNCTIONS_COMPARISON = [STUDY, 'substrait:v0.101.0:extensions/functions_comparison.yaml'];
const FUNCTIONS_BOOLEAN = [STUDY, 'substrait:v0.101.0:extensions/functions_boolean.yaml'];
const FUNCTIONS_AGGREGATE = [
  STUDY,
  'substrait:v0.101.0:extensions/functions_aggregate_generic.yaml',
];
const FUNCTIONS_ARITHMETIC = [STUDY, 'substrait:v0.101.0:extensions/functions_arithmetic.yaml'];
const FUNCTIONS_DECIMAL = [
  STUDY,
  'substrait:v0.101.0:extensions/functions_arithmetic_decimal.yaml',
];

function coreCandidate(
  category: DvtSubstraitCapabilityCategory,
  message: string,
  selector: string | undefined,
  evidenceRefs: readonly string[]
): DvtSubstraitStandardCapabilityV1 {
  const identity = { sourceKind: 'core' as const, message, ...(selector ? { selector } : {}) };
  return DvtSubstraitStandardCapabilityV1Schema.parse({
    kind: 'standard',
    entryId: buildDvtSubstraitStandardCapabilityId(category, identity),
    category,
    identity,
    profileStatus: 'candidate-standard',
    evidenceRefs: [...evidenceRefs],
  });
}

function extensionCandidate(
  category: 'scalar-function' | 'aggregate-function' | 'window-function',
  urn: string,
  name: string,
  evidenceRefs: readonly string[]
): DvtSubstraitStandardCapabilityV1 {
  const identity = { sourceKind: 'simple-extension' as const, urn, name };
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
    ...(extensionPoint ? { extensionPoint } : {}),
    evidenceRefs: [...evidenceRefs],
  });
}

const CORE_RELATIONS: readonly [string, string?][] = [
  ['substrait.ReadRel', 'read_type.named_table'],
  ['substrait.RelCommon', 'emit_kind.emit'],
  ['substrait.ProjectRel'],
  ['substrait.FilterRel'],
  ['substrait.JoinRel', 'JoinType.JOIN_TYPE_INNER'],
  ['substrait.JoinRel', 'JoinType.JOIN_TYPE_LEFT'],
  ['substrait.AggregateRel'],
  ['substrait.SetRel', 'SetOp.SET_OP_UNION_DISTINCT'],
  ['substrait.SetRel', 'SetOp.SET_OP_UNION_ALL'],
  ['substrait.SetRel', 'SetOp.SET_OP_INTERSECTION_MULTISET'],
  ['substrait.SetRel', 'SetOp.SET_OP_MINUS_PRIMARY'],
  ['substrait.SortRel'],
  ['substrait.FetchRel'],
];
const EXPRESSION_SELECTORS = [
  'rex_type.literal',
  'rex_type.selection',
  'rex_type.scalar_function',
  'rex_type.cast',
  'rex_type.if_then',
  'rex_type.window_function',
] as const;
const CORE_TYPES = [
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
] as const;

const STANDARD_SEED: DvtSubstraitStandardCapabilityV1[] = [
  ...CORE_RELATIONS.map(([message, selector]) =>
    coreCandidate('relation', message, selector, ALGEBRA)
  ),
  ...EXPRESSION_SELECTORS.map((selector) =>
    coreCandidate('expression-form', 'substrait.Expression', selector, ALGEBRA)
  ),
  ...['trim', 'upper', 'lower', 'concat', 'concat_ws'].map((name) =>
    extensionCandidate(
      'scalar-function',
      'extension:io.substrait:functions_string',
      name,
      FUNCTIONS_STRING
    )
  ),
  ...['coalesce', 'equal', 'not_equal', 'gt', 'gte', 'lt', 'lte', 'is_null', 'is_not_null'].map(
    (name) =>
      extensionCandidate(
        'scalar-function',
        'extension:io.substrait:functions_comparison',
        name,
        FUNCTIONS_COMPARISON
      )
  ),
  extensionCandidate(
    'scalar-function',
    'extension:io.substrait:functions_boolean',
    'and',
    FUNCTIONS_BOOLEAN
  ),
  extensionCandidate(
    'aggregate-function',
    'extension:io.substrait:functions_aggregate_generic',
    'count',
    FUNCTIONS_AGGREGATE
  ),
  extensionCandidate(
    'aggregate-function',
    'extension:io.substrait:functions_arithmetic',
    'sum',
    FUNCTIONS_ARITHMETIC
  ),
  extensionCandidate(
    'aggregate-function',
    'extension:io.substrait:functions_arithmetic_decimal',
    'sum',
    FUNCTIONS_DECIMAL
  ),
  extensionCandidate(
    'window-function',
    'extension:io.substrait:functions_arithmetic',
    'row_number',
    FUNCTIONS_ARITHMETIC
  ),
  ...CORE_TYPES.map((selector) =>
    coreCandidate('type', 'substrait.Type', `kind.${selector}`, TYPES)
  ),
];

const PILOT_SUPPORTED_ENTRY_IDS = new Set([
  buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message: 'substrait.ReadRel',
    selector: 'read_type.named_table',
  }),
  buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message: 'substrait.RelCommon',
    selector: 'emit_kind.emit',
  }),
  buildDvtSubstraitStandardCapabilityId('relation', {
    sourceKind: 'core',
    message: 'substrait.ProjectRel',
  }),
  buildDvtSubstraitStandardCapabilityId('expression-form', {
    sourceKind: 'core',
    message: 'substrait.Expression',
    selector: 'rex_type.selection',
  }),
  buildDvtSubstraitStandardCapabilityId('expression-form', {
    sourceKind: 'core',
    message: 'substrait.Expression',
    selector: 'rex_type.scalar_function',
  }),
  buildDvtSubstraitStandardCapabilityId('type', {
    sourceKind: 'core',
    message: 'substrait.Type',
    selector: 'kind.string',
  }),
  buildDvtSubstraitStandardCapabilityId('scalar-function', {
    sourceKind: 'simple-extension',
    urn: 'extension:io.substrait:functions_string',
    name: 'trim',
  }),
  buildDvtSubstraitStandardCapabilityId('scalar-function', {
    sourceKind: 'simple-extension',
    urn: 'extension:io.substrait:functions_string',
    name: 'upper',
  }),
]);

const ADMITTED_STANDARD_SEED = STANDARD_SEED.map((entry) =>
  PILOT_SUPPORTED_ENTRY_IDS.has(entry.entryId)
    ? DvtSubstraitStandardCapabilityV1Schema.parse({
        ...entry,
        profileStatus: 'supported-profile',
        evidenceRefs: [...entry.evidenceRefs, PILOT],
      })
    : entry
);

const PRODUCT_NEED_SEED: DvtSubstraitProductNeedCapabilityV1[] = [
  productNeed(
    'type',
    'postgres-jsonb',
    'Portable PostgreSQL JSONB semantics without inventing a fake core JSON type.',
    'candidate-extension',
    [STUDY, 'substrait:v0.101.0:extensions/'],
    'simple-extension-type'
  ),
  productNeed(
    'type',
    'postgres-unbounded-numeric',
    'Truthful mapping for PostgreSQL numeric without explicit precision and scale.',
    'gap',
    TYPES
  ),
  productNeed(
    'relation',
    'cardinality-changing-table-function',
    'Portable UNNEST/EXPLODE-style cardinality-changing table-function semantics.',
    'gap',
    [STUDY, 'substrait:v0.101.0:site/docs/expressions/table_functions.md']
  ),
];

export const DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 = canonicalizeDvtSubstraitCapabilityCatalogV1({
  schemaVersion: DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
  profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
  entries: [...ADMITTED_STANDARD_SEED, ...PRODUCT_NEED_SEED],
});
