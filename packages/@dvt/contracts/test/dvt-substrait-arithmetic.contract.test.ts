import { describe, expect, it } from 'vitest';

import {
  DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1,
  DvtSubstraitStandardCapabilityV1Schema,
} from '../src/index.js';

describe('bounded arithmetic signatures', () => {
  it.each(['add', 'subtract', 'multiply'])('admits exact numeric overloads for %s', (name) => {
    const entry = DVT_SUBSTRAIT_CAPABILITY_CATALOG_V1.entries.find(
      (candidate) =>
        candidate.kind === 'standard' &&
        candidate.identity.sourceKind === 'simple-extension' &&
        candidate.identity.name === name
    );
    expect(entry?.profileStatus).toBe('supported-profile');
    expect(entry).toMatchObject({
      overloads: [
        {
          signature: `${name}:i64_i64`,
          outputType: 'i64',
          options: [{ name: 'overflow', preference: ['ERROR'] }],
        },
        {
          signature: `${name}:fp64_fp64`,
          outputType: 'fp64',
          options: [{ name: 'rounding', preference: ['TIE_TO_EVEN'] }],
        },
      ],
    });
    expect(DvtSubstraitStandardCapabilityV1Schema.safeParse(entry).success).toBe(true);
    expect(
      DvtSubstraitStandardCapabilityV1Schema.safeParse({
        ...entry,
        overloads: [
          {
            signature: 'invented:i64_i64',
            argumentTypes: ['i64', 'i64'],
            minimumArgumentCount: 2,
            maximumArgumentCount: 2,
            outputType: 'i64',
            options: [],
          },
        ],
      }).success
    ).toBe(false);
  });
});
