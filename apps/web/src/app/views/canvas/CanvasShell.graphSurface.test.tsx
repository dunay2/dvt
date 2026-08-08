// @vitest-environment jsdom

/** Owned concern: prove CanvasShell keeps the graph as the base work surface. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { act } from 'react';

import {
  createCanvasShellHarness,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import type { CanvasShellGraphCommands, CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { resolveWorkspaceFilePath } from './CanvasShell';

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

  it('does not fabricate a dbt model workspace path when the draft omitted it', () => {
    expect(
      resolveWorkspaceFilePath({
        name: 'Model 1',
        pluginKind: 'dbt:model',
        status: 'idle',
      })
    ).toBeNull();
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
    await renderShell();

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
    await renderShell();

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
    expect(shellPanelGroup?.getAttribute('id')).toBe('canvas-shell-horizontal-panels');
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
          closeLabel: 'Cerrar',
          panel: <div data-testid="code-workbench-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
      chromeState: {
        routeState: 'needs_canvas',
      },
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
  });

  it('renders a movable contextual workbench over the graph instead of replacing it', async () => {
    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Project code',
          closeLabel: 'Cerrar',
          moveLabel: 'Mover código',
          description: 'Workspace files in the active project scope.',
          panel: <div data-testid="code-workbench-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
    });

    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
    const baseSurface = container.querySelector(
      '[data-slot="canvas-contextual-workbench-base-surface"]'
    );
    expect(baseSurface?.classList).toContain('flex');
    expect(baseSurface?.classList).toContain('min-h-0');
    const workbench = container.querySelector('[data-slot="canvas-contextual-workbench"]');
    expect(workbench).not.toBeNull();
    expect(workbench?.classList).toContain('w-full');
    expect(workbench?.classList).toContain('min-w-0');
    expect(workbench?.classList).toContain('max-w-full');
    expect(workbench?.classList).not.toContain('min-w-96');
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).not.toBeNull();
    const overlay = container.querySelector<HTMLElement>(
      '[data-slot="canvas-contextual-workbench-overlay"]'
    );
    const dragHandle = container.querySelector<HTMLElement>(
      '[data-slot="canvas-contextual-workbench-drag-handle"]'
    );
    expect(overlay).not.toBeNull();
    expect(dragHandle?.getAttribute('role')).toBe('button');
    expect(dragHandle?.getAttribute('aria-label')).toBe('Mover código');
    expect(
      container.querySelector('[data-slot="canvas-contextual-workbench-description"]')
    ).toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-contextual-workbench-help"]')
        ?.getAttribute('aria-label')
    ).toBe('Workspace files in the active project scope.');

    const topBeforeMove = overlay?.style.top;
    await act(async () => {
      fireEvent.keyDown(dragHandle!, { key: 'ArrowDown' });
    });
    expect(overlay?.style.top).not.toBe(topBeforeMove);
    const closeButton = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-contextual-workbench-close"]'
    );
    expect(closeButton?.textContent).toBe('Cerrar');
    expect(closeButton?.getAttribute('aria-label')).toBe('Cerrar: Project code');
  });

  it('keeps an authority-owned workbench ahead of stale generic Canvas Code state', async () => {
    useCanvasInteractionStore.setState({
      contextualWorkbenchId: 'project-code',
      contextualWorkbenchOwnerKey: 'dbt-contextual-canvas:sales-canvas',
    });

    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Orders project code',
          closeLabel: 'Cerrar',
          panel: <div data-testid="dbt-project-file-code-panel" />,
          requestClose: vi.fn(async () => true),
        },
      },
    });

    expect(container.querySelector('[data-testid="dbt-project-file-code-panel"]')).not.toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-contextual-workbench-close"]')
        ?.getAttribute('aria-label')
    ).toBe('Cerrar: Orders project code');
  });
});
