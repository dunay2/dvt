import { describe, expect, it } from 'vitest';

import { resolveCompiledApplicationMetadata } from './appBuildMetadata';

describe('resolveCompiledApplicationMetadata', () => {
  it('returns the compiled application version from the build environment', () => {
    expect(
      resolveCompiledApplicationMetadata({
        VITE_APP_VERSION: '5.30.0',
        VITE_APP_BUILD_DATE: '2026-05-27T10:15:00.000Z',
      })
    ).toEqual({
      productName: 'Raven',
      version: '5.30.0',
      buildDate: '2026-05-27T10:15:00.000Z',
    });
  });

  it('uses explicit unavailable values when the bundle does not publish build metadata', () => {
    expect(resolveCompiledApplicationMetadata({})).toEqual({
      productName: 'Raven',
      version: '0.0.0',
      buildDate: null,
    });
  });
});
