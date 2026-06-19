// @vitest-environment jsdom

/** Owned concern: prove CanvasShell keeps the graph as the base work surface. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createCanvasShellHarness,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import type { CanvasShellGraphCommands, CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';

describe('CanvasShell graph base surface', () => {
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

  it('keeps node selection separate from contextual node workbench opening', async () => {
    const onShowInspector = vi.fn();
    const onNodeClick = vi.fn();
    const clickedNode = { id: 'node.orders' } as Parameters<
      CanvasShellGraphCommands['onNodeClick']
    >[1];
    const clickEvent = new MouseEvent('click') as unknown as Parameters<
      CanvasShellGraphCommands['onNodeClick']
    >[0];

    const props = await renderShell({
      chromeCommands: { onShowInspector },
      graphCommands: { onNodeClick },
    });

    props.graphCommands.onNodeClick(clickEvent, clickedNode);

    expect(onShowInspector).not.toHaveBeenCalled();
    expect(onNodeClick).toHaveBeenCalledWith(clickEvent, clickedNode);
  });

  it('keeps host-owned tab chrome out of the graph base panel', async () => {
    await renderShell({
      layout: {
        hostTabState: {
          activeTabId: 'workspace-draft-canvas',
          tabs: [
            {
              id: 'workspace-draft-canvas',
              title: 'Transformation canvas',
              kind: 'transformation',
              kindLabel: 'Transformation',
              source: 'workspace_draft',
            },
          ],
        },
        hostTabStrip: <div data-testid="canvas-host-tab-strip" />,
      },
    });

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
    await renderShell({
      layout: {
        hostTabStrip: <div data-testid="canvas-host-tab-strip" />,
        workbenchTabStrip: <div data-testid="canvas-workbench-tab-strip" />,
      },
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-workbench-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('keeps neutral canvas identity and draft status out of the graph surface', async () => {
    await renderShell({
      panels: {
        activeCanvas: {
          id: 'sales-canvas',
          title: 'Sales canvas',
          kind: 'dbt',
          environmentId: 'dev',
        },
      },
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
    expect(container.textContent).not.toContain('Sales canvas');
    expect(container.textContent).not.toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('keeps the graph workbench fluid instead of forcing horizontal overflow on narrow viewports', async () => {
    await renderShell();

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('class')).toContain('min-w-0');
    expect(shellPanelGroup?.getAttribute('class')).not.toContain('min-w-[960px]');
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await renderShell({
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
  });

  it('keeps governed center surfaces ahead of workbench unavailable panels', async () => {
    await renderShell({
      layout: {
        centerSurfaceMode: 'replace',
        centerSurface: <div data-testid="first-canvas-center-surface" />,
        contextualWorkbench: {
          id: 'project-code',
          title: 'Project code',
          panel: <div data-testid="code-workbench-panel" />,
          onClose: vi.fn(),
        },
      },
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  });

  it('renders contextual workbench panels beside the graph instead of replacing it', async () => {
    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Project code',
          panel: <div data-testid="code-workbench-panel" />,
          onClose: vi.fn(),
        },
      },
    });

    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-contextual-workbench"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  });
});
