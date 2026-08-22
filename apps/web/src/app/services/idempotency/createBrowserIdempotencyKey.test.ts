import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBrowserIdempotencyKey } from './createBrowserIdempotencyKey';

describe('createBrowserIdempotencyKey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('prefixes a secure UUID from the shared crypto authority', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.fill(0);
        return target;
      },
    });

    expect(createBrowserIdempotencyKey('source-import')).toBe(
      'source-import:00000000-0000-4000-8000-000000000000'
    );
  });

  it('creates an RFC 4122 version 4 identity from Web Crypto bytes in non-secure HTTP contexts', () => {
    vi.stubGlobal('crypto', {
      getRandomValues: (target: Uint8Array) => {
        target.set([
          0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd, 0xee,
          0xff,
        ]);
        return target;
      },
    });

    expect(createBrowserIdempotencyKey('dbt-project-import:analytics')).toBe(
      'dbt-project-import:analytics:00112233-4455-4677-8899-aabbccddeeff'
    );
  });

  it('fails closed when browser cryptographic entropy is unavailable', () => {
    vi.stubGlobal('crypto', undefined);

    expect(() => createBrowserIdempotencyKey('source-import')).toThrow(
      'Browser cryptographic entropy is required for command idempotency.'
    );
  });
});
