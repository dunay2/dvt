// @vitest-environment jsdom
/** Owned concern: prove explorer disclosure preserves the graph and local panel state. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { DropdownMenu, DropdownMenuContent } from '../../../components/ui/dropdown-menu';
import { CanvasExplorerViewMenu } from './CanvasExplorerViewMenu';
import { CanvasGraphExplorer } from './CanvasGraphExplorer';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';
import type { CanonicalNode } from '../../../types/canonical';
import { CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  useUiLayoutStore.setState({ canvasExplorerVisible: true });
});
function render(element: React.ReactNode): void {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root.render(element));
}
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
});

describe('Canvas explorer', () => {
  it('retains graph state while an inline task temporarily owns its surface', () => {
    const view = (task: React.ReactNode): JSX.Element => (
      <CanvasExplorer sources={<p>Catalogue</p>} elements={null} workspaceTask={task}>
        <input aria-label="Retained graph state" defaultValue="zoom and selection" />
      </CanvasExplorer>
    );
    render(view(null));
    const graph = screen.getByLabelText('Retained graph state');
    act(() => root.render(view(<p>Import workspace</p>)));
    expect(screen.getByText('Catalogue')).not.toBeNull();
    expect(graph.closest('[inert]')).not.toBeNull();
    expect(
      container
        .querySelector('[data-slot="canvas-explorer-retained-surface"]')
        ?.getAttribute('aria-hidden')
    ).toBe('true');
    act(() => root.render(view(null)));
    expect(screen.getByLabelText('Retained graph state')).toBe(graph);
    expect(graph.closest('[inert]')).toBeNull();
  });
  it('toggles once with Enter or Space and ignores held-key repeats', () => {
    render(
      <CanvasExplorer sources={null} elements={null}>
        <p>Graph</p>
      </CanvasExplorer>
    );
    const button = screen.getByRole('button', { name: 'Sources' });
    act(() => {
      expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(false);
    });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      fireEvent.keyDown(button, { key: 'Enter', repeat: true });
    });
    expect(button.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      expect(fireEvent.keyDown(button, { key: ' ' })).toBe(false);
    });
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });
  it('dispatches import without passing a DOM event as graph coordinates', () => {
    const onImport = vi.fn();
    render(<CanvasExplorerList items={[]} onSelect={() => {}} onImport={onImport} />);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Import sources' }));
    });
    expect(onImport.mock.calls).toEqual([[]]);
  });
  it('shows registered sources without graph cards; click inspects and drag carries only their identity', () => {
    const catalogue: CanonicalNode[] = [
      {
        id: 'imported',
        name: 'Orders',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
      },
    ];
    const onInspectSource = vi.fn();
    const onSelect = vi.fn();
    const view = (ready: boolean): JSX.Element => (
      <CanvasGraphExplorer
        nodes={[]}
        catalogue={ready ? catalogue : []}
        onSelect={onSelect}
        onInspectSource={onInspectSource}
        canPlaceSource
      >
        <input aria-label="Graph state" />
      </CanvasGraphExplorer>
    );
    render(view(false));
    const graph = screen.getByLabelText('Graph state');
    expect(screen.queryByRole('button', { name: 'Orders dvt:source' })).toBeNull();
    act(() => root.render(view(true)));
    const source = screen.getByRole('button', { name: 'Orders dvt:source' });
    act(() => {
      fireEvent.click(source);
    });
    expect(onInspectSource).toHaveBeenCalledExactlyOnceWith('imported');
    expect(onSelect).not.toHaveBeenCalled();
    const transfer = { setData: vi.fn(), effectAllowed: '' };
    act(() => {
      fireEvent.dragStart(source, { dataTransfer: transfer });
    });
    expect(transfer.setData).toHaveBeenCalledExactlyOnceWith(
      CANVAS_SOURCE_CATALOG_DRAG_MIME_TYPE,
      'imported'
    );
    expect(transfer.effectAllowed).toBe('copy');
    expect(onInspectSource).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Graph state')).toBe(graph);
  });

  it('collapses to the rail, closes completely and reopens through View with retained search', () => {
    render(
      <MemoryRouter initialEntries={['/canvas']}>
        <DropdownMenu open modal={false}>
          <DropdownMenuContent>
            <CanvasExplorerViewMenu />
          </DropdownMenuContent>
        </DropdownMenu>
        <CanvasExplorer
          sources={<CanvasExplorerList items={[]} onSelect={() => {}} />}
          elements={null}
        >
          <input aria-label="Graph state" />
        </CanvasExplorer>
      </MemoryRouter>
    );
    const graph = screen.getByLabelText('Graph state');
    const search = screen.getByRole('searchbox');
    act(() => {
      fireEvent.change(search, { target: { value: 'ord' } });
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Collapse explorer' }));
    });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Canvas explorer' })).toBeTruthy();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Sources' }));
    });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Close explorer' }));
    });
    expect(screen.queryByRole('navigation', { name: 'Canvas explorer' })).toBeNull();
    expect(screen.queryByRole('searchbox')).toBeNull();
    const menu = screen.getByRole('menuitemcheckbox', { name: 'Canvas explorer' });
    expect(menu.getAttribute('aria-checked')).toBe('false');
    act(() => {
      fireEvent.click(menu);
    });
    expect(screen.getByRole('searchbox')).toBe(search);
    expect((search as HTMLInputElement).value).toBe('ord');
    expect(screen.getByLabelText('Graph state')).toBe(graph);
  });

  it('does not offer the Canvas explorer on other workspace routes', () => {
    render(
      <MemoryRouter initialEntries={['/runs']}>
        <CanvasExplorerViewMenu />
      </MemoryRouter>
    );
    expect(screen.queryByText('Canvas explorer')).toBeNull();
  });

  it('switches and collapses retained panels without remounting the graph or losing search', () => {
    render(
      <CanvasExplorer
        sources={
          <CanvasExplorerList items={[{ id: 'source', label: 'Orders' }]} onSelect={() => {}} />
        }
        elements={<p>Existing instances</p>}
      >
        <input aria-label="Graph state" defaultValue="unchanged draft" />
      </CanvasExplorer>
    );
    const graph = screen.getByLabelText('Graph state');
    const search = screen.getByRole('searchbox');
    act(() => {
      fireEvent.change(search, { target: { value: 'ord' } });
    });
    const sources = screen.getByRole('button', { name: 'Sources' });
    const elements = screen.getByRole('button', { name: 'Elements' });
    act(() => {
      fireEvent.click(elements);
    });
    expect(elements.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByRole('searchbox')).toBeNull();
    act(() => {
      fireEvent.click(elements);
    });
    expect(elements.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      fireEvent.click(sources);
    });
    expect(screen.getByRole('searchbox')).toBe(search);
    expect((search as HTMLInputElement).value).toBe('ord');
    expect(screen.getByLabelText('Graph state')).toBe(graph);
  });

  it('filters names but selects by identity, keeping duplicate labels', () => {
    const selected: string[] = [];
    render(
      <CanvasExplorerList
        items={[
          { id: 'a', label: 'Orders' },
          { id: 'b', label: 'Orders', description: 'Second instance' },
        ]}
        onSelect={(id) => selected.push(id)}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Orders Second instance' }));
    });
    expect(selected).toEqual(['b']);
    act(() => {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    });
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText('No matching elements.')).toBeTruthy();
  });

  it('does not dispatch selection while navigation is disabled by pending edits', () => {
    const selected: string[] = [];
    render(
      <CanvasExplorerList
        items={[{ id: 'a', label: 'Orders' }]}
        disabled
        onSelect={(id) => selected.push(id)}
      />
    );
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Orders' }));
    });
    expect(selected).toEqual([]);
  });
});
