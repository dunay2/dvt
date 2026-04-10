import { describe, expect, it } from 'vitest';
import { resolveShellTopBarCopy } from './copy';

describe('resolveShellTopBarCopy', () => {
  it('returns Spanish copy for es locale', () => {
    const copy = resolveShellTopBarCopy('es-ES');
    expect(copy.workspaceControls).toBe('Controles del workspace');
    expect(copy.focusMode).toBe('Modo foco');
    expect(copy.gridSize).toBe('Tama\u00f1o de rejilla');
    expect(copy.quickActions).toBe('Acciones r\u00e1pidas');
    expect(copy.profileSettings).toBe('Configuraci\u00f3n de perfil');
    expect(copy.documentation).toBe('Documentaci\u00f3n');
    expect(copy.signOut).toBe('Cerrar sesi\u00f3n');
    expect(JSON.stringify(copy)).not.toContain('\u00c3');
  });

  it('falls back to English for non-es locales', () => {
    const copy = resolveShellTopBarCopy('fr-FR');
    expect(copy.workspaceControls).toBe('Workspace controls');
    expect(copy.focusMode).toBe('Focus Mode');
  });
});
