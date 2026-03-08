import { describe, expect, it } from 'vitest';

import { jcsCanonicalize, sha256Hex } from '../src/index.js';

describe('jcsCanonicalize', () => {
  it('sorts object keys and omits undefined properties', () => {
    expect(
      jcsCanonicalize({
        b: 1,
        a: 2,
        c: undefined,
      })
    ).toBe('{"a":2,"b":1}');
  });

  it('normalizes negative zero and preserves array order', () => {
    expect(jcsCanonicalize({ zero: -0, values: [2, 1] })).toBe('{"values":[2,1],"zero":0}');
  });
});

describe('sha256Hex', () => {
  it('produces a stable digest for strings', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('produces the same digest for equivalent byte content', () => {
    const bytes = new Uint8Array([97, 98, 99]);
    expect(sha256Hex(bytes)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
