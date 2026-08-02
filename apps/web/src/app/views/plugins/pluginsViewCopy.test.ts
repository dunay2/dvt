import { describe, expect, it } from 'vitest';

import { resolvePluginsViewCopy } from './pluginsViewCopy';

describe('resolvePluginsViewCopy', () => {
  it('resolves Spanish plugin reconciliation copy', () => {
    const copy = resolvePluginsViewCopy('es-ES');

    expect(copy.title).toBe('Plugins');
    expect(copy.frontendFilterNotRegistered).toBe('Frontend no registrado');
    expect(copy.runtimeShapeBackendOnly).toBe('Solo backend');
    expect(copy.catalogEntryDetail('catalog-only')).toContain('catalog-only');
    expect(copy.frontendNotRegisteredDetail).toContain('módulo frontend');
  });

  it('falls back to English for unsupported locales', () => {
    const copy = resolvePluginsViewCopy('fr-FR');

    expect(copy.frontendFilterNotRegistered).toBe('Frontend not registered');
    expect(copy.runtimeShapeUnbound).toBe('Unbound');
    expect(copy.localOnlyDiagnosticDescription(2)).toContain('2');
  });
});
