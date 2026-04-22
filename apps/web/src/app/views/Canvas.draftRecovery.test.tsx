import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasRouteHarness,
  findCanvasButton,
  getPrimaryCanvasButtons,
  renderCanvasRouteWithController,
} from './Canvas.test.support';

describe('Canvas route draft recovery', () => {
  let harness: ReturnType<typeof createCanvasRouteHarness>;

  beforeEach(() => {
    harness = createCanvasRouteHarness();
  });

  afterEach(() => {
    harness.cleanup();
  });

  it('shows the missing-remote draft banner and disables canvas actions while keeping inspection visible', async () => {
    const reloadLatestDraft = vi.fn();
    await renderCanvasRouteWithController(harness, {
      draftRecoveryReason: 'missing_remote',
      draftToolbarState: {
        label: 'Draft missing',
        tone: 'warning',
        showReloadAction: true,
      },
      reloadLatestDraft,
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);
    const reloadButton = findCanvasButton(harness.container, 'Reload latest draft');

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-missing-remote-draft-state"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain('Persisted draft no longer exists');
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(reloadButton).not.toBeNull();
    expect(
      findCanvasButton(harness.container, 'Adopt current protected draft authority')
    ).toBeUndefined();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('shows the stale-draft banner and disables canvas actions until reload recovers the draft', async () => {
    const reloadLatestDraft = vi.fn();
    await renderCanvasRouteWithController(harness, {
      draftRecoveryReason: 'stale_conflict',
      draftToolbarState: {
        label: 'Stale version',
        tone: 'danger',
        showReloadAction: true,
      },
      reloadLatestDraft,
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);
    const reloadButton = findCanvasButton(harness.container, 'Reload latest draft');

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-stale-draft-state"]')).not.toBeNull();
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(reloadButton).not.toBeNull();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('shows the projection-gap banner and pauses canvas actions until recovery resolves it', async () => {
    const reloadLatestDraft = vi.fn();
    await renderCanvasRouteWithController(harness, {
      draftRecoveryReason: 'projection_gap',
      draftToolbarState: {
        label: 'Projection gap',
        tone: 'warning',
        showReloadAction: true,
      },
      reloadLatestDraft,
    });
    const { layoutButton, planButton, runButton } = getPrimaryCanvasButtons(harness.container);
    const reloadButton = findCanvasButton(harness.container, 'Reload latest draft');

    expect(harness.container.querySelector('[data-slot="canvas-viewport"]')).not.toBeNull();
    expect(
      harness.container.querySelector('[data-slot="canvas-draft-projection-gap-state"]')
    ).not.toBeNull();
    expect(harness.container.textContent).toContain(
      'Persisted draft is ahead of the current protected draft authority'
    );
    expect(layoutButton?.getAttribute('disabled')).not.toBeNull();
    expect(planButton?.getAttribute('disabled')).not.toBeNull();
    expect(runButton?.getAttribute('disabled')).not.toBeNull();
    expect(
      findCanvasButton(harness.container, 'Adopt current protected draft authority')
    ).toBeUndefined();

    await act(async () => {
      reloadButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(reloadLatestDraft).toHaveBeenCalledTimes(1);
  });

  it('yields to the graph error route state when recovery and graph failure coexist', async () => {
    await renderCanvasRouteWithController(harness, {
      explorerNodes: [],
      graphErrorMessage: 'workspace graph unavailable',
      draftRecoveryReason: 'stale_conflict',
      draftToolbarState: {
        label: 'Stale version',
        tone: 'danger',
        showReloadAction: true,
      },
    });

    expect(harness.container.querySelector('[data-slot="canvas-error-state"]')).not.toBeNull();
    expect(harness.container.querySelector('[data-slot="canvas-stale-draft-state"]')).toBeNull();
  });
});
