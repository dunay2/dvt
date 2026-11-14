/**
 * Owned concern: mount shell presentation with isolated service and store lifetimes.
 * Why: tests must reset mounted UI and shared state between cases.
 * Corner: real Radix focus behavior remains mounted in jsdom.
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, vi } from 'vitest';
import { AppServicesProvider } from '../../services/AppServicesContext';
import { useSessionStore } from '../../stores/sessionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import { useCanvasWorkspaceMenuContributionStore } from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import { createAppServicesTestOverrides } from '../../../testing/appServicesTestDoubles';
import { resolveShellTopBarCopy } from './copy';
import {
  buildShellNavigationModel,
  type ShellRouteHeading,
} from '../../shell/shellNavigationModel';
import ShellTopBar from '../TopAppBar';
import { LeftNavigationRail } from '../LeftNavigation';
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

export function createShellTopBarHarness() {
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
  return {
    get container() {
      return container;
    },
    get root() {
      return root;
    },
    render: renderShellTopBar,
  };
}
