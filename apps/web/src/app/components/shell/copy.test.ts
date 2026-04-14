import { describe, expect, it } from 'vitest';
import { resolveShellTopBarCopy } from './copy';

describe('resolveShellTopBarCopy', () => {
  it('returns Spanish copy for es locale', () => {
    const copy = resolveShellTopBarCopy('es-ES');
    expect(copy.shell).toBe('Vista');
    expect(copy.workspacePanels).toBe('Paneles');
    expect(copy.viewOptions).toBe('Opciones de vista');
    expect(copy.focusMode).toBe('Modo foco');
    expect(copy.gridSize).toBe('Tama\u00f1o de rejilla');
    expect(copy.resetGrid).toBe('Restablecer rejilla a 20px');
    expect(JSON.stringify(copy)).not.toContain('\u00c3');
  });

  it('falls back to English for non-es locales', () => {
    const copy = resolveShellTopBarCopy('fr-FR');
    expect(copy.shell).toBe('View');
    expect(copy.workspacePanels).toBe('Panels');
    expect(copy.viewOptions).toBe('View options');
    expect(copy.resetGrid).toBe('Reset grid to 20px');
    expect(copy.focusMode).toBe('Focus Mode');
  });
});
