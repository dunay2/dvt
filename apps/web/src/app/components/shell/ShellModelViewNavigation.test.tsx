// @vitest-environment jsdom
/** Prove Model view shortcuts delegate to the live owner and keep one active destination. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, within } from '@testing-library/dom';
import { MemoryRouter } from 'react-router';
import { PanelsTopLeft } from 'lucide-react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { LeftNavigationRail } from '../LeftNavigation';
import { resolveShellTopBarCopy } from './copy';
import { buildShellNavigationModel } from '../../shell/shellNavigationModel';
import { useCanvasWorkspaceMenuContributionStore } from '../../views/canvas/canvasWorkspaceMenuContributionStore';

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  useCanvasWorkspaceMenuContributionStore.setState({
    modelTab: null,
    modelBrowser: null,
    contribution: null,
  });
  vi.unstubAllGlobals();
});
function render(language = 'en'): void {
  const navigation = buildShellNavigationModel([]);
  act(() =>
    root.render(
      <MemoryRouter initialEntries={['/canvas']}>
        <LeftNavigationRail
          navigationModel={{
            ...navigation,
            primaryItems: [
              {
                to: '/canvas',
                label: 'Canvas',
                icon: PanelsTopLeft,
                source: 'runtime',
                level: 'core',
              },
            ],
          }}
          copy={resolveShellTopBarCopy(language)}
        />
      </MemoryRouter>
    )
  );
}

it('keeps localized semantic admission and independent SQL navigation without inventing a Model', async () => {
  render('es');
  const action = within(container).getByRole('button', { name: 'Vista semántica' });
  expect(action.getAttribute('aria-disabled')).toBe('true');
  expect(action.getAttribute('data-active')).toBe('false');
  await act(() => fireEvent.click(action));
  expect(within(container).getByRole('link', { name: 'SQL' }).getAttribute('href')).toBe('/sql');
  expect(useCanvasWorkspaceMenuContributionStore.getState().modelTab).toBeNull();
});

it('delegates semantic browsing to the current owner and denies busy or obsolete contributions', async () => {
  const select = vi.fn();
  const semantic = vi.fn();
  const sql = vi.fn();
  const canvas = vi.fn();
  const browse = vi.fn();
  const tab = {
    canvasId: 'canvas',
    nodeId: 'model',
    label: 'Orders',
    active: true,
    onSelect: select,
    onCanvas: canvas,
    onClose: vi.fn(),
    views: {
      active: 'semantic' as 'semantic' | 'sql',
      sqlPanelId: 'model-sql',
      disabled: false,
      semantic,
      sql,
    },
  };
  useCanvasWorkspaceMenuContributionStore.getState().registerModelTab(tab);
  useCanvasWorkspaceMenuContributionStore.getState().registerModelBrowser({
    canvasId: 'canvas',
    mode: 'semantic',
    onBrowse: browse,
    onCanvas: canvas,
  });
  useCanvasWorkspaceMenuContributionStore.getState().registerCanvasWorkspaceMenuContribution({
    activeCanvas: { id: 'canvas', kind: 'dvt', title: 'Canvas' },
    canExportProjectSnapshot: false,
    canImportProjectSnapshot: false,
  });
  render();
  const semanticAction = within(container).getByRole('button', { name: 'Semantic view' });
  const sqlAction = within(container).getByRole('link', { name: 'SQL' });
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
  expect(semanticAction.getAttribute('data-active')).toBe('true');
  await act(() => fireEvent.click(within(container).getByRole('link', { name: 'Canvas' })));
  expect(canvas).toHaveBeenCalledOnce();
  await act(() => fireEvent.click(semanticAction));
  expect(browse).toHaveBeenCalledExactlyOnceWith('semantic');
  expect(select).not.toHaveBeenCalled();
  expect(sql).not.toHaveBeenCalled();
  expect(semantic).not.toHaveBeenCalled();
  const currentSemantic = vi.fn();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelTab({
      ...tab,
      views: { ...tab.views, active: 'sql', semantic: currentSemantic },
    })
  );
  expect(semanticAction.getAttribute('data-active')).toBe('true');
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
  expect(sqlAction.getAttribute('aria-current')).toBeNull();
  await act(() => fireEvent.click(semanticAction));
  expect(browse).toHaveBeenLastCalledWith('semantic');
  expect(currentSemantic).not.toHaveBeenCalled();
  expect(semantic).not.toHaveBeenCalled();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelTab({
      ...tab,
      views: { ...tab.views, disabled: true },
    })
  );
  await act(() => fireEvent.click(semanticAction));
  expect(semanticAction.getAttribute('aria-disabled')).toBe('true');
  expect(sql).not.toHaveBeenCalled();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelBrowser({
      canvasId: 'obsolete-canvas',
      mode: 'sql',
      onBrowse: vi.fn(),
      onCanvas: vi.fn(),
    })
  );
  expect(semanticAction.getAttribute('aria-disabled')).toBe('true');
  await act(() => fireEvent.click(semanticAction));
  expect(sql).not.toHaveBeenCalled();
  act(() =>
    useCanvasWorkspaceMenuContributionStore
      .getState()
      .clearModelTab(useCanvasWorkspaceMenuContributionStore.getState().modelTab!)
  );
  await act(() => fireEvent.click(semanticAction));
  expect(sql).not.toHaveBeenCalled();
});

it.each([false, true])(
  'opens the independent SQL worksheet with a selected Model: %s',
  async (selectedModel) => {
    const browse = vi.fn();
    const select = vi.fn();
    const openSql = vi.fn();
    const store = useCanvasWorkspaceMenuContributionStore.getState();
    store.registerCanvasWorkspaceMenuContribution({
      activeCanvas: { id: 'canvas', kind: 'dvt', title: 'Canvas' },
      canExportProjectSnapshot: false,
      canImportProjectSnapshot: false,
    });
    store.registerModelBrowser({
      canvasId: 'canvas',
      mode: null,
      onBrowse: browse,
      onCanvas: vi.fn(),
    });
    if (selectedModel)
      store.registerModelTab({
        canvasId: 'canvas',
        nodeId: 'model',
        label: 'Orders',
        active: true,
        onSelect: select,
        onCanvas: vi.fn(),
        onClose: vi.fn(),
        views: {
          active: 'semantic',
          sqlPanelId: 'model-sql',
          disabled: false,
          semantic: vi.fn(),
          sql: openSql,
        },
      });
    render();
    const sql = within(container).getByRole('link', { name: 'SQL' });
    expect(sql.getAttribute('href')).toBe('/sql');
    expect(sql.getAttribute('data-slot')).toBe('shell-model-sql-command');
    await act(() => fireEvent.click(sql));
    expect(sql.getAttribute('aria-current')).toBe('page');
    expect(browse).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
    expect(openSql).not.toHaveBeenCalled();
    if (!selectedModel) expect(store.modelTab).toBeNull();
  }
);
