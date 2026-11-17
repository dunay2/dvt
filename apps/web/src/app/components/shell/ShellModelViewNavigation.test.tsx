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
  useCanvasWorkspaceMenuContributionStore.setState({ modelTab: null, contribution: null });
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

it('exposes localized unavailable Model actions without inventing a Model or navigation', () => {
  render('es');
  for (const name of ['Vista semántica', 'SQL']) {
    const action = within(container).getByRole('button', { name });
    expect(action.getAttribute('aria-disabled')).toBe('true');
    expect(action.getAttribute('data-active')).toBe('false');
    act(() => fireEvent.click(action));
  }
  expect(useCanvasWorkspaceMenuContributionStore.getState().modelTab).toBeNull();
});

it('uses the latest Model callbacks and keeps Canvas, semantic and SQL active states exclusive', () => {
  const select = vi.fn();
  const semantic = vi.fn();
  const sql = vi.fn();
  const canvas = vi.fn();
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
  useCanvasWorkspaceMenuContributionStore.getState().registerCanvasWorkspaceMenuContribution({
    activeCanvas: { id: 'canvas', kind: 'dvt', title: 'Canvas' },
    canExportProjectSnapshot: false,
    canImportProjectSnapshot: false,
  });
  render();
  const semanticAction = within(container).getByRole('button', { name: 'Semantic view' });
  const sqlAction = within(container).getByRole('button', { name: 'SQL' });
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
  expect(semanticAction.getAttribute('data-active')).toBe('true');
  expect(sqlAction.getAttribute('aria-controls')).toBe('model-sql');
  act(() => fireEvent.click(within(container).getByRole('link', { name: 'Canvas' })));
  expect(canvas).toHaveBeenCalledOnce();
  act(() => fireEvent.click(sqlAction));
  expect(select).toHaveBeenCalledOnce();
  expect(sql).toHaveBeenCalledOnce();
  expect(semantic).not.toHaveBeenCalled();
  const currentSemantic = vi.fn();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelTab({
      ...tab,
      views: { ...tab.views, active: 'sql', semantic: currentSemantic },
    })
  );
  expect(container.querySelectorAll('[data-active="true"]')).toHaveLength(1);
  expect(sqlAction.getAttribute('data-active')).toBe('true');
  act(() => fireEvent.click(semanticAction));
  expect(currentSemantic).toHaveBeenCalledOnce();
  expect(semantic).not.toHaveBeenCalled();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelTab({
      ...tab,
      views: { ...tab.views, disabled: true },
    })
  );
  act(() => fireEvent.click(sqlAction));
  expect(sql).toHaveBeenCalledOnce();
  act(() =>
    useCanvasWorkspaceMenuContributionStore.getState().registerModelTab({
      ...tab,
      canvasId: 'obsolete-canvas',
    })
  );
  expect(sqlAction.getAttribute('aria-disabled')).toBe('true');
  act(() => fireEvent.click(sqlAction));
  expect(sql).toHaveBeenCalledOnce();
  act(() =>
    useCanvasWorkspaceMenuContributionStore
      .getState()
      .clearModelTab(useCanvasWorkspaceMenuContributionStore.getState().modelTab!)
  );
  act(() => fireEvent.click(sqlAction));
  expect(sql).toHaveBeenCalledOnce();
});
