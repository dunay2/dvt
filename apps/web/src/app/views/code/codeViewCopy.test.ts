import { describe, expect, it } from 'vitest';

import { resolveCodeViewCopy } from './codeViewCopy';

describe('resolveCodeViewCopy', () => {
  it('uses English fallback copy for unsupported locales', () => {
    expect(resolveCodeViewCopy('en-US')).toMatchObject({
      title: 'Code',
      explorerTitle: 'Explorer',
      editorLoadingMessage: 'Loading Monaco editor...',
      routeEmptyTitle: 'No workspace files available',
    });
  });

  it('resolves Spanish copy only when the active locale is Spanish', () => {
    expect(resolveCodeViewCopy('es-ES')).toMatchObject({
      title: 'Codigo',
      explorerTitle: 'Explorador',
      editorLoadingMessage: 'Cargando editor Monaco...',
      routeEmptyTitle: 'No hay archivos del workspace disponibles',
    });
  });
});
