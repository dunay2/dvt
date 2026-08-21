// @vitest-environment jsdom
/** Owned concern: verify ShellTopBar workspace context remains read-only in main chrome. */

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildShellNavigationModel } from '../shell/shellNavigationModel';
import { AppServicesProvider } from '../services/AppServicesContext';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import type { OperationalDrawerContribution } from './shell/operationalDrawerContributionStore';
import { useOperationalDrawerContributionStore } from './shell/operationalDrawerContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { resolveShellTopBarCopy } from './shell/copy';
import ShellTopBar from './TopAppBar';

const TEST_NAVIGATION_MODEL = buildShellNavigationModel([]);

describe('ShellTopBar workspace context', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderShellTopBar(pathname: string): JSX.Element {
    return (
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <MemoryRouter initialEntries={[pathname]}>
          <ShellTopBar navigationModel={TEST_NAVIGATION_MODEL} />
        </MemoryRouter>
      </AppServicesProvider>
    );
  }

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    useSessionStore.setState({
      tenantId: 'acme-corp',
      projectId: 'dbt-analytics',
      environmentId: 'dev',
      targetAdapter: 'temporal',
      availableTargetAdapters: ['temporal'],
    });
    useUiLayoutStore.setState({ focusMode: false });
    useApplicationLanguageStore.setState({ language: 'en' });
    useOperationalDrawerContributionStore.setState({ activeTab: 'log', contribution: null });
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    useOperationalDrawerContributionStore.setState({ activeTab: 'log', contribution: null });
    useCanvasWorkspaceMenuContributionStore.setState({ contribution: null });
    container.remove();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  function buildCanvasRunContribution(
    overrides?: Partial<OperationalDrawerContribution>
  ): OperationalDrawerContribution {
    const onStartRun = vi.fn();

    return {
      source: 'canvas',
      title: 'Canvas operations',
      copy: {
        problemsAriaLabel: 'Canvas problems',
        noProblemsMessage: 'No current Canvas problems.',
        runsAriaLabel: 'Canvas runs',
        runReadyStatus: 'Run ready',
        runBlockedStatus: 'Run blocked',
        runActiveStatus: 'Active run',
        previewAriaLabel: 'Canvas execution preview',
        previewAction: 'Create Execution Preview',
        previewReadyStatus: 'Preview ready',
        previewBlockedStatus: 'Preview blocked',
        dataAriaLabel: 'Source data sample',
        dataIdleMessage: 'Open a source sample.',
        dataLoadingTemplate: 'Loading {nodeName}.',
        dataEmptyTemplate: '{nodeName} returned no rows.',
        dataConnectionNotFoundTemplate: 'Connection missing for {nodeName}.',
        dataSourceObjectNotFoundTemplate: 'Object missing for {nodeName}.',
        dataUnavailableTemplate: 'Sample unavailable for {nodeName}.',
        dataUnknownErrorTemplate: 'Sample failed for {nodeName}.',
        dataTruncatedTemplate: 'Showing {limit} rows.',
        dataCaptionTemplate: 'Sample from {nodeName}',
        dataNullValue: 'NULL',
        tabsAriaLabel: 'Canvas operational drawer',
        severity: { info: 'Info', warning: 'Warning', error: 'Error' },
      },
      tabs: [
        { id: 'log', label: 'Log', count: null },
        { id: 'problems', label: 'Problems', count: 1 },
        { id: 'runs', label: 'Runs', count: 1 },
        { id: 'preview', label: 'Preview', count: 1 },
        { id: 'data', label: 'Data', count: null },
      ],
      problems: {
        items: [],
      },
      runs: {
        activeRunId: null,
        canStartRun: false,
        controls: null,
        onStartRun,
        status: 'blocked',
        summary: 'Preview required before running.',
      },
      preview: {
        status: 'blocked',
        summary: 'Preview required before running.',
        blockers: ['plan_integrity'],
        canPreview: true,
        onPreviewExecutionPlan: vi.fn(),
        selectionRecovery: null,
      },
      dataSample: { status: 'idle' },
      ...overrides,
    };
  }

  it('keeps workspace scope as read-only context in uncataloged global top-bar chrome', async () => {
    await act(async () => {
      root.render(renderShellTopBar('/legacy'));
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const identityBadge = container.querySelector('[data-slot="shell-project-identity-badge"]');
    const contextTrigger = container.querySelector('[data-slot="shell-workspace-context-trigger"]');

    expect(identityBadge).not.toBeNull();
    expect(identityBadge?.textContent).toContain('dbt-analytics');
    expect(identityBadge?.textContent).toContain('dev');
    expect(contextTrigger).not.toBeNull();
    expect(contextTrigger?.textContent).toContain('Workspace context');
    expect(topBar?.querySelector('[data-slot="shell-workspace-selectors"]')).toBeNull();
    expect(topBar?.querySelectorAll('[role="combobox"]')).toHaveLength(0);
  });

  it.each(['/canvas', '/runs/run_123'])(
    'keeps product workbench top bar low-noise on %s while separating workspace navigation from View controls',
    async (pathname) => {
      await act(async () => {
        root.render(renderShellTopBar(pathname));
      });

      const topBar = container.querySelector('[data-slot="shell-top-bar"]');
      const workspaceMenuTrigger = topBar?.querySelector(
        '[data-slot="shell-workspace-menu-trigger"]'
      );

      expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-git-ref"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
      expect(workspaceMenuTrigger).not.toBeNull();
      expect(workspaceMenuTrigger?.textContent).toContain('Project');
      expect(workspaceMenuTrigger?.textContent).toContain('dbt-analytics');
      expect(topBar?.querySelector('[data-slot="shell-menu-trigger"]')).not.toBeNull();

      await act(async () => {
        fireEvent.pointerDown(container.querySelector('[data-slot="shell-menu-trigger"]')!);
      });

      await waitFor(() => {
        expect(document.body.textContent).toContain('View options');
        expect(document.body.textContent).toContain('Panels');
        expect(
          document.body.querySelectorAll('[data-slot="shell-menu-navigation-link"]')
        ).toHaveLength(0);
        expect(document.body.textContent).not.toContain('Workspace context');
      });

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.pointerDown(
          container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
        );
      });

      await waitFor(() => {
        const menuLinks = [
          ...document.body.querySelectorAll<HTMLAnchorElement>(
            '[data-slot="shell-menu-navigation-link"]'
          ),
        ];

        expect(menuLinks.map((link) => link.getAttribute('href'))).toEqual(['/plugins', '/admin']);
        expect(document.body.textContent).toContain('Workspace context');
        expect(document.body.textContent).toContain('dbt-analytics');
        expect(document.body.textContent).toContain('dev');
        expect(document.body.textContent).toContain('Deployment adapter');
        expect(document.body.textContent).toContain('temporal');
        expect(document.body.textContent).toContain('Projects available in this session');
        expect(document.body.textContent).toContain(
          'No other project is available in this session.'
        );
        expect(document.body.textContent).toContain('New project…');
        expect(document.body.querySelector('[data-slot="shell-menu-git-context"]')).toBeNull();
      });
    }
  );

  it('keeps the REST API health signal at the far right of the command cluster', async () => {
    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const commandCluster = container.querySelector('[data-slot="shell-top-bar-command-cluster"]');
    const connectionStatus = commandCluster?.querySelector('[data-slot="shell-connection-status"]');
    const viewMenuTrigger = commandCluster?.querySelector('[data-slot="shell-menu-trigger"]');

    expect(commandCluster?.lastElementChild).toBe(connectionStatus);
    expect(connectionStatus?.previousElementSibling).toBe(viewMenuTrigger);
  });

  it('keeps Canvas properties out of the global View menu', async () => {
    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    await act(async () => {
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-menu-trigger"]')!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Panels');
      expect(document.body.textContent).toContain('Language');
      expect(document.body.textContent).not.toContain('Canvas background');
      expect(document.body.textContent).not.toContain('Grid size');
      expect(document.body.textContent).not.toContain('Reset grid');
      expect(document.body.textContent).not.toContain('Canvas properties');
      expect(document.body.textContent).not.toContain('Layout');
    });
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
      root.render(renderShellTopBar('/canvas'));
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const activeCanvasIdentity = topBar?.querySelector(
      '[data-slot="shell-active-canvas-identity"]'
    );

    expect(activeCanvasIdentity).not.toBeNull();
    expect(topBar?.tagName).toBe('HEADER');
    expect(activeCanvasIdentity?.textContent).toContain('Transformation canvas');
    expect(activeCanvasIdentity?.getAttribute('data-kind')).toBe('transformation');
    expect(activeCanvasIdentity?.getAttribute('data-canvas-id')).toBe('transformation-canvas');
    expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
    expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
    expect(topBar?.className).toContain('flex-wrap');
    expect(
      topBar?.querySelector('[data-slot="shell-top-bar-context-cluster"]')?.className
    ).toContain('w-full');
    expect(
      topBar?.querySelector('[data-slot="shell-top-bar-command-cluster"]')?.className
    ).toContain('w-full');
    expect(
      topBar?.querySelector('[data-slot="shell-top-bar-command-cluster"]')?.className
    ).toContain('flex-wrap');
  });

  it('renders Canvas run readiness as compact top-bar status without restoring Plan chrome', async () => {
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasRunContribution(),
    });

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const runStatus = topBar?.querySelector('[data-slot="shell-run-status-indicator"]');
    const runStatusLabel = topBar?.querySelector('[data-slot="shell-run-status-label"]');
    const runCommand = topBar?.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]');

    expect(runStatus).not.toBeNull();
    expect(runStatus?.textContent).toContain('Preview required');
    expect(runStatus?.className).toContain('shrink-0');
    expect(runStatusLabel?.className).not.toContain('hidden');
    expect(runStatusLabel?.className).toContain('whitespace-nowrap');
    expect(runStatusLabel?.className).not.toContain('truncate');
    expect(runCommand).not.toBeNull();
    expect(runCommand?.textContent).toBe('Run');
    expect(runCommand?.disabled).toBe(true);
    expect(topBar?.textContent).not.toContain('Plan');
  });

  it('localizes Canvas run status, command, and accessible name from the application preference', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasRunContribution(),
    });

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const runStatus = container.querySelector('[data-slot="shell-run-status-indicator"]');
    const runCommand = container.querySelector<HTMLButtonElement>(
      '[data-slot="shell-run-command"]'
    );
    expect(runStatus?.textContent).toContain('Vista previa obligatoria');
    expect(runStatus?.getAttribute('aria-label')).toContain('Estado de ejecución del Canvas');
    expect(runCommand?.textContent).toContain('Ejecutar');
    expect(runCommand?.getAttribute('aria-label')).toBe('Ejecutar');
  });

  it('routes the compact top-bar Run command through the Canvas operational contribution', async () => {
    const onStartRun = vi.fn();
    useOperationalDrawerContributionStore.setState({
      contribution: buildCanvasRunContribution({
        tabs: [
          { id: 'log', label: 'Log', count: null },
          { id: 'problems', label: 'Problems', count: 0 },
          { id: 'runs', label: 'Runs', count: null },
          { id: 'preview', label: 'Preview', count: null },
          { id: 'data', label: 'Data', count: null },
        ],
        runs: {
          activeRunId: null,
          canStartRun: true,
          controls: null,
          onStartRun,
          status: 'ready',
          summary: 'Run is ready after the current execution preview.',
        },
        preview: {
          status: 'ready',
          summary: 'Preview ready.',
          blockers: [],
          canPreview: true,
          onPreviewExecutionPlan: vi.fn(),
          selectionRecovery: null,
        },
      }),
    });

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const runCommand = topBar?.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]');

    expect(
      topBar?.querySelector('[data-slot="shell-run-status-indicator"]')?.textContent
    ).toContain('Ready');
    expect(runCommand?.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(runCommand!);
    });

    expect(onStartRun).toHaveBeenCalledTimes(1);
  });

  it('exposes workspace navigation when focus mode hides the global route rail', async () => {
    useUiLayoutStore.setState({ focusMode: true });

    await act(async () => {
      root.render(renderShellTopBar('/legacy'));
    });

    const workspaceMenuTrigger = container.querySelector(
      '[data-slot="shell-workspace-menu-trigger"]'
    );

    expect(workspaceMenuTrigger).not.toBeNull();

    await act(async () => {
      fireEvent.pointerDown(workspaceMenuTrigger!);
    });

    await waitFor(() => {
      const menuLinks = [
        ...document.body.querySelectorAll<HTMLAnchorElement>(
          '[data-slot="shell-menu-navigation-link"]'
        ),
      ];

      expect(menuLinks.map((link) => link.getAttribute('href'))).toEqual(['/plugins', '/admin']);
    });
  });

  it('resolves Spanish shell copy for the menu and workspace context labels', () => {
    expect(resolveShellTopBarCopy('es-ES')).toMatchObject({
      shell: 'Vista',
      workspaceMenu: 'Espacio de trabajo',
      globalNavigation: 'Navegación',
      workspaceContext: 'Contexto del proyecto',
      projectScope: 'Proyecto',
      environmentScope: 'Entorno',
      deploymentScope: 'Adaptador de despliegue',
      canvasColorHexValue: 'Valor hexadecimal',
      canvasColorInputLabel: 'Establecer el color hexadecimal del fondo del Canvas',
      gridSize: 'Tamaño de rejilla',
      gridDensityDefault: 'Predeterminada',
    });
  });

  it('opens the localized new-project dialog from the active Project menu and cancels cleanly', async () => {
    useApplicationLanguageStore.getState().configureApplicationLanguage('es');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            tenants: [{ tenantId: 'acme-corp', canCreateProject: true }],
            projects: [],
            integrityFindings: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
    );

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const projectMenuTrigger = container.querySelector<HTMLElement>(
      '[data-slot="shell-workspace-menu-trigger"]'
    );
    await act(async () => {
      fireEvent.pointerDown(projectMenuTrigger!);
    });

    const newProjectCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>(
        '[data-slot="shell-new-project-command"]'
      );
      expect(command?.textContent).toContain('Nuevo proyecto');
      return command!;
    });

    await act(async () => {
      fireEvent.click(newProjectCommand);
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="project-creation-dialog"]')).not.toBeNull();
      expect(document.body.textContent).toContain('Crea un proyecto');
    });
    expect(document.body.textContent).not.toContain('Tenant');

    const cancelButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === 'Cancelar'
    );
    await act(async () => {
      fireEvent.click(cancelButton!);
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="project-creation-dialog"]')).toBeNull();
      expect(document.activeElement).toBe(projectMenuTrigger);
    });
    expect(useSessionStore.getState().projectId).toBe('dbt-analytics');
  });

  it('changes the application language from the View menu without reloading', async () => {
    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    await act(async () => {
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-menu-trigger"]')!);
    });

    await waitFor(() => {
      expect(document.body.textContent).toContain('Language');
      const menu = document.body.querySelector<HTMLElement>('[data-slot="shell-language-menu"]');
      expect(menu).not.toBeNull();
    });

    const spanishLanguageCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>(
        '[data-slot="shell-language-option-es"]'
      );
      expect(command).not.toBeNull();
      return command as HTMLElement;
    });

    await act(async () => {
      fireEvent.click(spanishLanguageCommand!);
    });

    expect(useApplicationLanguageStore.getState().language).toBe('es');
    expect(container.querySelector('[data-slot="shell-menu-trigger"]')?.textContent).toContain(
      'Vista'
    );
    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="shell-language-menu"]')).toBeNull();
    });
  });

  it('dismisses the Workspace menu when keyboard selection opens project code', async () => {
    const onOpenProjectCode = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: false,
        canOpenProjectCode: true,
        onExportProjectSnapshot: vi.fn(),
        onImportProjectSnapshotFile: vi.fn(),
        onOpenProjectCode,
      },
    });

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });
    const workspaceMenuTrigger = container.querySelector<HTMLElement>(
      '[data-slot="shell-workspace-menu-trigger"]'
    );
    await act(async () => {
      fireEvent.pointerDown(workspaceMenuTrigger!);
    });

    const projectCodeCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>(
        '[data-slot="canvas-workspace-open-project-code-command"]'
      );
      expect(command).not.toBeNull();
      return command as HTMLElement;
    });

    await act(async () => {
      projectCodeCommand.focus();
      fireEvent.keyDown(projectCodeCommand, { key: 'Enter', code: 'Enter' });
      fireEvent.keyUp(projectCodeCommand, { key: 'Enter', code: 'Enter' });
    });

    expect(onOpenProjectCode).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        document.body.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
      ).toBeNull();
    });
    expect(document.activeElement).not.toBe(workspaceMenuTrigger);
  });

  it('opens an About dialog from the Raven application menu with compiled version metadata', async () => {
    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    await act(async () => {
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-app-menu-trigger"]')!);
    });

    const aboutCommand = await waitFor(() => {
      const command = document.body.querySelector<HTMLElement>('[data-slot="shell-about-command"]');

      expect(command).not.toBeNull();
      return command;
    });

    await act(async () => {
      fireEvent.click(aboutCommand!);
    });

    const aboutDialog = await waitFor(() => {
      const dialog = document.body.querySelector<HTMLElement>('[data-slot="shell-about-dialog"]');

      expect(dialog).not.toBeNull();
      return dialog;
    });

    expect(aboutDialog!.textContent).toContain('Compiled version');
    expect(aboutDialog!.textContent).toMatch(/0\.0\.0|[0-9]+\.[0-9]+\.[0-9]+/);

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="shell-about-dialog"]')).toBeNull();
    });
  });
});
