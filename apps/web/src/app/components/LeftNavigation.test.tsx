// @vitest-environment jsdom
/** Owned concern: verify direct shell navigation and the real About focus lifecycle. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, waitFor, within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router';
import { Activity, Workflow } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LeftNavigationRail } from './LeftNavigation';
import { resolveShellTopBarCopy } from './shell/copy';
import type { ShellNavigationModel } from '../shell/shellNavigationModel';
import { ShellActivityRailProvider } from './shell/ShellActivityRail';
import { CanvasExplorer } from '../views/canvas/explorer/CanvasExplorer';
import { useUiLayoutStore } from '../stores/uiLayoutStore';

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
  vi.unstubAllGlobals();
});

describe('Direct shell navigation', () => {
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
