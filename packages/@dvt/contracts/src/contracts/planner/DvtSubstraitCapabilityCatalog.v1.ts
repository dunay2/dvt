/**
 * @baseline ADR-0064: Substrait semantic reference and bounded logical profile
 * @decision Compose one catalog from standard candidates, admissions, and product gaps.
 * @consequence Consumers retain one canonical capability read model.
 * @version 1.0.0
 */
import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
  canonicalizeDvtSubstraitCapabilityCatalogV1,
} from './DvtSubstraitCapabilityCatalogSchema.v1.js';
import { DVT_SUBSTRAIT_PRODUCT_NEEDS_V1 } from './DvtSubstraitProductNeeds.v1.js';
import { DVT_SUBSTRAIT_PROFILE_REF_V1 } from './DvtSubstraitProfile.v1.js';
import { DVT_SUBSTRAIT_STANDARD_CANDIDATES_V1 } from './DvtSubstraitStandardCandidates.v1.js';
import { admitDvtSubstraitStandardCandidatesV1 } from './DvtSubstraitSupportedCapabilities.v1.js';

export * from './DvtSubstraitCapabilityIdentity.v1.js';
export * from './DvtSubstraitCapabilityCatalogSchema.v1.js';

export const DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1 = canonicalizeDvtSubstraitCapabilityCatalogV1({
  schemaVersion: DVT_SUBSTRAIT_CAPABILITY_CATALOG_SCHEMA_VERSION,
  profile: DVT_SUBSTRAIT_PROFILE_REF_V1,
  entries: [
    ...admitDvtSubstraitStandardCandidatesV1(DVT_SUBSTRAIT_STANDARD_CANDIDATES_V1),
    ...DVT_SUBSTRAIT_PRODUCT_NEEDS_V1,
  ],
});
