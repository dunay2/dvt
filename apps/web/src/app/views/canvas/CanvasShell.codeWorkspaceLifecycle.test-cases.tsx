import { expect, it, vi } from 'vitest';
import { fireEvent, within } from '@testing-library/dom';
import { act } from 'react';
import { createCanvasShellHarness, getCanvasShellState } from './CanvasShell.testHarness';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import type { CanvasShellProps } from './canvasShell.types';
import { canvasViewCopy } from './copy';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { buildDbtProjectFileCodeWorkbench } from './dbtProjectFileCodeWorkbench';
import {
  requireGraphShellElement,
  type CanvasShellGraphSurfaceTestContext,
} from './CanvasShell.graphSurface.test-support';

/** Register the real Code owner lifecycle at the graph suite's original case position. */
export function registerCodeWorkspaceLifecycleCases(
  scope: () => CanvasShellGraphSurfaceTestContext
): void {
  it.each([true, false])(
    'opens the actual Code owner once from a route request (Canvas exists: %s)',
    async (hasCanvas) => {
      // Owner cleanup increments its intent on replay; transport must defer admission until replay ends.
      scope().unmountShell();
      const harness = createCanvasShellHarness({
        strictMode: true,
        initialEntries: [
          { pathname: '/canvas', state: { canvasWorkbench: 'code', foreign: 'retained' } },
        ],
      });
      scope().container = harness.container;
      scope().navigation = harness.navigation;
      scope().unmountShell = harness.unmount;
      const open = vi.spyOn(useCanvasInteractionStore.getState(), 'openContextualWorkbench');
      try {
        await harness.render(
          hasCanvas
            ? undefined
            : {
                panels: {
                  activeCanvasId: null,
                  activeCanvas: null,
                  canvasDocuments: [],
                  inspectorAuthoring: {
                    canEditNode: true,
                    onApplyNodeDraft: vi.fn(),
                    workspaceScope: {
                      tenantId: 'tenant',
                      projectId: 'project',
                      environmentId: 'dev',
                      targetAdapter: 'temporal',
                    },
                  },
                },
                layout: { surfaceStrategy: undefined },
              }
        );
        const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
        expect(editor).not.toBeNull();
        expect(editor?.closest('[inert]')).toBeNull();
        expect(
          scope().container.querySelectorAll('[data-testid="sql-context-workbench"]')
        ).toHaveLength(1);
        expect(
          scope()
            .navigation.querySelector('[data-slot="canvas-code-main-tab"]')
            ?.getAttribute('aria-selected')
        ).toBe('true');
        expect(open).toHaveBeenCalledOnce();
      } finally {
        open.mockRestore();
      }
    }
  );

  it.each([
    ['button', true],
    ['Delete', true],
    ['button', false],
  ] as const)(
    'closes Code and reopens from the rail (%s, Canvas exists: %s)',
    async (gesture, hasCanvas) => {
      const frames: FrameRequestCallback[] = [];
      const schedule = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        frames.push(callback);
        return frames.length;
      });
      try {
        const props = await scope().renderShell(
          hasCanvas
            ? undefined
            : {
                panels: {
                  activeCanvasId: null,
                  activeCanvas: null,
                  canvasDocuments: [],
                  inspectorAuthoring: {
                    canEditNode: true,
                    onApplyNodeDraft: vi.fn(),
                    workspaceScope: {
                      tenantId: 'tenant',
                      projectId: 'project',
                      environmentId: 'dev',
                      targetAdapter: 'temporal',
                    },
                  },
                },
                layout: { surfaceStrategy: undefined },
              }
        );
        const viewport = scope().container.querySelector('[data-testid="canvas-viewport"]');
        await act(async () =>
          fireEvent.click(
            scope().container.querySelector('[data-slot="shell-project-code-command"]')!
          )
        );
        const code = scope().navigation.querySelector<HTMLButtonElement>(
          '[data-slot="canvas-code-main-tab"]'
        )!;
        const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
        expect(editor).not.toBeNull();
        await act(async () => code.focus());
        const close = within(scope().navigation).getByRole('button', { name: 'Close: Code' });
        expect(close.getAttribute('data-slot')).toBe('canvas-code-tab-close');
        expect(close.closest('[role="tab"]')).toBeNull();
        expect(close.getAttribute('tabindex')).toBe('-1');
        expect(code.getAttribute('aria-keyshortcuts')).toBe('Delete');
        await act(async () => {
          if (gesture === 'button') fireEvent.click(close);
          else fireEvent.keyDown(code, { key: 'Delete' });
        });
        await act(async () => frames.splice(0).forEach((callback) => callback(0)));
        expectClosedCodeWorkspace(hasCanvas);
        const reopen =
          useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode;
        expect(reopen).toBeTypeOf('function');
        await act(async () => reopen?.());
        const reopened = scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]');
        expect(reopened).not.toBe(code);
        expect(reopened?.getAttribute('aria-selected')).toBe('true');
        expect(
          scope().navigation.querySelectorAll('[data-slot="canvas-code-main-tab"]')
        ).toHaveLength(1);
        expect(
          scope().container.querySelectorAll('[data-slot="canvas-code-workspace-surface"]')
        ).toHaveLength(1);
        expect(
          scope().container.querySelectorAll('[data-testid="sql-context-workbench"]')
        ).toHaveLength(1);
        expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).not.toBe(
          editor
        );
        expect(scope().container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
        expect(props.chromeCommands.onPreviewExecutionPlan).not.toHaveBeenCalled();
        expect(props.panels.inspectorAuthoring?.onApplyNodeDraft).not.toHaveBeenCalled();
      } finally {
        schedule.mockRestore();
      }
    }
  );

  it.each(['rejected', 'failed'] as const)('retains Code when its flush is %s', async (outcome) => {
    await scope().renderShell();
    await act(async () =>
      fireEvent.click(scope().container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    const code = scope().navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-code-main-tab"]'
    )!;
    const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
    const flush = getCanvasShellState().codeFlush;
    if (outcome === 'rejected') flush.mockResolvedValue(false);
    else flush.mockRejectedValue(new Error('File flush failed'));
    await act(async () =>
      fireEvent.click(scope().navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(flush).toHaveBeenCalledOnce();
    expect(scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBe(code);
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.closest('[inert]')).toBeNull();
  });

  it('keeps pending Code open and rejects a stale close after a newer Code activation', async () => {
    await scope().renderShell();
    await act(async () =>
      fireEvent.click(scope().container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    const code = scope().navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-code-main-tab"]'
    )!;
    const canvas = scope().navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-tab"]'
    )!;
    const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
    let settle!: (accepted: boolean) => void;
    getCanvasShellState().codeFlush.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        })
    );
    await act(async () =>
      fireEvent.click(scope().navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(editor?.closest('[inert]')).toBeNull();
    await act(async () => fireEvent.mouseDown(canvas, { button: 0 }));
    expect(canvas.getAttribute('aria-selected')).toBe('true');
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    await act(async () => settle(true));
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
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
        scope().renderShell({
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
      const code = scope().navigation.querySelector<HTMLButtonElement>(
        '[data-slot="canvas-code-main-tab"]'
      )!;
      await act(async () => fireEvent.mouseDown(code, { button: 0 }));
      const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
      expect(editor?.getAttribute('data-file-scope')).toBe('dbt-project-files');
      getCanvasShellState().codeFlush.mockResolvedValue(accepted);
      await act(async () =>
        fireEvent.click(scope().navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
      );
      expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
      expect(onClose).toHaveBeenCalledTimes(accepted ? 1 : 0);
      await renderOwner();
      if (accepted) {
        expect(scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
        expect(
          scope().container.querySelector('[data-slot="canvas-code-workspace-surface"]')
        ).toBeNull();
        expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
      } else {
        expect(scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBe(code);
        expect(code.getAttribute('aria-selected')).toBe('true');
        expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(
          editor
        );
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
    await scope().renderShell({
      workspaceCommands: { onOpenProjectCode: async () => true },
      layout: { contextualWorkbench: workbench },
    });
    const code = scope().navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-code-main-tab"]'
    )!;
    const canvas = scope().navigation.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-workspace-tab"]'
    )!;
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    const editor = scope().container.querySelector('[data-testid="sql-context-workbench"]');
    expect(editor?.getAttribute('data-file-scope')).toBe('dbt-project-files');
    let settle!: (accepted: boolean) => void;
    getCanvasShellState().codeFlush.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        })
    );
    await act(async () =>
      fireEvent.click(scope().navigation.querySelector('[data-slot="canvas-code-tab-close"]')!)
    );
    expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(code.getAttribute('aria-selected')).toBe('true');
    await act(async () => fireEvent.mouseDown(canvas, { button: 0 }));
    await act(async () => fireEvent.mouseDown(code, { button: 0 }));
    await act(async () => settle(true));
    expect(onClose).not.toHaveBeenCalled();
    expect(code.getAttribute('aria-selected')).toBe('true');
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor?.closest('[inert]')).toBeNull();
  });

  it('enters one retained project Code workspace from Git and the File menu', async () => {
    const { viewport, activityRail, shellRail, canvasEntry, editor, codeTab, files } =
      await openRetainedProjectCodeWorkspace();
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[0]!);
    });
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor.getAttribute('data-path')).toBe('notes/first.md');
    expect(editor.getAttribute('data-file-scope')).toBe('workspace-files');
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[1]!);
    });
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor.getAttribute('data-path')).toBe('notes/second.md');
    expect(editor.getAttribute('data-file-scope')).toBe('workspace-files');
    expect(scope().container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
    await act(async () => {
      fireEvent.mouseDown(scope().navigation.querySelector('[data-slot="canvas-workspace-tab"]')!, {
        button: 0,
      });
    });
    expect(viewport.closest('[inert]')).toBeNull();
    expect(editor.closest('[inert]')).not.toBeNull();
    expect(codeTab.getAttribute('aria-selected')).toBe('false');
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
    const revealCode =
      useCanvasWorkspaceMenuContributionStore.getState().contribution?.onOpenProjectCode;
    expect(revealCode).toBeTypeOf('function');
    await act(async () => revealCode?.());
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(editor.getAttribute('data-path')).toBe('notes/second.md');
    expect(editor.closest('[inert]')).toBeNull();
    expect(viewport.closest('[inert]')).not.toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    await act(async () => {
      useUiLayoutStore.getState().dispatchCanvasExplorer({ type: 'collapse' });
      fireEvent.click(canvasEntry);
    });
    expect(viewport.closest('[inert]')).toBeNull();
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    expect(getCanvasShellState().codeFlush).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(canvasEntry);
    });
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    expect(within(shellRail).getByRole('link', { name: 'Git' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
    expect(codeTab.getAttribute('aria-selected')).toBe('false');
    await act(async () => fireEvent.click(within(shellRail).getByRole('link', { name: 'Git' })));
    expect(within(scope().container).getByRole('navigation', { name: 'Navigation' })).toBe(
      activityRail
    );
    expect(scope().container.querySelector('[data-testid="canvas-viewport"]')).toBe(viewport);
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBe(editor);
    expect(scope().container.querySelector('[data-testid="project-files-explorer"]')).toBe(files);
    expect(editor.getAttribute('data-path')).toBe('notes/second.md');
    expect(viewport.closest('[inert]')).not.toBeNull();
  });

  it('delegates Git file requests to the authority-owned Code opener with its actual root', async () => {
    const onOpenProjectCode = vi.fn(async () => true);
    await scope().renderShell({
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
      fireEvent.click(scope().container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledExactlyOnceWith(undefined);
    onOpenProjectCode.mockClear();
    const files = scope().container.querySelector('[data-testid="project-files-explorer"]');
    expect(files?.getAttribute('data-project-root')).toBe('dbt/sales');
    await act(async () => {
      fireEvent.click(files!.querySelectorAll('button')[0]!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledExactlyOnceWith('notes/first.md');
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
  });

  it('keeps the graph active when the authority-owned Code opener rejects entry', async () => {
    const onOpenProjectCode = vi.fn(async () => false);
    await scope().renderShell({
      workspaceCommands: { projectRoot: 'dbt/sales', onOpenProjectCode },
    });
    const viewport = scope().container.querySelector('[data-testid="canvas-viewport"]');
    await act(async () => {
      fireEvent.click(scope().container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    expect(onOpenProjectCode).toHaveBeenCalledOnce();
    expect(viewport?.closest('[inert]')).toBeNull();
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
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
        await scope().renderShell({
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
        const git = scope().container.querySelector<HTMLAnchorElement>(
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
        const panel = scope().container.querySelector(
          '[data-slot="canvas-code-workspace-surface"]'
        );
        expect(
          scope()
            .navigation.querySelector('[data-slot="canvas-code-main-tab"]')
            ?.getAttribute('aria-selected')
        ).toBe('true');
        expect(document.activeElement).toBe(moved ? elsewhere : panel);
      } finally {
        schedule.mockRestore();
        elsewhere.remove();
      }
    }
  );

  async function openRetainedProjectCodeWorkspace(): Promise<{
    viewport: Element;
    activityRail: HTMLElement;
    shellRail: HTMLElement;
    canvasEntry: HTMLElement;
    editor: Element;
    codeTab: HTMLButtonElement;
    files: Element;
  }> {
    await scope().renderShell();
    expect(scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
    expect(
      scope().container.querySelector('[data-slot="canvas-code-workspace-surface"]')
    ).toBeNull();
    expect(scope().container.querySelector('[data-testid="project-files-explorer"]')).toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
    const viewport = requireGraphShellElement(
      scope().container.querySelector('[data-testid="canvas-viewport"]'),
      'viewport'
    );

    const activityRail = within(scope().container).getByRole('navigation', { name: 'Navigation' });
    const shellRail = scope().container.querySelector<HTMLElement>(
      '[data-slot="left-navigation-rail"]'
    )!;
    const canvasEntry = within(scope().container).getByRole('link', { name: 'Canvas' });
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('true');
    await act(async () => {
      fireEvent.click(scope().container.querySelector('[data-slot="shell-project-code-command"]')!);
    });
    const editor = requireGraphShellElement(
      scope().container.querySelector('[data-testid="sql-context-workbench"]'),
      'editor'
    );

    expect(editor).not.toBeNull();
    const codeTab = requireGraphShellElement(
      scope().navigation.querySelector<HTMLButtonElement>('[data-slot="canvas-code-main-tab"]'),
      'codeTab'
    );

    expect(codeTab.getAttribute('aria-selected')).toBe('true');
    const codePanel = requireGraphShellElement(
      document.getElementById(codeTab.getAttribute('aria-controls') ?? ''),
      'codePanel'
    );

    expect(codePanel).not.toBeNull();
    expect(codePanel.getAttribute('role')).toBe('tabpanel');
    expect(codePanel.getAttribute('aria-labelledby')).toBe(codeTab.id);
    expect(codePanel.contains(editor)).toBe(true);
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(true);
    expect(
      scope().container.querySelectorAll('[data-testid="project-files-explorer"]')
    ).toHaveLength(1);
    expect(viewport.closest('[inert]')).not.toBeNull();
    expect(activityRail.closest('[inert], [aria-hidden="true"]')).toBeNull();
    expect(within(scope().container).getByRole('navigation', { name: 'Navigation' })).toBe(
      activityRail
    );
    expect(within(activityRail).queryByRole('button', { name: 'Sources' })).toBeNull();
    expect(within(scope().container).queryByRole('button', { name: 'Elements' })).toBeNull();
    expect(within(shellRail).getByRole('link', { name: 'Git' })).not.toBeNull();
    expect(canvasEntry.getAttribute('aria-expanded')).toBe('false');
    expect(within(shellRail).getByRole('link', { name: 'Git' }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(
      scope().container.querySelector('[data-slot="canvas-contextual-workbench-overlay"]')
    ).toBeNull();
    const files = requireGraphShellElement(
      scope().container.querySelector('[data-testid="project-files-explorer"]'),
      'files'
    );

    expect(files).not.toBeNull();
    return { viewport, activityRail, shellRail, canvasEntry, editor, codeTab, files };
  }

  function expectClosedCodeWorkspace(hasCanvas: boolean): void {
    expect(getCanvasShellState().codeFlush).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(
      hasCanvas
        ? scope().navigation.querySelector('[data-slot="canvas-workspace-tab"]')
        : scope().container.querySelector('[data-slot="shell-project-code-command"]')
    );
    expect(
      scope().container.querySelector('[data-testid="canvas-viewport"]')?.closest('[inert]')
    ).toBeNull();
    expect(scope().navigation.querySelector('[data-slot="canvas-code-tab-close"]')).toBeNull();
    expect(scope().navigation.querySelector('[data-slot="canvas-code-main-tab"]')).toBeNull();
    expect(
      scope().container.querySelector('[data-slot="canvas-code-workspace-surface"]')
    ).toBeNull();
    expect(scope().container.querySelector('[data-testid="sql-context-workbench"]')).toBeNull();
    expect(getCanvasShellState().canvasViewportProps?.externalNodeSurfaceActive).toBe(false);
  }
}
