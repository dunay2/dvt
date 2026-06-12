// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasToolbarPrimaryControls } from './CanvasToolbarPrimaryControls';

const DEFAULT_PROPS: React.ComponentProps<typeof CanvasToolbarPrimaryControls> = {
  canPlan: true,
  canPlanGraph: true,
  canRun: true,
  canStartRun: true,
  onPlan: vi.fn(),
  onRun: vi.fn(),
  workflowStatusClass: '',
  workflowStatusLabel: 'Preview required',
  workflowStatusTitle: 'Preview required before run',
};

describe('CanvasToolbarPrimaryControls', () => {
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
    vi.clearAllMocks();
  });

  it('renders only compact workflow, preview, and run controls in the fixed toolbar', async () => {
    await act(async () => {
      root.render(<CanvasToolbarPrimaryControls {...DEFAULT_PROPS} />);
    });

    expect(container.querySelector('[data-slot="canvas-workflow-status"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-plan-command"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-run-command"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-project-menu-trigger"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-toolbar-insert-command"]')).toBeNull();
  });

  it('routes preview and run button clicks through passive command props', async () => {
    const onPlan = vi.fn();
    const onRun = vi.fn();

    await act(async () => {
      root.render(
        <CanvasToolbarPrimaryControls
          {...DEFAULT_PROPS}
          canStartRun
          onPlan={onPlan}
          onRun={onRun}
        />
      );
    });

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-toolbar-plan-command"]')
        ?.click();
      container
        .querySelector<HTMLButtonElement>('[data-slot="canvas-toolbar-run-command"]')
        ?.click();
    });

    expect(onPlan).toHaveBeenCalledTimes(1);
    expect(onRun).toHaveBeenCalledTimes(1);
  });
});
