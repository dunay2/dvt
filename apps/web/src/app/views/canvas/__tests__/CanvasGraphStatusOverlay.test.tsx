// @vitest-environment jsdom

/** Owned concern: prove Canvas graph status overlay visibility without shell integration noise. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasGraphStatusOverlay } from '../CanvasGraphStatusOverlay';
import { canvasViewCopy } from '../copy';

const ACTIVE_CANVAS = {
  id: 'sales-canvas',
  title: 'Sales canvas',
  kind: 'dbt',
  environmentId: 'dev',
} as const;

describe('CanvasGraphStatusOverlay', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps neutral saved state out of the graph surface', () => {
    act(() => {
      root.render(
        <CanvasGraphStatusOverlay
          activeCanvas={ACTIVE_CANVAS}
          draftStatusState={{
            label: canvasViewCopy.draftSyncedLabel,
            tone: 'neutral',
            showReloadAction: false,
          }}
          onReloadLatestDraft={vi.fn()}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
  });

  it('renders pending autosave status as a compact graph overlay', () => {
    act(() => {
      root.render(
        <CanvasGraphStatusOverlay
          activeCanvas={ACTIVE_CANVAS}
          draftStatusState={{
            label: canvasViewCopy.savingDraftLabel,
            tone: 'neutral',
            showReloadAction: false,
          }}
          onReloadLatestDraft={vi.fn()}
        />
      );
    });

    const draftStatus = container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain(canvasViewCopy.savingDraftLabel);
  });

  it('renders actionable recovery status with the reload command', () => {
    const onReloadLatestDraft = vi.fn();

    act(() => {
      root.render(
        <CanvasGraphStatusOverlay
          activeCanvas={ACTIVE_CANVAS}
          draftStatusState={{
            label: canvasViewCopy.draftSaveFailedLabel,
            tone: 'danger',
            showReloadAction: true,
          }}
          onReloadLatestDraft={onReloadLatestDraft}
        />
      );
    });

    const reloadButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === canvasViewCopy.reloadLatestDraftLabel
    );

    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).not.toBeNull();
    expect(reloadButton).toBeDefined();

    act(() => {
      reloadButton?.click();
    });

    expect(onReloadLatestDraft).toHaveBeenCalledOnce();
  });
});
