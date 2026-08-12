// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  APPLICATION_LANGUAGE_STORAGE_KEY,
  normalizeApplicationLanguage,
  useApplicationLanguageStore,
} from './applicationLanguageStore';

describe('ConfigureApplicationLanguage', () => {
  afterEach(() => {
    localStorage.removeItem(APPLICATION_LANGUAGE_STORAGE_KEY);
    useApplicationLanguageStore.setState({ language: 'en' });
    document.documentElement.lang = '';
  });

  it('normalizes only supported English and Spanish language tags', () => {
    expect(normalizeApplicationLanguage('es-ES')).toBe('es');
    expect(normalizeApplicationLanguage('en-GB')).toBe('en');
    expect(normalizeApplicationLanguage('fr-FR')).toBeNull();
    expect(normalizeApplicationLanguage(null)).toBeNull();
  });

  it('updates observable copy authority and document language', () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    expect(useApplicationLanguageStore.getState().language).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('persists the validated language without invoking a protected API', () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');

    expect(localStorage.getItem(APPLICATION_LANGUAGE_STORAGE_KEY)).toContain('"language":"es"');
  });

  it('rehydrates the persisted language as the visible document authority', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    const persistedSpanishPreference = localStorage.getItem(APPLICATION_LANGUAGE_STORAGE_KEY);
    useApplicationLanguageStore.setState({ language: 'en' });
    localStorage.setItem(APPLICATION_LANGUAGE_STORAGE_KEY, persistedSpanishPreference ?? '');
    document.documentElement.lang = 'en';

    await useApplicationLanguageStore.persist.rehydrate();

    expect(useApplicationLanguageStore.getState().language).toBe('es');
    expect(document.documentElement.lang).toBe('es');
  });
});
