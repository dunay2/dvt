import { describe, expect, it } from 'vitest';

import { resolvePluginsViewCopy } from './pluginsViewCopy';

describe('resolvePluginsViewCopy', () => {
  it('resolves Spanish plugin reconciliation copy', () => {
    const copy = resolvePluginsViewCopy('es-ES');

    expect(copy.title).toBe('Plugins');
    expect(copy.frontendFilterNotRegistered).toBe('Frontend no registrado');
    expect(copy.backendFilterLabel).toBe('Filtrar por estado del backend');
    expect(copy.backendUnknownDetail('catalog-only')).toContain('catalog-only');
  });

  it('falls back to English for unsupported locales', () => {
    const copy = resolvePluginsViewCopy('fr-FR');

    expect(copy.frontendFilterNotRegistered).toBe('Frontend not registered');
    expect(copy.unboundLabel).toBe('Unbound');
  });
});
