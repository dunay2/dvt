// @vitest-environment jsdom
/** Owned concern: verify direct shell navigation and the real About focus lifecycle. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { MemoryRouter, useLocation } from 'react-router';
import { Activity, Workflow } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeftNavigationRail } from './LeftNavigation';
import { resolveShellTopBarCopy } from './shell/copy';
import {
  buildShellNavigationModel,
  type ShellNavigationModel,
} from '../shell/shellNavigationModel';
import { ShellActivityRailProvider } from './shell/ShellActivityRail';
import { CanvasExplorer } from '../views/canvas/explorer/CanvasExplorer';
import { useUiLayoutStore } from '../stores/uiLayoutStore';
import { useCanvasWorkspaceMenuContributionStore } from '../views/canvas/canvasWorkspaceMenuContributionStore';

const model: ShellNavigationModel = {
  primaryItems: [{ to: '/runs', label: 'Runs', icon: Activity, source: 'runtime', level: 'core' }],
  footerItems: [],
};
let container: HTMLDivElement;
let root: Root;
beforeEach(async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  // jsdom has no layout observer; this is only the Tooltip DOM capability.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
  );
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/runs/active']}>
        <LeftNavigationRail navigationModel={model} copy={resolveShellTopBarCopy('en')} />
      </MemoryRouter>
    );
  });
});
afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  useCanvasWorkspaceMenuContributionStore.setState({ contribution: null, modelTab: null });
  vi.unstubAllGlobals();
});

describe('Direct shell navigation', () => {
  it('opens Admin sections from the persistent icon instead of a direct route link', async () => {
    // The operator requested a section menu at the icon; flat navigation cannot expose that choice.
    let observedLocation: ReturnType<typeof useLocation>;
    function SectionLocationProbe(): null {
      observedLocation = useLocation();
      return null;
    }
    await act(async () => {
      root.render(
        <MemoryRouter key="admin-sections" initialEntries={['/admin?view=compact#events']}>
          <LeftNavigationRail
            navigationModel={buildShellNavigationModel([])}
            copy={resolveShellTopBarCopy('en')}
          />
          <SectionLocationProbe />
        </MemoryRouter>
      );
    });
    const admin = within(container).getByRole('button', { name: 'Admin' });
    expect(admin.getAttribute('aria-haspopup')).toBe('menu');
    expect(admin.getAttribute('href')).toBeNull();
    expect(admin.getAttribute('aria-current')).toBe('page');
    await act(async () => {
      admin.focus();
      fireEvent.keyDown(admin, { key: 'ArrowDown' });
    });
    await waitFor(() => expect(within(document.body).getAllByRole('menuitem')).toHaveLength(4));
    expect(
      within(document.body).getByRole('menuitem', { name: 'Platform' }).getAttribute('aria-current')
    ).toBe('page');
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    await waitFor(() => expect(document.activeElement).toBe(admin));
    await act(async () => {
      fireEvent.keyDown(admin, { key: 'ArrowDown' });
    });
    const audit = await waitFor(() =>
      within(document.body).getByRole('menuitem', { name: 'Audit Log' })
    );
    await act(async () => {
      fireEvent.click(audit);
    });
    expect(observedLocation!.pathname).toBe('/admin');
    expect(observedLocation!.search).toBe('?view=compact&tab=audit');
    expect(observedLocation!.hash).toBe('#events');
    expect(within(container).getByRole('button', { name: 'Admin' })).toBe(admin);
  });
  it('keeps one Git entry across routes and delegates current Canvas activation without navigation', async () => {
    // Git belongs to shell lifetime; the route callback is used only while its owner is mounted.
    const navigationModel: ShellNavigationModel = {
      ...model,
      primaryItems: [
        { to: '/canvas', label: 'Canvas', icon: Workflow, source: 'runtime', level: 'core' },
        ...model.primaryItems,
      ],
    };
    let observedLocation: ReturnType<typeof useLocation>;
    function LocationProbe(): null {
      observedLocation = useLocation();
      return null;
    }
    await act(async () => {
      root.render(
        <MemoryRouter key="persistent-git" initialEntries={['/runs']}>
          <LeftNavigationRail
            navigationModel={navigationModel}
            copy={resolveShellTopBarCopy('en')}
          />
          <LocationProbe />
        </MemoryRouter>
      );
    });
    const rail = container.querySelector('[data-slot="left-navigation-rail"]');
    const git = within(container).getByRole('link', { name: 'Git' });
    expect(git.getAttribute('href')).toBe('/canvas');
    await act(async () => {
      fireEvent.click(git);
    });
    expect(observedLocation!.pathname).toBe('/canvas');
    expect(observedLocation!.state).toEqual({ canvasWorkbench: 'code' });
    expect(container.querySelector('[data-slot="left-navigation-rail"]')).toBe(rail);
    expect(within(container).getByRole('link', { name: 'Git' })).toBe(git);
    const onOpenProjectCode = vi.fn();
    await act(async () => {
      useCanvasWorkspaceMenuContributionStore.setState({
        contribution: {
          canExportProjectSnapshot: false,
          canImportProjectSnapshot: false,
          canOpenProjectCode: true,
          onOpenProjectCode,
        },
      });
    });
    const location = observedLocation!;
    await act(async () => {
      fireEvent.click(git);
    });
    expect(onOpenProjectCode).toHaveBeenCalledOnce();
    expect(observedLocation!).toBe(location);
    await act(async () => {
      fireEvent.click(within(container).getByRole('link', { name: 'Runs' }));
    });
    expect(observedLocation!.pathname).toBe('/runs');
    expect(within(container).getByRole('link', { name: 'Git' })).toBe(git);
  });

  it('preserves modified link activation and navigates from another route before opening Elements', async () => {
    const canvasModel: ShellNavigationModel = {
      primaryItems: [
        { to: '/canvas', label: 'Canvas', icon: Workflow, source: 'runtime', level: 'core' },
      ],
      footerItems: [],
    };
    await act(async () => {
      useUiLayoutStore.setState({ canvasExplorer: { mode: 'closed', widthPercent: 31 } });
      root.render(
        <MemoryRouter key="navigation" initialEntries={['/runs']}>
          <LeftNavigationRail navigationModel={canvasModel} copy={resolveShellTopBarCopy('en')} />
        </MemoryRouter>
      );
    });
    const canvas = within(container).getByRole('link', { name: 'Canvas' });
    await act(async () => {
      fireEvent.click(canvas);
    });
    expect(canvas.getAttribute('aria-current')).toBe('page');
    expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('closed');
    for (const modifier of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey'] as const) {
      let preventedBeforeBrowserDefault = true;
      // Observe after React's root handler, then prevent jsdom's unsupported browser navigation.
      document.addEventListener(
        'click',
        (event) => {
          preventedBeforeBrowserDefault = event.defaultPrevented;
          event.preventDefault();
        },
        { once: true }
      );
      await act(async () => {
        fireEvent.click(canvas, { [modifier]: true });
      });
      expect(preventedBeforeBrowserDefault).toBe(false);
      expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('closed');
    }
    await act(async () => {
      fireEvent.click(canvas);
    });
    expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('expanded');
  });

  it.each(['collapsed', 'closed'] as const)(
    'opens the %s Elements dock from the single Canvas entry without toggling or remounting',
    async (mode) => {
      const canvasModel: ShellNavigationModel = {
        primaryItems: [
          { to: '/canvas', label: 'Canvas', icon: Workflow, source: 'runtime', level: 'core' },
        ],
        footerItems: [],
      };
      await act(async () => {
        useUiLayoutStore.setState({ canvasExplorer: { mode, widthPercent: 31 } });
        root.render(
          <MemoryRouter key={mode} initialEntries={['/canvas']}>
            <ShellActivityRailProvider>
              <LeftNavigationRail
                navigationModel={canvasModel}
                copy={resolveShellTopBarCopy('en')}
              />
              <CanvasExplorer
                elements={<input aria-label="Element search" defaultValue="retained" />}
              >
                <div data-testid="retained-graph">Graph</div>
              </CanvasExplorer>
            </ShellActivityRailProvider>
          </MemoryRouter>
        );
      });
      const canvas = within(container).getByRole('link', { name: 'Canvas' });
      const graph = container.querySelector('[data-testid="retained-graph"]');
      const search = container.querySelector('input');
      await act(async () => {
        fireEvent.click(canvas);
      });
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
        mode: 'expanded',
        widthPercent: 31,
      });
      expect(within(container).queryByRole('button', { name: 'Elements' })).toBeNull();
      expect(within(container).getByRole('region', { name: 'Elements' }).contains(search)).toBe(
        true
      );
      expect(canvas.getAttribute('aria-expanded')).toBe('true');
      await act(async () => {
        fireEvent.click(canvas);
        fireEvent.doubleClick(canvas);
      });
      expect(useUiLayoutStore.getState().canvasExplorer).toEqual({
        mode: 'expanded',
        widthPercent: 31,
      });
      expect(container.querySelector('[data-testid="retained-graph"]')).toBe(graph);
      expect(container.querySelector('input')).toBe(search);
      expect(search?.value).toBe('retained');
      await act(async () => {
        fireEvent.click(within(container).getByRole('button', { name: 'Collapse explorer' }));
      });
      expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('collapsed');
      expect(document.activeElement).toBe(canvas);
    }
  );

  it('renders exactly the supplied destinations with link activity and accessible icon names', () => {
    const links = within(container).getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute('href')).toBe('/runs');
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(links[0]?.getAttribute('aria-expanded')).toBeNull();
    expect(within(container).getByRole('link', { name: 'Runs' })).toBe(links[0]);
    expect(links[0]?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(within(container).queryByRole('link', { name: 'Admin' })).toBeNull();
  });

  it('opens compiled About metadata directly and restores focus on Escape', async () => {
    const trigger = within(container).getByRole('button', { name: 'About Raven' });
    await act(async () => {
      trigger.focus();
      fireEvent.click(trigger);
    });
    const dialog = await waitFor(() => within(document.body).getByRole('dialog'));
    expect(dialog.textContent).toContain('Compiled version');
    expect(dialog.textContent).toMatch(/\d+\.\d+\.\d+/u);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    await waitFor(() => {
      expect(within(document.body).queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('exposes the same destination name through keyboard-focus tooltip', async () => {
    const link = within(container).getByRole('link', { name: 'Runs' });
    await act(async () => {
      link.focus();
    });
    await waitFor(() => {
      expect(within(document.body).getByRole('tooltip').textContent).toBe('Runs');
    });
    expect(document.activeElement).toBe(link);
  });
});
