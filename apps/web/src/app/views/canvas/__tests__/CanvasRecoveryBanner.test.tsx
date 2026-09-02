import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { deriveCanvasDraftAccessPosture } from '../canvasDraftAccessPostureModel';
import { CanvasRecoveryBanner } from '../CanvasRecoveryBanner';

describe('CanvasRecoveryBanner', () => {
  it('renders the resolved session recovery action without hard-coding reload copy', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root: Root = createRoot(container);
    const onDraftAccessRecoveryAction = vi.fn();

    act(() => {
      root.render(
        <CanvasRecoveryBanner
          presentationState={{ recoveryReason: null, routeState: 'error_graph' }}
          draftAccessPosture={deriveCanvasDraftAccessPosture({
            draftAccessMode: 'unknown',
            draftCapabilityReason: null,
            draftFormatError: null,
            authTransportPosture: 'unauthorized_final',
            recoveryReason: null,
            draftSaveStatus: 'idle',
          })}
          onDraftAccessRecoveryAction={onDraftAccessRecoveryAction}
        />
      );
    });

    const button = container.querySelector('button');

    expect(container.textContent).toContain('Session required for draft access');
    expect(button?.textContent).toBe('Refresh session');
    expect(button?.getAttribute('disabled')).toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onDraftAccessRecoveryAction).toHaveBeenCalledTimes(1);

    act(() => root.unmount());
    container.remove();
  });

  it('does not render read-only posture as a recovery action banner', () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const container = document.createElement('div');
    const root: Root = createRoot(container);

    act(() => {
      root.render(
        <CanvasRecoveryBanner
          presentationState={{ recoveryReason: null, routeState: 'ready' }}
          draftAccessPosture={deriveCanvasDraftAccessPosture({
            draftAccessMode: 'read_only',
            draftCapabilityReason: 'write_denied',
            draftFormatError: null,
            authTransportPosture: 'none',
            recoveryReason: null,
            draftSaveStatus: 'idle',
          })}
          onDraftAccessRecoveryAction={vi.fn()}
        />
      );
    });

    expect(container.textContent).toBe('');
    expect(container.querySelector('button')).toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});
