/** Product gaps retained beside, but structurally separate from, standard identities. */
import {
  DvtSubstraitProductNeedCapabilityV1Schema,
  type DvtSubstraitProductNeedCapabilityV1,
} from './DvtSubstraitCapabilityCatalogSchema.v1.js';
import {
  buildDvtSubstraitProductNeedCapabilityId,
  type DvtSubstraitCapabilityCategory,
} from './DvtSubstraitCapabilityIdentity.v1.js';

function productNeed(
  category: DvtSubstraitCapabilityCategory,
  productNeedId: string,
  productNeed: string,
  profileStatus: 'candidate-extension' | 'gap',
  evidenceRefs: readonly string[],
  extensionPoint?: string
): DvtSubstraitProductNeedCapabilityV1 {
  return DvtSubstraitProductNeedCapabilityV1Schema.parse({
    kind: 'product-need',
    entryId: buildDvtSubstraitProductNeedCapabilityId(category, productNeedId),
    category,
    productNeedId,
    productNeed,
    profileStatus,
    evidenceRefs,
    ...(extensionPoint ? { extensionPoint } : {}),
  });
}

const STUDY = 'dvt:#2640';
export const DVT_SUBSTRAIT_PRODUCT_NEEDS_V1: readonly DvtSubstraitProductNeedCapabilityV1[] = [
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
    [STUDY, 'substrait:v0.101.0:proto/substrait/type.proto']
  ),
  productNeed(
    'relation',
    'cardinality-changing-table-function',
    'Portable UNNEST/EXPLODE-style cardinality-changing table-function semantics.',
    'gap',
    [STUDY, 'substrait:v0.101.0:site/docs/expressions/table_functions.md']
  ),
];
