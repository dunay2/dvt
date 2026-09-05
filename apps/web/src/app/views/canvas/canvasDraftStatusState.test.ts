// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { canvasViewCopy } from './copy';
import { deriveCanvasDraftStatusState, deriveDraftRecoveryReason } from './canvasDraftStatusState';

describe('canvasDraftStatusState', () => {
  it('derives stale_conflict with highest precedence', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: true,
        hasStaleDraftVersion: true,
        hasDraftProjectionGap: true,
      })
    ).toBe('stale_conflict');
  });

  it('derives missing_remote when the persisted draft disappeared', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: true,
        hasStaleDraftVersion: false,
        hasDraftProjectionGap: true,
      })
    ).toBe('missing_remote');
  });

  it('derives projection_gap when projection completeness is incomplete', () => {
    expect(
      deriveDraftRecoveryReason({
        hasMissingRemoteDraft: false,
        hasStaleDraftVersion: false,
        hasDraftProjectionGap: true,
      })
    ).toBe('projection_gap');
  });

  it('uses neutral draft labels when no recovery is active', () => {
    expect(
      deriveCanvasDraftStatusState({
        draftSaveStatus: 'idle',
        recoveryReason: null,
      }).label
    ).toBe(canvasViewCopy.draftSyncedLabel);
    expect(
      deriveCanvasDraftStatusState({
        draftSaveStatus: 'saving',
        recoveryReason: null,
      }).label
    ).toBe(canvasViewCopy.savingDraftLabel);
  });

  it('uses failed automatic save copy when autosave fails without recovery', () => {
    expect(
      deriveCanvasDraftStatusState({
        draftSaveStatus: 'failed',
        recoveryReason: null,
      })
    ).toEqual({
      label: 'Draft save failed',
      tone: 'danger',
      showReloadAction: false,
    });
  });

  it('uses warning and danger toolbar states for recovery reasons', () => {
    expect(
      deriveCanvasDraftStatusState({
        draftSaveStatus: 'saved',
        recoveryReason: 'stale_conflict',
      })
    ).toEqual({
      label: canvasViewCopy.staleVersionLabel,
      tone: 'danger',
      showReloadAction: true,
    });

    expect(
      deriveCanvasDraftStatusState({
        draftSaveStatus: 'saved',
        recoveryReason: 'missing_remote',
      })
    ).toEqual({
      label: canvasViewCopy.draftMissingLabel,
      tone: 'warning',
      showReloadAction: true,
    });
  });
});
