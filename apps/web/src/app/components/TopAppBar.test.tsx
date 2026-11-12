// @vitest-environment jsdom
/** Owned concern: verify ShellTopBar workspace context remains read-only in main chrome. */

import { fireEvent, waitFor } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppServicesProvider } from '../services/AppServicesContext';
import { useSessionStore } from '../stores/sessionStore';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../stores/applicationLanguageStore';
import type { OperationalDrawerContribution } from './shell/operationalDrawerContributionStore';
import { useOperationalDrawerContributionStore } from './shell/operationalDrawerContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';
import { createAppServicesTestOverrides } from '../../testing/appServicesTestDoubles';
import { resolveShellTopBarCopy } from './shell/copy';
import { topAppBarClasses } from './shell/chrome';
import {
  buildShellNavigationModel,
  resolveShellRouteHeading,
  type ShellRouteHeading,
} from '../shell/shellNavigationModel';
import ShellTopBar from './TopAppBar';
import { LeftNavigationRail } from './LeftNavigation';
import { Workflow } from 'lucide-react';

function TestNavigation(): JSX.Element {
  const language = useApplicationLanguageStore((state) => state.language);
  return (
    <LeftNavigationRail
      navigationModel={{
        ...buildShellNavigationModel([]),
        primaryItems: [
          { to: '/canvas', label: 'Canvas', icon: Workflow, source: 'runtime', level: 'core' },
        ],
      }}
      copy={resolveShellTopBarCopy(language)}
    />
  );
}

