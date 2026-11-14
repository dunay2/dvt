// @vitest-environment jsdom
/**
 * Owned concern: verify shell header composition.
 * Why: each suite protects one presentation contract.
 * Corner: existing negative paths and focus assertions remain intact.
 */
import './shell/ShellProjectMenu.commands.test-cases';
import './shell/ShellRunStatusIndicator.test-cases';
import './shell/ShellViewMenu.test-cases';
import './shell/ShellWorkspaceContext.test-cases';

import { fireEvent } from '@testing-library/dom';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { topAppBarClasses } from './shell/chrome';
import { buildShellNavigationModel, resolveShellRouteHeading } from '../shell/shellNavigationModel';
import { createShellTopBarHarness } from './shell/ShellTopBar.test-support';

describe('shell header composition', () => {
  const shell = createShellTopBarHarness();

  it('keeps project and file menus out of the header on every route', async () => {
    await act(async () => shell.root.render(shell.render('/canvas')));
    const header = shell.container.querySelector('[data-slot="shell-top-bar"]')!;
    expect(header.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(header.querySelector('[data-slot="shell-workspace-menu-trigger"]')).toBeNull();
  });

  it('renders an opted-in route heading in the existing identity area', async () => {
    const heading = resolveShellRouteHeading(buildShellNavigationModel([]), '/admin');
    await act(async () => {
      shell.root.render(shell.render('/admin', heading));
    });
    const title = shell.container.querySelector('[data-slot="shell-top-bar"] h1');
    expect(title?.textContent).toBe('Admin & RBAC');
    expect(title?.closest('[data-slot="shell-top-bar-context-cluster"]')).not.toBeNull();
    expect(shell.container.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(
      shell.container.querySelector('[data-slot="shell-workspace-menu-trigger"]')
    ).not.toBeNull();
    expect(
      shell.container
        .querySelector('[data-slot="shell-route-heading"] svg')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it('keeps the REST API health signal at the far right of the command cluster', async () => {
    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const commandCluster = shell.container.querySelector(
      '[data-slot="shell-top-bar-command-cluster"]'
    );
    const connectionStatus = commandCluster?.querySelector('[data-slot="shell-connection-status"]');
    const viewMenuTrigger = commandCluster?.querySelector('[data-slot="shell-menu-trigger"]');

    expect(commandCluster?.lastElementChild).toBe(connectionStatus);
    expect(connectionStatus?.previousElementSibling).toBe(viewMenuTrigger);
    // The pilot replaces the pictogram without losing a named, keyboard-reachable status.
    expect(connectionStatus?.querySelector('svg')).toBeNull();
    expect(connectionStatus?.textContent).toBe('');
    expect(connectionStatus?.getAttribute('role')).toBe('img');
    expect(connectionStatus?.getAttribute('aria-label')).toBeTruthy();
    expect(connectionStatus?.getAttribute('tabindex')).toBe('0');
  });

  it('renders active Canvas identity as workbench context without restoring legacy top-bar canvas controls', async () => {
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        activeCanvas: {
          id: 'transformation-canvas',
          kind: 'transformation',
          title: 'Transformation canvas',
        },
        canExportProjectSnapshot: true,
        canImportProjectSnapshot: true,
        onExportProjectSnapshot: () => undefined,
        onImportProjectSnapshotFile: () => undefined,
      },
    });

    await act(async () => {
      shell.root.render(shell.render('/canvas'));
    });

    const topBar = shell.container.querySelector('[data-slot="shell-top-bar"]');
    const activeCanvasIdentity = topBar?.querySelector(
      '[data-slot="shell-active-canvas-identity"]'
    );

    expect(activeCanvasIdentity).not.toBeNull();
    expect(topBar?.tagName).toBe('HEADER');
    expect(activeCanvasIdentity?.textContent).toContain('Transformation canvas');
    const canvasTab = activeCanvasIdentity?.querySelector('[role="tab"]');
    expect(canvasTab?.textContent).toBe('Transformation canvas');
    expect(canvasTab?.getAttribute('aria-selected')).toBe('true');
    expect(canvasTab?.classList.contains('workspace-navigation-tab')).toBe(true);
    expect(activeCanvasIdentity?.getAttribute('data-kind')).toBe('transformation');
    expect(activeCanvasIdentity?.getAttribute('data-canvas-id')).toBe('transformation-canvas');
    expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
    expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
    const contextCluster = topBar?.querySelector('[data-slot="shell-top-bar-context-cluster"]');
    const commandCluster = topBar?.querySelector('[data-slot="shell-top-bar-command-cluster"]');
    expect(topBar?.className).toBe(topAppBarClasses.shellBar);
    expect(contextCluster?.className).toBe(topAppBarClasses.contextCluster);
    expect(commandCluster?.className).toBe(topAppBarClasses.commandCluster);
  });

  it('opens Code directly without a project menu or a duplicate menu command', async () => {
    const onOpenProjectCode = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: false,
        canOpenProjectCode: true,
        onOpenProjectCode,
      },
    });
    await act(async () => shell.root.render(shell.render('/canvas')));
    await act(async () =>
      fireEvent.click(shell.container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    expect(onOpenProjectCode).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(
      document.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
    ).toBeNull();
  });
});
