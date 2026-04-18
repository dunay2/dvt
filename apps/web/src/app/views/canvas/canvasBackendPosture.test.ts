import { describe, expect, it } from 'vitest';

import { deriveCanvasBackendPosture } from './canvasBackendPosture';

describe('canvasBackendPosture', () => {
  it('treats mock mode as backend-ready and writable', () => {
    expect(
      deriveCanvasBackendPosture({
        dataSourceMode: 'mock',
        platformHealthQuery: {
          isPending: false,
          isError: false,
          data: undefined,
          error: null,
        },
      })
    ).toEqual({
      isBackendCheckPending: false,
      backendReady: true,
      backendBlockMessage: null,
      backendAllowsMutations: true,
    });
  });

  it('keeps api mode pending while the readiness check is unresolved', () => {
    expect(
      deriveCanvasBackendPosture({
        dataSourceMode: 'api',
        platformHealthQuery: {
          isPending: true,
          isError: false,
          data: undefined,
          error: null,
        },
      })
    ).toEqual({
      isBackendCheckPending: true,
      backendReady: false,
      backendBlockMessage: null,
      backendAllowsMutations: false,
    });
  });
});
