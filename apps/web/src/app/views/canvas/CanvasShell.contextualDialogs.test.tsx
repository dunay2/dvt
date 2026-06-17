// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contextual dialogs without source-import contract noise. */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellProps } from './canvasShell.types';

const shellState = getCanvasShellState();
type DialogViewportCommand = 'onOpenProjectExplorer' | 'onOpenCanvasSettings';

describe('CanvasShell contextual dialogs', () => {
  let container: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    const harness = createCanvasShellHarness();
    container = harness.container;
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
  });

  it('opens a contextual project explorer from the viewport command using real canvas documents', async () => {
    const onSelectCanvas = vi.fn();

    await renderShell({
      panels: {
        activeCanvasId: 'sales-canvas',
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
        canvasDocuments: [
          {
            id: 'sales-canvas',
            title: 'Sales canvas',
            kind: 'dbt',
            environmentId: 'dev',
          },
          {
            id: 'dvt-flow',
            title: 'DVT flow',
            kind: 'transformation',
            environmentId: 'dev',
          },
        ],
      },
      canvasCommands: {
        onSelectCanvas,
      },
    });

    await act(async () => {
      const openProjectExplorer = getViewportCommand('onOpenProjectExplorer');
      openProjectExplorer?.();
    });

    expect(container.querySelector('[data-slot="canvas-project-explorer-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Sales canvas');
    expect(container.textContent).toContain('DVT flow');

    const dvtFlowButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Open DVT flow'
    );
    expect(dvtFlowButton).toBeDefined();

    await act(async () => {
      dvtFlowButton?.click();
    });

    expect(onSelectCanvas).toHaveBeenCalledWith('dvt-flow');
  });

  it('opens contextual canvas settings from the viewport command using view commands', async () => {
    const onToggleGridVisible = vi.fn();
    const onToggleSnapToGrid = vi.fn();

    await renderShell({
      chromeCommands: {
        onToggleGridVisible,
        onToggleSnapToGrid,
      },
    });

    await act(async () => {
      const openCanvasSettings = getViewportCommand('onOpenCanvasSettings');
      openCanvasSettings?.();
    });

    expect(container.querySelector('[data-slot="canvas-settings-dialog"]')).not.toBeNull();
    expect(container.textContent).toContain('Canvas settings');

    const gridButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Hide grid'
    );
    const snapButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Enable snap'
    );
    expect(gridButton).toBeDefined();
    expect(snapButton).toBeDefined();

    await act(async () => {
      gridButton?.click();
      snapButton?.click();
    });

    expect(onToggleGridVisible).toHaveBeenCalledTimes(1);
    expect(onToggleSnapToGrid).toHaveBeenCalledTimes(1);
  });
});

function getViewportCommand(commandName: DialogViewportCommand): (() => void) | undefined {
  return shellState.canvasViewportProps?.[commandName] as (() => void) | undefined;
}
