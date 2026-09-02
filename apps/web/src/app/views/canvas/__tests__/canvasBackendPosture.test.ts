import { describe, expect, it } from 'vitest';

import { deriveCanvasBackendPosture } from '../canvasBackendPosture';

describe('canvasBackendPosture', () => {
  it('keeps backend posture pending while the readiness check is unresolved', () => {
    expect(
      deriveCanvasBackendPosture({
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

  it('keeps backend posture blocked instead of returning to pending while a failed probe retries', () => {
    expect(
      deriveCanvasBackendPosture({
        platformHealthQuery: {
          isPending: true,
          isError: false,
          data: undefined,
          error: null,
          failureCount: 1,
        },
      })
    ).toEqual({
      isBackendCheckPending: false,
      backendReady: false,
      backendBlockMessage: 'Unable to reach /healthz.',
      backendAllowsMutations: false,
    });
  });

  it('keeps backend posture blocked when a previous health error has settled before a retry', () => {
    expect(
      deriveCanvasBackendPosture({
        platformHealthQuery: {
          isPending: true,
          isError: false,
          data: undefined,
          error: null,
          failureCount: 0,
          errorUpdatedAt: 1,
        },
      })
    ).toMatchObject({
      isBackendCheckPending: false,
      backendBlockMessage: 'Unable to reach /healthz.',
      backendAllowsMutations: false,
    });
  });
});
