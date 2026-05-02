import { describe, expect, it } from 'vitest';

import { deriveCanvasDraftAccessPosture } from './canvasDraftAccessPostureModel';
import { resolveCanvasRecoveryBannerViewState } from './canvasRecoveryBannerModel';

describe('canvasRecoveryBannerModel', () => {
  it('maps read-only draft posture to an inspect-only banner without reload action', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
      draftFormatError: null,
      authTransportPosture: 'none',
      recoveryReason: null,
      draftSaveStatus: 'idle',
    });

    expect(
      resolveCanvasRecoveryBannerViewState({
        draftAccessPosture: posture,
      })
    ).toMatchObject({
      title: 'Draft is read-only',
      actionLabel: 'Inspect only',
      actionEnabled: false,
    });
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
});