describe('ShellTopBar workspace context', () => {
  let container: HTMLDivElement;
  let root: Root;

  function renderShellTopBar(
    pathname: string,
    routeHeading: ShellRouteHeading | null = null
  ): JSX.Element {
    return (
      <AppServicesProvider overrides={createAppServicesTestOverrides()}>
        <MemoryRouter initialEntries={[pathname]}>
          <ShellTopBar routeHeading={routeHeading} />
          <TestNavigation />
        </MemoryRouter>
      </AppServicesProvider>
    );
  }

  beforeEach(() => {
    // jsdom has no layout observer; retain the real tooltip and its focus lifecycle.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
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
      availableWorkspaces: [],
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
        dataRowsLabel: 'rows',
        dataColumnsLabel: 'columns',
        dataNullValue: 'NULL',
        dataRefreshAction: 'Refresh',
        dataQueriedAtLabel: 'Queried at',
        dataBoundedLiveTemplate: 'Up to {limit} rows · First page only · No guaranteed row order.',
        tabsAriaLabel: 'Canvas operational drawer',
        severity: { info: 'Info', warning: 'Warning', error: 'Error' },
      },
      tabs: [
        { id: 'log', label: 'Log', count: null },
        { id: 'problems', label: 'Problems', count: 1 },
        { id: 'runs', label: 'Runs', count: 1 },
        { id: 'preview', label: 'Preview', count: 1 },
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
      ...overrides,
    };
  }

  // Project commands have one rail owner; recreating File in the header duplicates discovery.
  it('shows read-only context in the header and operational details only in properties', async () => {
    await act(async () => root.render(renderShellTopBar('/canvas')));
    const breadcrumb = container.querySelector('[data-slot="shell-workspace-breadcrumb"]');
    expect(breadcrumb).not.toBeNull();
    expect(breadcrumb?.closest('[data-slot="shell-top-bar"]')).not.toBeNull();
    expect(breadcrumb?.getAttribute('aria-label')).toBe('Workspace context');
    expect(breadcrumb?.textContent).toContain('acme-corp');
    expect(breadcrumb?.textContent).toContain('dbt-analytics');
    expect(breadcrumb?.querySelector('[aria-current="location"]')?.textContent).toBe('dev');
    expect(breadcrumb?.querySelector('a, button, input, [role="combobox"]')).toBeNull();
    expect(breadcrumb?.textContent).not.toContain('temporal');
    await act(async () =>
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!)
    );
    const properties = document.querySelector('[data-slot="shell-menu-workspace-context"]');
    expect(properties?.textContent).toContain('temporal');
    expect(properties?.querySelector('[data-slot="shell-workspace-tenant-context"]')).toBeNull();
    expect(document.querySelector('[data-slot="shell-workspace-context-details"]')).toBeNull();
  });

  // A scope change must update identity without leaving stale names in either entry point.
  it('tracks granted project names and falls back to raw ids after a scope change', async () => {
    const projectName = 'Analytics with a deliberately long project name';
    useSessionStore.setState({
      availableWorkspaces: [
        { tenantId: 'acme-corp', projectId: 'dbt-analytics', environmentId: 'dev', projectName },
      ],
    });
    await act(async () => root.render(renderShellTopBar('/canvas')));
    const breadcrumb = container.querySelector('[data-slot="shell-workspace-breadcrumb"]')!;
    expect(breadcrumb.textContent).toContain(projectName);
    expect(
      breadcrumb
        .querySelector('[data-slot="shell-workspace-project-context"]')
        ?.getAttribute('title')
    ).toBe(`Project: ${projectName}`);
    await act(async () =>
      useSessionStore.setState({ projectId: 'unlabelled-project', environmentId: 'staging' })
    );
    expect(breadcrumb.textContent).toContain('unlabelled-project');
    expect(breadcrumb.textContent).not.toContain(projectName);
    expect(breadcrumb.querySelector('[aria-current="location"]')?.textContent).toBe('staging');
    expect(
      container
        .querySelector('[data-slot="shell-workspace-menu-trigger"]')
        ?.getAttribute('aria-label')
    ).toContain('unlabelled-project');
  });

  it('keeps project and file menus out of the header on every route', async () => {
    await act(async () => root.render(renderShellTopBar('/canvas')));
    const header = container.querySelector('[data-slot="shell-top-bar"]')!;
    expect(header.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(header.querySelector('[data-slot="shell-workspace-menu-trigger"]')).toBeNull();
  });

  it('keeps one project context in the rail even on uncataloged routes', async () => {
    await act(async () => root.render(renderShellTopBar('/legacy')));
    const trigger = container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!;
    expect(trigger.closest('[data-slot="left-navigation-rail"]')).not.toBeNull();
    expect(trigger.getAttribute('aria-label')).toContain('dbt-analytics');
    expect(container.querySelectorAll('[data-slot="shell-workspace-menu-trigger"]')).toHaveLength(
      1
    );
    await act(async () => fireEvent.pointerDown(trigger));
    expect(
      container.querySelector('[data-slot="shell-workspace-breadcrumb"]')?.textContent
    ).toContain('dev');
    expect(container.querySelector('[data-slot="shell-top-bar"] [role="combobox"]')).toBeNull();
  });

  it('renders an opted-in route heading in the existing identity area', async () => {
    const heading = resolveShellRouteHeading(buildShellNavigationModel([]), '/admin');
    await act(async () => {
      root.render(renderShellTopBar('/admin', heading));
    });
    const title = container.querySelector('[data-slot="shell-top-bar"] h1');
    expect(title?.textContent).toBe('Admin & RBAC');
    expect(title?.closest('[data-slot="shell-top-bar-context-cluster"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(container.querySelector('[data-slot="shell-workspace-menu-trigger"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="shell-route-heading"] svg')?.getAttribute('aria-hidden')
    ).toBe('true');
  });

  it.each(['/canvas', '/runs/run_123'])(
    'keeps product workbench top bar low-noise on %s while separating workspace navigation from View controls',
    async (pathname) => {
      await act(async () => {
        root.render(renderShellTopBar(pathname));
      });

      const topBar = container.querySelector('[data-slot="shell-top-bar"]');
      const workspaceMenuTrigger = container.querySelector(
        '[data-slot="shell-workspace-menu-trigger"]'
      );

      expect(topBar?.querySelector('[data-slot="shell-project-identity-badge"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-workspace-context-trigger"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-git-ref"]')).toBeNull();
      expect(topBar?.querySelector('[data-slot="shell-top-bar-canvas-controls"]')).toBeNull();
      expect(workspaceMenuTrigger).not.toBeNull();
      expect(workspaceMenuTrigger?.getAttribute('aria-label')).toContain('Project properties');
      expect(workspaceMenuTrigger?.getAttribute('aria-label')).toContain('dbt-analytics');
      expect(topBar?.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
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

      expect(
        topBar?.querySelector('[data-slot="shell-brand-identity"]')?.getAttribute('aria-label')
      ).toBe('Raven');
      expect(topBar?.querySelector('[data-slot="shell-app-menu-trigger"]')).toBeNull();

      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' });
        fireEvent.pointerDown(
          container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!
        );
      });

      await waitFor(() => {
        expect(
          document.body.querySelectorAll('[data-slot="shell-menu-navigation-link"]')
        ).toHaveLength(0);
        expect(document.body.textContent).toContain('Project properties');
        expect(document.body.textContent).toContain('dbt-analytics');
        expect(document.body.textContent).toContain('dev');
        expect(document.body.textContent).toContain('Deployment adapter');
        expect(document.body.textContent).toContain('temporal');
        expect(document.body.textContent).toContain('Projects available in this session');
        expect(document.body.textContent).toContain(
          'No other project is available in this session.'
        );
        expect(
          document.body.querySelector('[data-slot="shell-new-project-command"]')
        ).not.toBeNull();
        expect(
          document.body.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
        ).toBeNull();
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
    // The pilot replaces the pictogram without losing a named, keyboard-reachable status.
    expect(connectionStatus?.querySelector('svg')).toBeNull();
    expect(connectionStatus?.textContent).toBe('');
    expect(connectionStatus?.getAttribute('role')).toBe('img');
    expect(connectionStatus?.getAttribute('aria-label')).toBeTruthy();
    expect(connectionStatus?.getAttribute('tabindex')).toBe('0');
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

  // The reason must remain discoverable without occupying header space or enabling Run.
  it('shows blocked Run readiness on focus without rendering a persistent header label', async () => {
    const contribution = buildCanvasRunContribution();
    useOperationalDrawerContributionStore.setState({
      contribution,
    });

    await act(async () => {
      root.render(renderShellTopBar('/canvas'));
    });

    const topBar = container.querySelector('[data-slot="shell-top-bar"]');
    const runStatus = topBar?.querySelector('[data-slot="shell-run-status-indicator"]');
    const runStatusLabel = topBar?.querySelector('[data-slot="shell-run-status-label"]');
    const runCommand = topBar?.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]');

    expect(runStatus).not.toBeNull();
    expect(runStatus?.textContent).not.toContain('Preview required');
    expect(runStatusLabel).toBeNull();
    expect(runStatus?.getAttribute('tabindex')).toBe('0');
    expect(runCommand).not.toBeNull();
    expect(runCommand?.textContent).toBe('Run');
    expect(runCommand?.disabled).toBe(true);
    expect(topBar?.textContent).not.toContain('Plan');
    await act(async () => (runStatus as HTMLElement).focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Preview required')
    );
    await act(async () => fireEvent.click(runCommand!));
    expect(contribution.runs.onStartRun).not.toHaveBeenCalled();
  });

  it('reveals disabled Run help on tap without invoking the command', async () => {
    // Touch users have no hover; the blocked command must still explain its prerequisite.
    const contribution = buildCanvasRunContribution();
    useOperationalDrawerContributionStore.setState({ contribution });
    await act(async () => root.render(renderShellTopBar('/canvas')));
    const target = container.querySelector<HTMLElement>(
      '[data-slot="shell-run-status-indicator"]'
    )!;
    await act(async () => fireEvent.click(target));
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Preview required')
    );
    expect(
      container.querySelector<HTMLButtonElement>('[data-slot="shell-run-command"]')?.disabled
    ).toBe(true);
    expect(contribution.runs.onStartRun).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(document, { key: 'Escape' }));
    await waitFor(() => expect(document.querySelector('[role="tooltip"]')).toBeNull());
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
    expect(runStatus?.textContent).not.toContain('Vista previa obligatoria');
    expect(runStatus?.getAttribute('aria-label')).toContain('Estado de ejecución del Canvas');
    expect(runCommand?.textContent).toContain('Ejecutar');
    expect(runCommand?.getAttribute('aria-label')).toBe('Ejecutar');
    await act(async () => (runStatus as HTMLElement).focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
        'Vista previa obligatoria'
      )
    );
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

    const runStatus = topBar?.querySelector('[data-slot="shell-run-status-indicator"]');
    expect(runStatus?.textContent).not.toContain('Ready');
    expect(runStatus?.getAttribute('tabindex')).toBeNull();
    expect(runCommand?.disabled).toBe(false);
    await act(async () => runCommand!.focus());
    await waitFor(() =>
      expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Ready')
    );

    await act(async () => {
      fireEvent.click(runCommand!);
    });

    expect(onStartRun).toHaveBeenCalledTimes(1);
  });

  it('keeps View recovery and project commands in focus mode without making the logo interactive', async () => {
    useUiLayoutStore.setState({ focusMode: true });
    await act(async () => {
      root.render(renderShellTopBar('/legacy'));
    });
    expect(container.querySelector('[data-slot="shell-workspace-menu-trigger"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="shell-file-menu-trigger"]')).toBeNull();
    expect(container.querySelector('[data-slot="shell-menu-trigger"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="shell-brand-identity"]')?.closest('button, a')
    ).toBeNull();
  });

  it('resolves Spanish shell copy for the menu and workspace context labels', () => {
    expect(resolveShellTopBarCopy('es-ES')).toMatchObject({
      shell: 'Vista',
      projectSettings: 'Propiedades del proyecto',
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

  it('opens the localized new-project dialog from Project and returns focus without changing scope', async () => {
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
    expect(
      container
        .querySelector('[data-slot="shell-workspace-menu-trigger"]')
        ?.getAttribute('aria-label')
    ).toContain('Propiedades del proyecto');
    await waitFor(() => {
      expect(document.body.querySelector('[data-slot="shell-language-menu"]')).toBeNull();
    });
  });

  it.each([false, true])(
    'honors View close focus ownership when a newer control received focus: %s',
    async (transferFocus) => {
      await act(async () => root.render(renderShellTopBar('/canvas')));
      const trigger = container.querySelector<HTMLButtonElement>(
        '[data-slot="shell-menu-trigger"]'
      )!;
      const nextControl = document.createElement('button');
      nextControl.textContent = 'Next workbench control';
      document.body.appendChild(nextControl);
      await act(async () => {
        trigger.focus();
        fireEvent.pointerDown(trigger);
      });
      const command = await waitFor(() => {
        const item = document.body.querySelector<HTMLElement>(
          '[data-slot="shell-language-option-es"]'
        );
        expect(item).not.toBeNull();
        return item!;
      });
      await act(async () => {
        fireEvent.click(command);
        if (transferFocus) nextControl.focus();
      });
      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      expect(useApplicationLanguageStore.getState().language).toBe('es');
      expect(document.body.querySelector('[data-slot="shell-language-menu"]')).toBeNull();
      expect(document.activeElement).toBe(transferFocus ? nextControl : trigger);
    }
  );

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
    await act(async () => root.render(renderShellTopBar('/canvas')));
    await act(async () =>
      fireEvent.click(container.querySelector('[data-slot="shell-project-code-command"]')!)
    );
    expect(onOpenProjectCode).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="menu"]')).toBeNull();
    expect(
      document.querySelector('[data-slot="canvas-workspace-open-project-code-command"]')
    ).toBeNull();
  });

  it('keeps unavailable Project snapshot commands disabled and never dispatches them', async () => {
    const rejectedCommand = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: false,
        canOpenProjectCode: false,
        onExportProjectSnapshot: rejectedCommand,
        onImportProjectSnapshotFile: rejectedCommand,
        onOpenProjectCode: rejectedCommand,
      },
    });
    await act(async () => root.render(renderShellTopBar('/canvas')));
    await act(async () => {
      fireEvent.pointerDown(container.querySelector('[data-slot="shell-workspace-menu-trigger"]')!);
    });
    const commands = await waitFor(() => {
      const entries = document.body.querySelectorAll<HTMLElement>(
        '[data-slot^="canvas-workspace-"][role="menuitem"]'
      );
      expect(entries).toHaveLength(2);
      return [...entries];
    });
    for (const command of commands) {
      expect(command.getAttribute('aria-disabled')).toBe('true');
      await act(async () => fireEvent.click(command));
    }
    expect(rejectedCommand).not.toHaveBeenCalled();
  });

  it('retains the snapshot receiver until selection, then closes Project and restores focus', async () => {
    const onImportProjectSnapshotFile = vi.fn();
    useCanvasWorkspaceMenuContributionStore.setState({
      contribution: {
        canExportProjectSnapshot: false,
        canImportProjectSnapshot: true,
        onImportProjectSnapshotFile,
      },
    });
    await act(async () => root.render(renderShellTopBar('/canvas')));
    const fileTrigger = container.querySelector<HTMLElement>(
      '[data-slot="shell-workspace-menu-trigger"]'
    )!;
    await act(async () => {
      fireEvent.pointerDown(fileTrigger);
    });
    const input = await waitFor(() => {
      const receiver = document.querySelector<HTMLInputElement>(
        '[data-slot="canvas-workspace-import-input"]'
      );
      expect(receiver).not.toBeNull();
      return receiver!;
    });
    const openPicker = vi.spyOn(input, 'click').mockImplementation(() => undefined);
    const command = document.querySelector<HTMLElement>(
      '[data-slot="canvas-workspace-import-command"]'
    )!;
    await act(async () => {
      command.focus();
      fireEvent.keyDown(command, { key: 'Enter', code: 'Enter' });
    });
    expect(openPicker).toHaveBeenCalledTimes(1);
    expect(input.isConnected).toBe(true);
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    await act(async () => fireEvent.change(input, { target: { files: [] } }));
    expect(input.isConnected).toBe(true);
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(onImportProjectSnapshotFile).not.toHaveBeenCalled();
    const file = new File(['{}'], 'project.json', { type: 'application/json' });
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
    expect(onImportProjectSnapshotFile).toHaveBeenCalledExactlyOnceWith(file);
    expect(input.value).toBe('');
    openPicker.mockRestore();
    await waitFor(() => {
      expect(input.isConnected).toBe(false);
      expect(fileTrigger.getAttribute('aria-expanded')).toBe('false');
      expect(document.activeElement).toBe(fileTrigger);
    });
    await act(async () => fireEvent.pointerDown(fileTrigger));
    const reopenedInput = await waitFor(() => {
      const receiver = document.querySelector<HTMLInputElement>(
        '[data-slot="canvas-workspace-import-input"]'
      );
      expect(receiver).not.toBeNull();
      return receiver!;
    });
    await act(async () => fireEvent.change(reopenedInput, { target: { files: [file] } }));
    expect(onImportProjectSnapshotFile).toHaveBeenCalledTimes(2);
    expect(onImportProjectSnapshotFile).toHaveBeenLastCalledWith(file);
    await waitFor(() => {
      expect(reopenedInput.isConnected).toBe(false);
      expect(document.activeElement).toBe(fileTrigger);
    });
  });
});
