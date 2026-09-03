/** Exact Substrait identities used by the one DVT capability catalog. */
import { z } from 'zod';

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
export const DvtSubstraitStandardProfileStatusSchema = z.enum(
  DVT_SUBSTRAIT_STANDARD_PROFILE_STATUS
);
export const DvtSubstraitProductNeedStatusSchema = z.enum(DVT_SUBSTRAIT_PRODUCT_NEED_STATUS);

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

function encodeCapabilitySegments(segments: readonly string[]): string {
  return segments.map((segment) => encodeURIComponent(segment)).join('/');
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
