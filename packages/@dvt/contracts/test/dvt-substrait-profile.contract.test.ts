import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_PROFILE_REF_V1,
  DVT_SUBSTRAIT_VTX2_PROFILE,
  evaluateDvtSubstraitProfileCompatibility,
} from '../src/substrait.js';

describe('DVT Substrait VTX2 profile', () => {
  it('admits its pinned profile and rejects every changed coordinate', () => {
    expect(evaluateDvtSubstraitProfileCompatibility(DVT_SUBSTRAIT_PROFILE_REF_V1)).toEqual({
      status: 'compatible',
    });

    for (const [coordinate, value, reason] of [
      ['schemaVersion', 'dvt-substrait-profile.v2', 'schema-version-mismatch'],
      ['profileId', 'dvt.vtx2.substrait.v2', 'profile-id-mismatch'],
      ['specVersion', '0.102.0', 'spec-version-mismatch'],
      ['specCommitSha', 'a'.repeat(40), 'spec-commit-mismatch'],
    ] as const) {
      expect(
        evaluateDvtSubstraitProfileCompatibility({
          ...DVT_SUBSTRAIT_PROFILE_REF_V1,
          [coordinate]: value,
        })
      ).toEqual({ status: 'incompatible', reason });
    }
  });

  it('keeps semantic capability lists outside profile coordinates', () => {
    expect(DVT_SUBSTRAIT_VTX2_PROFILE).not.toHaveProperty('logicalRelations');
    expect(DVT_SUBSTRAIT_VTX2_PROFILE).not.toHaveProperty('expressionFamilies');
  });
});
