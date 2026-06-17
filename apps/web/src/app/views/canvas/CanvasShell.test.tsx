// @vitest-environment jsdom

/** Owned concern: prove CanvasShell contract rendering and command propagation. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildCanvasShellProps, getCanvasShellState } from './CanvasShell.testHarness';
import CanvasShell from './CanvasShell';
import type { CanvasShellGraphCommands, CanvasShellPanels } from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';

const shellState = getCanvasShellState();
const buildProps = buildCanvasShellProps;

describe('CanvasShell', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    shellState.canvasViewportProps = null;
    shellState.sourceImportWizardProps = null;
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useOperationalDrawerContributionStore.setState({ contribution: null });
    container.remove();
    vi.clearAllMocks();
  });

  it('does not mount a fixed explorer rail when graph edits are gated', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              userPermissions: {
                canPlan: false,
                canRun: false,
                canEditEdges: false,
              },
            },
          })}
        />
      );
    });

    expect(shellState.canvasViewportProps).toMatchObject({
      canOpenSourceImport: false,
    });
  });

  it('renders node details as a contextual overlay only when a node is selected', async () => {
    const selectedNode = {
      id: 'node.orders',
      name: 'orders',
      pluginId: 'dbt',
      kind: 'dbt:model',
      role: 'transform',
      status: 'idle',
      tags: [],
    } satisfies CanvasShellPanels['inspectorNode'];

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              inspectorPanelVisible: true,
            },
            panels: {
              inspectorNode: selectedNode,
              inspectorGraphNodes: [selectedNode],
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-node-workbench-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="inspector-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
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

    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeCommands: { onShowInspector },
            graphCommands: { onNodeClick },
          })}
        />
      );
    });

    const viewportNodeClick = shellState.canvasViewportProps
      ?.onNodeClick as CanvasShellGraphCommands['onNodeClick'];

    viewportNodeClick(clickEvent, clickedNode);

    expect(onShowInspector).not.toHaveBeenCalled();
    expect(onNodeClick).toHaveBeenCalledWith(clickEvent, clickedNode);
  });

  it('keeps host-owned tab chrome out of the graph base panel', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
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
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="canvas-host-tab-strip"]')).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('does not mount a permanent workbench chrome row over the graph base surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              hostTabStrip: <div data-testid="canvas-host-tab-strip" />,
              workbenchTabStrip: <div data-testid="canvas-workbench-tab-strip" />,
            },
          })}
        />
      );
    });

    const chrome = container.querySelector('[data-slot="canvas-workbench-chrome"]');
    const hostTabStrip = container.querySelector('[data-testid="canvas-host-tab-strip"]');
    const workbenchTabStrip = container.querySelector('[data-testid="canvas-workbench-tab-strip"]');
    const canvasToolbar = container.querySelector('[data-testid="canvas-toolbar"]');

    expect(chrome).toBeNull();
    expect(hostTabStrip).toBeNull();
    expect(workbenchTabStrip).toBeNull();
    expect(canvasToolbar).toBeNull();
    expect(container.querySelector('[data-testid="canvas-viewport"]')).not.toBeNull();
  });

  it('registers Canvas operational drawer tabs from the surface strategy', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeRunId: 'run-42',
            },
          })}
        />
      );
    });

    const contribution = useOperationalDrawerContributionStore.getState().contribution;

    expect(contribution).toMatchObject({
      source: 'canvas',
      title: 'Canvas operations',
      tabs: [
        { id: 'log', label: 'Log' },
        { id: 'problems', label: 'Problems' },
        { id: 'runs', label: 'Runs' },
        { id: 'preview', label: 'Preview' },
      ],
      runs: {
        activeRunId: 'run-42',
      },
      preview: {
        status: 'blocked',
        summary: canvasViewCopy.planStatusPreviewRequiredMessage,
      },
    });
    expect(contribution?.problems.items).toEqual([
      expect.objectContaining({
        id: 'plan_integrity',
        severity: 'warning',
        message: canvasViewCopy.planStatusPreviewRequiredMessage,
      }),
    ]);
  });

  it('keeps neutral canvas identity and draft status out of the graph surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-draft-save-status"]')).toBeNull();
    expect(container.textContent).not.toContain('Sales canvas');
    expect(container.textContent).not.toContain(canvasViewCopy.draftSyncedLabel);
  });

  it('renders actionable draft recovery status as a graph overlay', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
            chromeState: {
              draftStatusState: {
                label: canvasViewCopy.draftSaveFailedLabel,
                tone: 'danger',
                showReloadAction: true,
              },
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-slot="canvas-workbench-chrome"]')).toBeNull();
    const draftStatus = container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain(canvasViewCopy.draftSaveFailedLabel);
  });

  it('keeps pending autosave status visible on the graph surface', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            panels: {
              activeCanvas: {
                id: 'sales-canvas',
                title: 'Sales canvas',
                kind: 'dbt',
                environmentId: 'dev',
              },
            },
            chromeState: {
              draftStatusState: {
                label: canvasViewCopy.savingDraftLabel,
                tone: 'neutral',
                showReloadAction: false,
              },
            },
          })}
        />
      );
    });

    const draftStatus = container.querySelector('[data-slot="canvas-draft-save-status"]');

    expect(container.querySelector('[data-slot="canvas-active-canvas-identity"]')).toBeNull();
    expect(draftStatus).not.toBeNull();
    expect(draftStatus?.textContent).toContain(canvasViewCopy.savingDraftLabel);
  });

  it('keeps the graph workbench fluid instead of forcing horizontal overflow on narrow viewports', async () => {
    await act(async () => {
      root.render(<CanvasShell {...buildProps()} />);
    });

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('class')).toContain('min-w-0');
    expect(shellPanelGroup?.getAttribute('class')).not.toContain('min-w-[960px]');
  });

  it('keeps Canvas route commands hidden while the first canvas document is not created', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            chromeState: {
              routeState: 'needs_canvas',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="canvas-toolbar"]')).toBeNull();
  });

  it('keeps governed center surfaces ahead of workbench unavailable panels', async () => {
    await act(async () => {
      root.render(
        <CanvasShell
          {...buildProps({
            layout: {
              centerSurfaceMode: 'replace',
              centerSurface: <div data-testid="first-canvas-center-surface" />,
              workbenchTabPanel: <div data-testid="code-workbench-panel" />,
            },
            chromeState: {
              routeState: 'needs_canvas',
            },
          })}
        />
      );
    });

    expect(container.querySelector('[data-testid="first-canvas-center-surface"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="code-workbench-panel"]')).toBeNull();
  });
});
