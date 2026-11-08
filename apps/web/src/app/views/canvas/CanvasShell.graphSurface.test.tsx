// @vitest-environment jsdom

/** Owned concern: prove CanvasShell keeps the graph as the base work surface. */
import { asIsoUtcString } from '@dvt/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/dom';
import { act } from 'react';
import type { ConnectedSourceRef } from '@dvt/contracts';

import {
  createCanvasShellHarness,
  getCanvasShellState,
  type CanvasShellPropsOverrides,
} from './CanvasShell.testHarness';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasShellProps } from './canvasShell.types';
import type { SourceDataSample } from '../../ports/workspace';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import { canvasViewCopy } from './copy';
import { useOperationalDrawerContributionStore } from '../../components/shell/operationalDrawerContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import { dvtGraphNodeCardStrategy } from '../../plugins/dvt/dvtGraphNodeCardStrategy';
import { sharedSourceModelGraphNodeCardStrategy } from '../../plugins/graph/sharedSourceModelGraphNodeCardStrategy';
import { projectCanvasNodeAccessibleHealth } from './canvasNodeMapper';
import { createRunPublicationSnapshot } from '../runs/test/runPublicationFixture';
import styles from './CanvasShell.module.css';
import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';

describe('CanvasShell graph base surface', () => {
  let container: HTMLDivElement;
  let navigation: HTMLDivElement;
  let renderShell: (overrides?: CanvasShellPropsOverrides) => Promise<CanvasShellProps>;
  let unmountShell: () => void;

  beforeEach(() => {
    // DOM capability only: jsdom cannot observe the real Tooltip's geometry.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    const harness = createCanvasShellHarness();
    container = harness.container;
    navigation = harness.navigation;
    renderShell = harness.render;
    unmountShell = harness.unmount;
  });

  afterEach(() => {
    unmountShell();
    vi.unstubAllGlobals();
  });

  it('opens the actual Code owner once from a consumed route request under StrictMode', async () => {
    // Owner cleanup increments its intent on replay; transport must defer admission until replay ends.
    unmountShell();
    const harness = createCanvasShellHarness({
      strictMode: true,
      initialEntries: [
        { pathname: '/canvas', state: { canvasWorkbench: 'code', foreign: 'retained' } },
      ],
    });
    container = harness.container;
    navigation = harness.navigation;
    unmountShell = harness.unmount;
    const open = vi.spyOn(useCanvasInteractionStore.getState(), 'openContextualWorkbench');
    try {
      await harness.render();
      const editor = container.querySelector('[data-testid="sql-context-workbench"]');
      expect(editor).not.toBeNull();
      expect(editor?.closest('[inert]')).toBeNull();
      expect(container.querySelectorAll('[data-testid="sql-context-workbench"]')).toHaveLength(1);
      expect(
        navigation
          .querySelector('[data-slot="canvas-code-main-tab"]')
          ?.getAttribute('aria-selected')
      ).toBe('true');
      expect(open).toHaveBeenCalledOnce();
    } finally {
      open.mockRestore();
    }
  });

  it.each(['button', 'Delete'] as const)(
    'closes the Code session and reopens it through File (%s)',
    async (gesture) => {
      const frames: FrameRequestCallback[] = [];
      const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      try {
        const props = await renderShell();
        const viewport = container.querySelector('[data-testid="canvas-viewport"]');
        await act(async () =>
          fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!)
        );
        const code = navigation.querySelector<HTMLButtonElement>(
          '[data-slot="canvas-code-main-tab"]'
        )!;
        const editor = container.querySelector('[data-testid="sql-context-workbench"]');
        expect(editor).not.toBeNull();
        await act(async () => code.focus());
        const close = within(navigation).getByRole('button', { name: 'Close: Code' });
        expect(close.getAttribute('data-slot')).toBe('canvas-code-tab-close');
        expect(close.closest('[role="tab"]')).toBeNull();
        expect(close.getAttribute('tabindex')).toBe('-1');
        expect(code.getAttribute('aria-keyshortcuts')).toBe('Delete');
        await act(async () => {
          if (gesture === 'button') fireEvent.click(close);
          else fireEvent.keyDown(code, { key: 'Delete' });
        });
        await act(async () => frames.splice(0).forEach((callback) => callback(0)));
        expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
        expect(document.activeElement).toBe(
          navigation.querySelector('[data-slot="canvas-workspace-tab"]')
        );
        expect(
          container.querySelector('[data-testid="canvas-viewport"]')?.closest('[inert]')
        ).toBeNull();
        expect(navigation.querySelector('[data-slot="canvas-code-tab-close"]')).toBeNull();
        expect(navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
        expect(container.querySelector('[data-slot="canvas-code-workspace-surface"]')).toBeNull();
        expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
        expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
        const reopen =
          useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode;
        expect(reopen).toBeTypeOf('function');
        await act(async () => reopen?.());
        const reopened = navigation.querySelector('[data-slot="canvas-code-main-tab"]');
        expect(reopened).not.toBe(code);
        expect(reopened?.getAttribute('aria-selected')).toBe('true');
        expect(navigation.querySelectorAll('[data-slot="canvas-code-main-tab"]')).toHaveLength(1);
        expect(
          container.querySelectorAll('[data-slot="canvas-code-workspace-surface"]')
        ).toHaveLength(1);
        expect(container.querySelectorAll('[data-testid="sql-context-workbench"]')).toHaveLength(1);
        expect(container.querySelector('[data-testid="sql-context-workbench"]')).not.toBe(editor);
        expect(container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
        expect(props.chromeCommands.onPreviewExecutionPlan).not.toHaveBeenCalled();
        expect(props.panels.inspectorAuthoring?.onApplyNodeDraft).not.toHaveBeenCalled();
      } finally {
        schedule.mockRestore();
      }
    }
  );

  it.each(['rejected', 'failed'] as const)('retains Code when its flush is %s', async (outcome) => {
    await renderShell();
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    const code = navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-code-main-tab"]')!;
    const editor = container.querySelector('[data-testid="sql-context-workbench"]');
    const flush = getCanvasShellState().codeFlush;
    if (outcome === 'rejected') flush.mockResolvedValue(false);
    else flush.mockRejectedValue(new Error('File flush failed'));
    await act(async () =>
      fireEvent.click(navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(flush).toHaveBeenCalledOnce();
    expect(navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBe(code);
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.closest('[inert]')).toBeNull();
  });

  it('keeps pending Code open and rejects a stale close after a newer Code activation', async () => {
    await renderShell();
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    const code = navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-code-main-tab"]')!;
    const canvas = navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-tab"]'
    )!;
    const editor = container.querySelector('[data-testid="sql-context-workbench"]');
    let settle!: (accepted: boolean) => void;
    getCanvasShellState().codeFlush.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        })
    );
    await act(async () =>
      fireEvent.click(navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(editor?.closest('[inert]')).toBeNull();
    await act(async () => fireEvent.mouseDown(canvas, { button: 0 }));
    expect(canvas.getAttribute('aria-selected')).toBe('true');
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    await act(async () => settle(true));
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.closest('[inert]')).toBeNull();
  });

  it.each([false, true])(
    'delegates Code close to its external owner (accepted: %s)',
    async (accepted) => {
      let ownerOpen = true;
      const onClose = vi.fn(() => {
        ownerOpen = false;
      });
      const workbenchRef = { current: null };
      const renderOwner = (): Promise<CanvasShellProps> =>
        renderShell({
          workspaceCommands: { onOpenProjectCode: async () => true },
          layout: {
            contextualWorkbench: buildDbtProjectFileCodeWorkbench({
              copy: canvasViewCopy,
              workbenchRef,
              onClose,
              reconcilePersistedFile: vi.fn(async () => ({
                kind: 'fresh' as const,
                analysisSha256: 'a'.repeat(64),
                projectContentSetSha256: 'b'.repeat(64),
              })),
              projectRoot: 'analytics',
              open: ownerOpen,
            }),
          },
        });
      await renderOwner();
      const code = navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-code-main-tab"]'
      )!;
      await act(async () => fireEvent.mouseDown(code, { button: 0 }));
      const editor = container.querySelector('[data-testid="sql-context-workbench"]');
      expect(editor?.getAttribute('data-file-scope')).toBe('dbt-project-files');
      getCanvasShellState().codeFlush.mockResolvedValue(accepted);
      await act(async () =>
        fireEvent.click(navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
      );
      expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledTimes(accepted ? 1 : 0);
      await renderOwner();
      if (accepted) {
        expect(navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
        expect(container.querySelector('[data-slot="canvas-code-workspace-surface"]')).toBeNull();
        expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
      } else {
        expect(navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBe(code);
        expect(code.getAttribute('aria-selected')).toBe('true');
        expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
        expect(editor?.closest('[inert]')).toBeNull();
      }
    }
  );

  it('prevents the actual dbt owner from committing an obsolete close after Code is reopened', async () => {
    const onClose = vi.fn();
    const workbench = buildDbtProjectFileCodeWorkbench({
      copy: canvasViewCopy,
      workbenchRef: { current: null },
      onClose,
      reconcilePersistedFile: vi.fn(async () => ({
        kind: 'fresh' as const,
        analysisSha256: 'a'.repeat(64),
        projectContentSetSha256: 'b'.repeat(64),
      })),
      projectRoot: 'analytics',
      open: true,
    });
    await renderShell({
      workspaceCommands: { onOpenProjectCode: async () => true },
      layout: { contextualWorkbench: workbench },
    });
    const code = navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-code-main-tab"]')!;
    const canvas = navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-tab"]'
    )!;
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    const editor = container.querySelector('[data-testid="sql-context-workbench"]');
    expect(editor?.getAttribute('data-file-scope')).toBe('dbt-project-files');
    let settle!: (accepted: boolean) => void;
    getCanvasShellState().codeFlush.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        })
    );
    await act(async () =>
      fireEvent.click(navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(code.getAttribute('aria-selected')).toBe('true');
    await act(async () => fireEvent.mouseDown(canvas, { button: 0 }));
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    await act(async () => settle(true));
    expect(onClose).not.toHaveBeenCalled();
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.closest('[inert]')).toBeNull();
  });

  it('enters one retained project Code workspace from Git and the File menu', async () => {
    await renderShell();
    expect(navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-code-workspace-surface"]')).toBeNull();
    expect(container.querySelector('[data-testid="project-files-explorer"]')).toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
    const viewport = container.querySelector('[data-testid="canvas-viewport"]');
    const activityRail = container
      .querySelector('[data-slot="shell-project-code-command"]')!
      .closest('nav')!;
    const canvasEntry = within(container).getByRole('link', { name: 'Canvas' });
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    const editor = container.querySelector('[data-testid="sql-context-workbench"]');
    expect(editor).not.toBeNull();
    const codeTab = navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-code-main-tab"]'
    );
    expect(codeTab?.getAttribute('aria-selected')).toBe('true');
    const codePanel = document.getElementById(codeTab?.getAttribute('aria-controls') ?? '');
    expect(codePanel).not.toBeNull();
    expect(codePanel?.getAttribute('role')).toBe('tabpanel');
    expect(codePanel?.getAttribute('aria-labelledby')).toBe(codeTab?.id);
    expect(codePanel?.contains(editor)).toBe(true);
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    expect(container.querySelectorAll('[data-testid="project-files-explorer"]')).toHaveLength(1);
    expect(viewport?.closest('[inert]')).not.toBeNull();
    expect(activityRail.closest('[inert], [aria-hidden="true"]')).toBeNull();
    expect(within(container).getByRole('navigation', { name: 'Navigation' })).toBe(activityRail);
    expect(within(activityRail).queryByRole('button', { name: 'Sources' })).toBeNull();
    expect(within(container).queryByRole('button', { name: 'Elements' })).toBeNull();
    expect(within(activityRail).getByRole('link', { name: 'Git' })).not.toBeNull();
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('false');
    expect(
      within(activityRail).getByRole('link', { name: 'Git' }).getAttribute('aria-expanded')
    ).toBe('true');
    expect(container.querySelector('[data-slot="canvas-contextual-workbench-overlay"]')).toBeNull();
    const files = container.querySelector('[data-testid="project-files-explorer"]');
    expect(files).not.toBeNull();
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[0]!);
    });
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.getAttribute('data-path')).toBe('notes/first.md');
    expect(editor?.getAttribute('data-file-scope')).toBe('workspace-files');
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[1]!);
    });
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.getAttribute('data-path')).toBe('notes/second.md');
    expect(editor?.getAttribute('data-file-scope')).toBe('workspace-files');
    expect(container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
    await act(async () => {
      fireEvent.mouseDown(navigation.querySelector('[data-slot="canvas-workspace-tab"]')!, {
        button: 0,
      });
    });
    expect(viewport?.closest('[inert]')).toBeNull();
    expect(editor?.closest('[inert]')).not.toBeNull();
    expect(codeTab?.getAttribute('aria-selected')).toBe('false');
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
    const revealCode =
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode;
    expect(revealCode).toBeTypeOf('function');
    await act(async () => revealCode?.());
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.getAttribute('data-path')).toBe('notes/second.md');
    expect(editor?.closest('[inert]')).toBeNull();
    expect(viewport?.closest('[inert]')).not.toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    await act(async () => {
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'collapse' });
      fireEvent.click(canvasEntry);
    });
    expect(viewport?.closest('[inert]')).toBeNull();
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    expect(getCanvasShellState().codeFlush).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(canvasEntry);
    });
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    expect(
      within(activityRail).getByRole('link', { name: 'Git' }).getAttribute('aria-expanded')
    ).toBe('false');
    expect(codeTab?.getAttribute('aria-selected')).toBe('false');
    await act(async () => fireEvent.click(within(activityRail).getByRole('link', { name: 'Git' })));
    expect(within(container).getByRole('navigation', { name: 'Navigation' })).toBe(activityRail);
    expect(container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(container.querySelector('[data-testid="project-files-explorer"]')).toBe(files);
    expect(editor?.getAttribute('data-path')).toBe('notes/second.md');
    expect(viewport?.closest('[inert]')).not.toBeNull();
  });

  it('delegates Git file requests to the authority-owned Code opener with its actual root', async () => {
    const onOpenProjectCode = vi.fn(async () => true);
    await renderShell({
      workspaceCommands: { projectRoot: 'dbt/sales', onOpenProjectCode },
      layout: {
        contextualWorkbench: {
          id: 'project-code',
          title: 'Sales files',
          closeLabel: 'Close',
          panel: <div data-testid="authority-owned-code" />,
          requestClose: async () => true,
        },
      },
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledExactlyOnceWith(undefined);
    onOpenProjectCode.mockClear();
    const files = container.querySelector('[data-testid="project-files-explorer"]');
    expect(files?.getAttribute('data-project-root')).toBe('dbt/sales');
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[0]!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledExactlyOnceWith('notes/first.md');
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
  });

  it('keeps the graph active when the authority-owned Code opener rejects entry', async () => {
    const onOpenProjectCode = vi.fn(async () => false);
    await renderShell({ workspaceCommands: { projectRoot: 'dbt/sales', onOpenProjectCode } });
    const viewport = container.querySelector('[data-testid="canvas-viewport"]');
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledOnce();
    expect(viewport?.closest('[inert]')).toBeNull();
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
  });
  it.each([false, true])(
    'hands off Git keyboard focus without stealing a newer focus (%s)',
    async (moved) => {
      let settle!: (accepted: boolean) => void;
      const admission = new Promise<boolean>((resolve) => {
        settle = resolve;
      });
      const frames: FrameRequestCallback[] = [];
      const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      const elsewhere = document.createElement('button');
      document.body.append(elsewhere);
      try {
        await renderShell({
          workspaceCommands: { onOpenProjectCode: () => admission },
          layout: {
            contextualWorkbench: {
              id: 'project-code',
              title: 'Project files',
              closeLabel: 'Close',
              panel: <div>Existing authority-owned Code</div>,
              requestClose: async () => true,
            },
          },
        });
        const git = container.querySelector<HTMLAnchorElement>(
          '[data-slot="shell-project-code-command"]'
        )!;
        await act(async () => git.focus());
        // jsdom does not synthesize the anchor's native Enter activation click.
        await act(async () => {
          fireEvent.click(git, { detail: 0 });
        });
        if (moved) await act(async () => elsewhere.focus());
        await act(async () => settle(true));
        await act(async () => frames.splice(0).forEach((callback) => callback(0)));
        const panel = container.querySelector('[data-slot="canvas-code-workspace-surface"]');
        expect(
          navigation
            .querySelector('[data-slot="canvas-code-main-tab"]')
            ?.getAttribute('aria-selected')
        ).toBe('true');
        expect(document.activeElement).toBe(moved ? elsewhere : panel);
      } finally {
        schedule.mockRestore();
        elsewhere.remove();
      }
    }
  );

  it('keeps workspace-file Code inside the preserved node Properties context', async () => {
    const onHideInspector = vi.fn();
    const onShowInspector = vi.fn();
    const onInspectNode = vi.fn();
    await renderShell({
      graph: {
        nodesWithImpact: [
          {
            id: 'dbt-model-1',
            type: 'dbtNode',
            position: { x: 0, y: 0 },
            data: {
              name: 'Model 1',
              pluginKind: 'dvt:transform',
              status: 'idle',
              path: 'models/model_1.sql',
              onInspectNode,
            },
          },
        ],
      },
      chromeCommands: { onHideInspector, onShowInspector },
    });

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            data: {
              canOpenNodeCode?: boolean;
              onInspectNode?: (nodeId: string, preferredTabId?: string) => void;
            };
          }>
        | undefined
    )?.[0];
    await act(async () => {
      forwardedNode?.data.onInspectNode?.('dbt-model-1', 'code');
    });

    expect(forwardedNode?.data.canOpenNodeCode).toBe(true);
    expect(onInspectNode).toHaveBeenCalledWith('dbt-model-1', 'code');
    expect(onHideInspector).not.toHaveBeenCalled();
    expect(onShowInspector).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="canvas-contextual-workbench-close"]')).toBeNull();
  });

  it.each([false, true])(
    'opens a bounded source preview and explicit errors (focus mode: %s)',
    async (focusMode) => {
      useUiLayoutStore.setState({ focusMode, bottomDrawerVisible: false });
      const previewSourceObjectRows = vi.fn().mockResolvedValue({
        contractVersion: 1,
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        rows: [{ values: ['1'] }],
        limit: 20,
        truncated: false,
        provenance: {
          mode: 'live' as const,
          sourceRefs: [
            {
              schemaVersion: 'connected-source-ref.v1' as const,
              connectionRef: {
                schemaVersion: 'connection-ref.v1' as const,
                connectionId: 'local-postgres-proof',
                provider: 'postgres',
              },
              sourceObjectId: 'relation/dvt/public/orders',
            },
          ],
          queriedAt: asIsoUtcString('2026-08-17T10:00:00.000Z'),
          limit: 20,
          navigation: 'bounded-first-page' as const,
        },
      });
      await renderShell({
        warehouseSourceDataSampleQuery: { previewSourceObjectRows },
        graph: {
          nodesWithImpact: [
            {
              id: 'source-orders',
              type: 'dbtNode',
              position: { x: 0, y: 0 },
              data: {
                name: 'orders',
                status: 'idle',
                metadata: {
                  connectedSourceRef: {
                    schemaVersion: 'connected-source-ref.v1',
                    connectionRef: {
                      schemaVersion: 'connection-ref.v1',
                      connectionId: 'postgresql-local',
                      provider: 'postgres',
                    },
                    sourceObjectId: 'relation/dvt/public/orders',
                  },
                },
              },
            },
          ],
        },
      });

      const forwardedNode = (
        getCanvasShellState().canvasViewportProps?.nodesWithImpact as
          | Array<{
              data: {
                onOpenSourceDataSample?: (nodeId: string) => void;
                dataActionLabel?: string;
              };
            }>
          | undefined
      )?.[0];
      await act(async () => {
        forwardedNode?.data.onOpenSourceDataSample?.('source-orders');
        await Promise.resolve();
      });

      expect(previewSourceObjectRows).toHaveBeenCalledWith({
        connectionId: 'postgresql-local',
        objectId: 'relation/dvt/public/orders',
        limit: 20,
      });
      expect(forwardedNode?.data.dataActionLabel).toBe('Preview');
      const sourceDataState = useOperationalDrawerContributionStore.getState();
      expect(sourceDataState.activeTab).toBe('data:source-orders');
      expect(
        sourceDataState.contribution?.tabs.find((tab) => tab.id === 'data:source-orders')
      ).toMatchObject({
        dataSample: { status: 'ready', nodeName: 'orders' },
      });
      expect(useUiLayoutStore.getState()).toMatchObject({
        focusMode: false,
        bottomDrawerVisible: true,
        bottomDrawerHeight: 300,
      });
      expect(
        useOperationalDrawerContributionStore
          .getState()
          .contribution?.tabs.find((tab) => tab.id === 'data:source-orders')?.dataSample
      ).toMatchObject({ status: 'ready', sample: { rows: [{ values: ['1'] }] } });

      previewSourceObjectRows.mockRejectedValueOnce(
        new WarehouseSourceDataSampleQueryError('source_object_not_found')
      );
      await act(async () => {
        forwardedNode?.data.onOpenSourceDataSample?.('source-orders');
        await Promise.resolve();
      });
      expect(
        useOperationalDrawerContributionStore
          .getState()
          .contribution?.tabs.find((tab) => tab.id === 'data:source-orders')?.dataSample
      ).toMatchObject({ status: 'error', reason: 'source_object_not_found' });
    }
  );

  it('projects persisted sink evidence without offering the retired row query', async () => {
    const runSnapshot = createRunPublicationSnapshot({ runId: 'run-1' });
    const { target } = runSnapshot.publication!;
    const sinkNodeData = {
      name: 'Sink 1',
      status: 'idle',
      role: 'output',
      pluginId: 'dvt',
      pluginKind: 'dvt:sink',
      metadata: {
        config: {
          connectionRef: target.connectionRef,
          schema: target.schema,
          table: target.relation,
          materialization: 'table',
          writeMode: 'replace',
        },
      },
    } satisfies DbtNodeData;
    const canonicalSink = {
      id: 'sink-1',
      name: sinkNodeData.name,
      pluginId: 'dvt',
      kind: 'dvt:sink',
      role: 'output',
      status: 'idle',
      tags: [],
      metadata: sinkNodeData.metadata,
    } satisfies CanonicalNode;
    const draftSinkNode = projectCanvasNodeAccessibleHealth({
      node: {
        id: canonicalSink.id,
        type: 'dbtNode',
        ariaLabel: 'Sink 1, Output',
        position: { x: 0, y: 0 },
        data: sinkNodeData,
      },
      canonicalNode: canonicalSink,
      data: sinkNodeData,
      graphNodeCardStrategies: [sharedSourceModelGraphNodeCardStrategy, dvtGraphNodeCardStrategy],
    });
    expect(draftSinkNode.ariaLabel).toBe('Sink 1, Output, Draft');

    await renderShell({
      panels: { activeRunId: 'run-1' },
      runSnapshot,
      graph: {
        nodesWithImpact: [draftSinkNode],
      },
    } as unknown as CanvasShellPropsOverrides);

    const forwardedNode = (
      getCanvasShellState().canvasViewportProps?.nodesWithImpact as
        | Array<{
            id: string;
            ariaLabel?: string;
            data: {
              rows?: number;
              durationMs?: number;
              lastRunAt?: string;
              runStatusByNodeId?: ReadonlyMap<string, string>;
              onOpenSourceDataSample?: (nodeId: string) => void;
            };
          }>
        | undefined
    )?.[0];
    await act(async () => {
      forwardedNode?.data.onOpenSourceDataSample?.('sink-1');
      await Promise.resolve();
    });

    expect(forwardedNode?.data).toMatchObject({
      rows: 3,
      durationMs: 1_000,
      lastRunAt: '2026-09-15T10:00:02.000Z',
    });
    expect(forwardedNode?.data.runStatusByNodeId?.get('sink-1')).toBe('completed');
    expect(forwardedNode?.ariaLabel).toBe('Sink 1, Output, Completed');
    expect(forwardedNode?.data.onOpenSourceDataSample).toBeUndefined();
    const sinkDataState = useOperationalDrawerContributionStore.getState();
    expect(
      sinkDataState.contribution?.tabs.find((tab) => tab.id === 'data:sink-1')
    ).toBeUndefined();
  });

  it('keeps both source samples when their responses finish out of order', async () => {
    const resolvers = new Map<string, (sample: SourceDataSample) => void>();
    const previewSourceObjectRows = vi.fn(
      ({ objectId }: { objectId: string }) =>
        new Promise<SourceDataSample>((resolve) => {
          resolvers.set(objectId, resolve);
        })
    );
    const connectedSourceRef = (table: string): ConnectedSourceRef => ({
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: 'postgresql-local',
        provider: 'postgres',
      },
      sourceObjectId: `relation/dvt/public/${table}`,
    });
    await renderShell({
      warehouseSourceDataSampleQuery: { previewSourceObjectRows },
      graph: {
        nodesWithImpact: ['orders', 'customers'].map((name) => ({
          id: `source-${name}`,
          type: 'dbtNode',
          position: { x: 0, y: 0 },
          data: {
            name,
            status: 'idle',
            metadata: { connectedSourceRef: connectedSourceRef(name) },
          },
        })),
      },
    });

    const forwardedNodes = getCanvasShellState().canvasViewportProps?.nodesWithImpact as Array<{
      data: { onOpenSourceDataSample?: (nodeId: string) => void };
    }>;
    await act(async () => {
      forwardedNodes[0]?.data.onOpenSourceDataSample?.('source-orders');
      forwardedNodes[1]?.data.onOpenSourceDataSample?.('source-customers');
    });

    const sample = (table: string): SourceDataSample => ({
      contractVersion: 1,
      connectionId: 'postgresql-local',
      objectId: `relation/dvt/public/${table}`,
      columns: [{ name: 'id', type: 'integer', nullable: false }],
      rows: [{ values: ['1'] }],
      limit: 20,
      truncated: false,
      provenance: {
        mode: 'live',
        sourceRefs: [connectedSourceRef(table)],
        queriedAt: asIsoUtcString('2026-08-17T10:00:00.000Z'),
        limit: 20,
        navigation: 'bounded-first-page',
      },
    });
    await act(async () => {
      resolvers.get('relation/dvt/public/customers')?.(sample('customers'));
      await Promise.resolve();
      resolvers.get('relation/dvt/public/orders')?.(sample('orders'));
      await Promise.resolve();
    });

    const dataState = useOperationalDrawerContributionStore.getState();
    expect(dataState.activeTab).toBe('data:source-customers');
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === 'data:source-orders')
    ).toMatchObject({
      dataSample: {
        status: 'ready',
        nodeName: 'orders',
        sample: { objectId: 'relation/dvt/public/orders' },
      },
    });
    expect(
      dataState.contribution?.tabs.find((tab) => tab.id === 'data:source-customers')
    ).toMatchObject({
      dataSample: {
        status: 'ready',
        nodeName: 'customers',
        sample: { objectId: 'relation/dvt/public/customers' },
      },
    });
  });

  it('keeps plain node click out of the application shell command contract', async () => {
    const props = await renderShell();

    expect('onNodeClick' in props.graphCommands).toBe(false);
    expect('onSelectionChange' in props.graphCommands).toBe(false);
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

  it('attaches the shell stylesheet to the stable horizontal panel group', async () => {
    await renderShell();

    const shellPanelGroup = container.querySelector('[data-slot="canvas-shell-panel-group"]');

    expect(shellPanelGroup).not.toBeNull();
    expect(shellPanelGroup?.getAttribute('id')).toBe('canvas-shell-horizontal-panels');
    expect(Array.from(shellPanelGroup?.classList ?? [])).toContain(styles.workspace);
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
      panels: { activeCanvasId: null, activeCanvas: null },
      layout: {
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

  it('retains the movable presentation for other contextual workbenches', async () => {
    await renderShell({
      layout: {
        contextualWorkbench: {
          id: 'output-expression',
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
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
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
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(container.querySelector('[data-testid="dbt-project-file-code-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
    expect(container.querySelector('[data-slot="canvas-contextual-workbench-overlay"]')).toBeNull();
    expect(
      container.querySelector('[data-testid="canvas-viewport"]')?.closest('[inert]')
    ).not.toBeNull();
  });
});
