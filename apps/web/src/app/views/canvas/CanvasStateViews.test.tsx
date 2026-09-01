// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasEmptyStateView } from './CanvasStateViews';

function renderEmptyState(props: Partial<React.ComponentProps<typeof CanvasEmptyStateView>> = {}): {
  container: HTMLDivElement;
  root: Root;
} {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <CanvasEmptyStateView
        title="Start transformation canvas"
        message="Start transformation authoring"
        {...props}
      />
    );
  });

  return { container, root };
}

describe('CanvasEmptyStateView', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.clearAllMocks();
  });

  it('keeps the empty authoring guide from blocking canvas gestures outside the card', async () => {
    const { container, root } = renderEmptyState();

    const frame = container.querySelector('[data-slot="canvas-empty-state-frame"]');
    const card = container.querySelector('[data-slot="canvas-empty-state"]');

    expect(frame?.className).toContain('pointer-events-none');
    expect(card?.className).toContain('pointer-events-auto');

    act(() => root.unmount());
  });

  it('does not mount a fixed insertion palette in the empty canvas state', async () => {
    const { container, root } = renderEmptyState();

    expect(container.querySelector('[data-slot="canvas-empty-authoring-catalog"]')).toBeNull();
    expect(document.body.querySelector('[data-slot="canvas-add-node-palette"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-add-node-palette-trigger"]')).toBeNull();
    expect(container.textContent).not.toContain('Transform');
    act(() => root.unmount());
  });

  it('exposes a checked guide visibility control that can hide the empty-state guide', async () => {
    const onEmptyStateGuideVisibilityChange = vi.fn();
    const { container, root } = renderEmptyState({
      emptyStateGuideVisible: true,
      onEmptyStateGuideVisibilityChange,
    });

    const preference = container.querySelector<HTMLInputElement>(
      '[data-slot="canvas-empty-guide-preference"]'
    );

    expect(preference).not.toBeNull();
    expect(preference?.checked).toBe(true);

    await act(async () => {
      preference?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onEmptyStateGuideVisibilityChange).toHaveBeenCalledWith(false);
    act(() => root.unmount());
  });
});
