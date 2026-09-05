// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { deriveCanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import { resolveCanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';

describe('canvasRecoveryBannerModel', () => {
  it('does not map read-only draft posture to a recovery banner', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });

    expect(resolveCanvasRecoveryBannerViewState({ draftAccessPosture: posture })).toBeNull();
  });

  it('maps session-required posture to refresh-session recovery', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'unknown',
      draftCapabilityReason: null,
      draftFormatError: null,
      authTransportPosture: 'unauthorized_final',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });

    expect(
      resolveCanvasRecoveryBannerViewState({
        draftAccessPosture: posture,
      })
    ).toMatchObject({
      title: 'Session required for draft access',
      actionLabel: 'Refresh session',
      actionEnabled: true,
    });
  });

  it('suppresses draft recovery banners when a higher-priority route state owns the surface', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'writable',
      draftCapabilityReason: 'authorized',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: 'missing_remote',
      draftSaveStatus: 'idle',
    });

    expect(
      resolveCanvasRecoveryBannerViewState({
        routeState: 'blocked_backend',
        recoveryReason: 'missing_remote',
        draftAccessPosture: posture,
      })
    ).toBeNull();
    expect(
      resolveCanvasRecoveryBannerViewState({
        routeState: 'recovery',
        recoveryReason: 'missing_remote',
        draftAccessPosture: posture,
      })
    ).toMatchObject({
      dataSlot: 'canvas-missing-remote-draft-state',
      actionLabel: 'Reload latest draft',
      actionEnabled: true,
    });
  });
});
