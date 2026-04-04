import { describe, expect, it } from 'vitest';
import { resolveTopAppBarCopy } from './copy';

describe('resolveTopAppBarCopy', () => {
  it('returns Spanish copy for es locale', () => {
    const copy = resolveTopAppBarCopy('es-ES');
    expect(copy.workspaceControls).toBe('Controles del workspace');
    expect(copy.focusMode).toBe('Modo foco');
  });

  it('falls back to English for non-es locales', () => {
    const copy = resolveTopAppBarCopy('fr-FR');
    expect(copy.workspaceControls).toBe('Workspace controls');
    expect(copy.focusMode).toBe('Focus Mode');
  });
});
