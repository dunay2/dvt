import { describe, expect, it } from 'vitest';

import {
  deriveCanvasDraftAccessPosture,
  isCanvasDraftPostureMutationBlocked,
  toCanvasDraftRecoveryBannerViewState,
  toCanvasDraftToolbarState,
} from './canvasDraftAccessPostureModel';

describe('canvasDraftAccessPostureModel', () => {
  it('maps unauthenticated protected draft denial to session recovery', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'unauthenticated',
      draftFormatError: null,
      recoveryReason: null,
      draftSaveStatus: 'idle',
      authTransportPosture: 'none',
    });

    expect(posture).toMatchObject({
      kind: 'unauthenticated',
      recoveryAction: 'refresh_session',
      mutationBlocked: true,
    });
    expect(toCanvasDraftToolbarState(posture).label).toBe('Session required');
    expect(isCanvasDraftPostureMutationBlocked(posture)).toBe(true);
  });

  it('maps workspace scope denial to forbidden scope recovery', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'forbidden',
      draftCapabilityReason: 'workspace_scope_denied',
      draftFormatError: null,
      recoveryReason: null,
      draftSaveStatus: 'idle',
      authTransportPosture: 'none',
    });

    expect(posture).toMatchObject({
      kind: 'forbidden_scope',
      recoveryAction: 'change_scope',
      mutationBlocked: true,
    });
    expect(toCanvasDraftToolbarState(posture).label).toBe('Draft access denied');
  });

  it('keeps read-only as inspectable and mutation-blocked', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'read_only',
      draftCapabilityReason: 'write_denied',
      draftFormatError: null,
      recoveryReason: null,
      draftSaveStatus: 'idle',
      authTransportPosture: 'none',
    });

    expect(posture).toMatchObject({
      kind: 'read_only',
      recoveryAction: 'inspect_only',
      mutationBlocked: true,
    });
    expect(toCanvasDraftToolbarState(posture).label).toBe('Read-only draft');
  });

  it('keeps automatic save failure visible without blocking graph edits', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'writable',
      draftCapabilityReason: 'authorized',
      draftFormatError: null,
      recoveryReason: null,
      draftSaveStatus: 'failed',
      authTransportPosture: 'none',
    });

    expect(posture).toMatchObject({
      kind: 'save_failed',
      recoveryAction: 'none',
      mutationBlocked: false,
    });
    expect(toCanvasDraftToolbarState(posture)).toEqual({
      label: 'Draft save failed',
      tone: 'danger',
      showReloadAction: false,
    });
  });

  it('does not show synced for conflict, missing remote, or projection gap', () => {
    const recoverySlots = {
      stale_conflict: 'canvas-stale-draft-state',
      missing_remote: 'canvas-missing-remote-draft-state',
      projection_gap: 'canvas-draft-projection-gap-state',
    } as const;

    for (const recoveryReason of ['stale_conflict', 'missing_remote', 'projection_gap'] as const) {
      const posture = deriveCanvasDraftAccessPosture({
        draftAccessMode: 'writable',
        draftCapabilityReason: 'authorized',
        draftFormatError: null,
        recoveryReason,
        draftSaveStatus: 'idle',
        authTransportPosture: 'none',
      });

      expect(posture.kind).toBe(recoveryReason);
      expect(toCanvasDraftToolbarState(posture).label).not.toBe('Draft synced');
      expect(toCanvasDraftRecoveryBannerViewState(posture)?.dataSlot).toBe(
        recoverySlots[recoveryReason]
      );
      expect(isCanvasDraftPostureMutationBlocked(posture)).toBe(true);
    }
  });

  it('maps final transport authorization failure to session recovery', () => {
    const posture = deriveCanvasDraftAccessPosture({
      draftAccessMode: 'unknown',
      draftCapabilityReason: null,
      draftFormatError: null,
      recoveryReason: null,
      draftSaveStatus: 'idle',
      authTransportPosture: 'unauthorized_final',
    });

    expect(posture).toMatchObject({
      kind: 'unauthenticated',
      recoveryAction: 'refresh_session',
      mutationBlocked: true,
    });
  });
});
