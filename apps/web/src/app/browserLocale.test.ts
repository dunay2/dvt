// @vitest-environment jsdom
/** Owned concern: verify browser locale acquisition without application state. */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectBrowserLocale } from './browserLocale';

describe('detectBrowserLocale', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['es-ES', ['en'], 'en', 'es-ES'],
    ['', ['es-MX'], 'en', 'es-MX'],
    ['', [], ' es-ES ', 'es-ES'],
    ['', [], '', 'en'],
    ['fr-FR', ['es'], 'es', 'fr-FR'],
  ])(
    'resolves navigator %s, languages %j and document %s',
    (language, languages, lang, expected) => {
      vi.stubGlobal('navigator', { language, languages });
      vi.stubGlobal('document', { documentElement: { lang } });
      expect(detectBrowserLocale()).toBe(expected);
    }
  );

  it('uses the document when navigator is absent', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', { documentElement: { lang: 'es' } });
    expect(detectBrowserLocale()).toBe('es');
  });

  it('uses English without browser globals', () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('document', undefined);
    expect(detectBrowserLocale()).toBe('en');
  });
});
