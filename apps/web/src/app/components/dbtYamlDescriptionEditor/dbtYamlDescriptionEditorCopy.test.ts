// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveDbtYamlDescriptionEditorCopy } from './dbtYamlDescriptionEditorCopy';

describe('resolveDbtYamlDescriptionEditorCopy', () => {
  it('uses the current application language when the locale is omitted', () => {
    const initialLanguage = useApplicationLanguageStore.getState().language;
    try {
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
      expect(resolveDbtYamlDescriptionEditorCopy().fieldLabel).toBe('Resource description');
      useApplicationLanguageStore.getState().configureApplicationLanguage('es');
      expect(resolveDbtYamlDescriptionEditorCopy().reviewAction).toBe('Revisar cambios');
      useApplicationLanguageStore.getState().configureApplicationLanguage('en');
      expect(resolveDbtYamlDescriptionEditorCopy().fieldLabel).toBe('Resource description');
    } finally {
      useApplicationLanguageStore.getState().configureApplicationLanguage(initialLanguage);
    }
  });

  it('resolves Spanish interaction copy through the locale boundary', () => {
    const copy = resolveDbtYamlDescriptionEditorCopy('es-ES');

    expect(copy.reviewAction).toBe('Revisar cambios');
    expect(copy.applyAction).toBe('Aplicar cambio');
    expect(copy.reloadAction).toBe('Recargar ultima revision');
  });

  it('keeps the English fallback complete for unsupported locales', () => {
    const copy = resolveDbtYamlDescriptionEditorCopy('de-DE');

    expect(copy.fieldLabel).toBe('Resource description');
    expect(copy.revertAction).toBe('Revert change');
    expect(Object.values(copy).every((value) => value.length > 0)).toBe(true);
  });
});
