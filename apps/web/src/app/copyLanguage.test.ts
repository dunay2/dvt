/** Owned concern: verify the supported copy-language policy. */
import { describe, expect, it } from 'vitest';

import { resolveCopyLanguage } from './copyLanguage';

describe('resolveCopyLanguage', () => {
  it.each([
    [undefined, 'en'],
    ['', 'en'],
    ['  ', 'en'],
    ['en-US', 'en'],
    ['fr-FR', 'en'],
    ['es', 'es'],
    [' ES-mx ', 'es'],
    ['espanol', 'es'],
  ])('resolves %s to %s', (locale, expected) => {
    expect(resolveCopyLanguage(locale)).toBe(expected);
  });
});
