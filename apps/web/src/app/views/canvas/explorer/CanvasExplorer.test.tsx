// @vitest-environment jsdom
/** Owned concern: prove explorer disclosure preserves the graph and local panel state. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { useUiLayoutStore } from '../../../stores/uiLayoutStore';
import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
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
  useApplicationLanguageStore.setState({ language: 'en' });
});
function render(element: React.ReactNode): void {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => {
    root.render(element);
  });
}
afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
});

describe('Canvas explorer', () => {
  it('waits for the shared rail host without moving retained content or creating an inline rail', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const view = (target: HTMLElement | null): JSX.Element => (
      <div aria-hidden="true" {...{ inert: '' }}>
        <CanvasExplorer
          sources={<input aria-label="Retained source search" defaultValue="orders" />}
          elements={null}
          activityRail={{ target, codeVisible: true }}
          projectFiles={{ onActivate: async () => true, onCanvas: () => undefined }}
        >
          <input aria-label="Retained graph" defaultValue="camera" />
        </CanvasExplorer>
      </div>
    );
    try {
      render(view(null));
      const graph = screen.getByLabelText('Retained graph');
      const search = screen.getByLabelText('Retained source search');
      expect(container.querySelector('nav')).toBeNull();
      expect(host.childElementCount).toBe(0);
      act(() => root.render(view(host)));
      expect(container.querySelector('nav')).toBeNull();
      expect(screen.getAllByRole('navigation')).toHaveLength(1);
      const rail = screen.getByRole('navigation');
      expect(host.contains(rail)).toBe(true);
      expect(rail.closest('[inert], [aria-hidden="true"]')).toBeNull();
      expect(screen.getByRole('button', { name: 'Sources' }).getAttribute('aria-expanded')).toBe(
        'false'
      );
      expect(screen.getByRole('button', { name: 'Git' }).getAttribute('aria-expanded')).toBe(
        'true'
      );
      expect(screen.getByLabelText('Retained graph')).toBe(graph);
      expect(screen.getByLabelText('Retained source search')).toBe(search);
      act(() => useUiLayoutStore.getState().hideCanvasExplorer());
      expect(screen.queryByRole('navigation')).toBeNull();
      act(() => useUiLayoutStore.getState().showCanvasExplorer());
      expect(screen.getByRole('navigation')).toBe(rail);
    } finally {
      host.remove();
    }
  });

  it.each([
    ['en', ['Sources', 'Elements', 'Git']],
    ['es', ['Fuentes', 'Elementos', 'Git']],
  ] as const)('keeps optional Git on the localized shared rail (%s)', (language, labels) => {
    useApplicationLanguageStore.setState({ language });
    render(
      <CanvasExplorer
        sources={null}
        elements={null}
        projectFiles={{ onActivate: async () => true, onCanvas: () => undefined }}
      >
        <p>Graph</p>
      </CanvasExplorer>
    );
    expect(
      [...screen.getByRole('navigation').querySelectorAll('button')].map((button) =>
        button.getAttribute('aria-label')
      )
    ).toEqual(labels);
  });

  it.each(['click', 'Enter', ' '] as const)(
    'delegates Git to the workspace owner without hosting Code (%s)',
    async (gesture) => {
      const onActivate = vi.fn(async () => true);
      const onCanvas = vi.fn();
      render(
        <CanvasExplorer
          sources={<input aria-label="Source search" defaultValue="orders" />}
          elements={<p>Existing elements</p>}
          projectFiles={{ onActivate, onCanvas }}
        >
          <input aria-label="Graph state" defaultValue="camera and positions" />
        </CanvasExplorer>
      );
      const graph = screen.getByRole('textbox', { name: 'Graph state' });
      const source = screen.getByRole('textbox', { name: 'Source search' });
      const git = screen.getByRole('button', { name: 'Git' });
      await act(async () => {
        if (gesture === 'click') fireEvent.click(git);
        else fireEvent.keyDown(git, { key: gesture });
      });
      expect(onActivate).toHaveBeenCalledExactlyOnceWith();
      expect(onCanvas).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox', { name: 'Graph state' })).toBe(graph);
      expect(screen.getByRole('textbox', { name: 'Source search' })).toBe(source);
      expect(git.getAttribute('aria-controls')).toBe('canvas-code-workspace-surface');
      expect(container.querySelector('[data-slot="canvas-explorer-project-code"]')).toBeNull();
    }
  );

  it.each(['Sources', 'Elements', 'Collapse explorer', 'Close explorer'])(
    'delegates a newer Canvas intent to the workspace owner (%s)',
    async (destination) => {
      const onCanvas = vi.fn();
      render(
        <CanvasExplorer
          sources={<p>Catalogue</p>}
          elements={<p>Existing elements</p>}
          projectFiles={{ onActivate: async () => false, onCanvas }}
        >
          <input aria-label="Graph state" />
        </CanvasExplorer>
      );
      const graph = screen.getByLabelText('Graph state');
      await act(async () => fireEvent.click(screen.getByRole('button', { name: destination })));
      expect(onCanvas).toHaveBeenCalledExactlyOnceWith();
      expect(screen.getByLabelText('Graph state')).toBe(graph);
    }
  );

  it('withdraws only the Git command without replacing graph or source state', () => {
    const view = (available: boolean): JSX.Element => (
      <CanvasExplorer
        sources={<input aria-label="Source search" defaultValue="orders" />}
        elements={<p>Existing elements</p>}
        projectFiles={
          available ? { onActivate: async () => true, onCanvas: () => undefined } : undefined
        }
      >
        <input aria-label="Graph state" />
      </CanvasExplorer>
    );
    render(view(true));
    const graph = screen.getByRole('textbox', { name: 'Graph state' });
    const search = screen.getByRole('textbox', { name: 'Source search' });
    act(() => root.render(view(false)));
    expect(screen.queryByRole('button', { name: 'Git' })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Graph state' })).toBe(graph);
    expect(screen.getByRole('textbox', { name: 'Source search' })).toBe(search);
  });

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
    expect(screen.queryByRole('button', { name: 'Orders' })).toBeNull();
    act(() => root.render(view(true)));
    const source = screen.getByRole('button', { name: 'Orders' });
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

  it('reuses catalogue projection across graph movement and refreshes changed source context', () => {
    let roleReads = 0;
    const source: CanonicalNode = {
      id: 'registered',
      name: 'Orders',
      pluginId: 'dvt.warehouse-source',
      kind: 'dvt:source',
      get role() {
        roleReads += 1;
        return 'input' as const;
      },
      status: 'idle',
      tags: [],
      metadata: { schema: 'raw', connectionName: 'Warehouse' },
    };
    const catalogue = [source];
    const onInspectSource = vi.fn();
    const view = (moved: boolean, sources = catalogue): JSX.Element => (
      <CanvasGraphExplorer
        nodes={
          moved ? [{ id: 'placed', position: { x: 200, y: 40 }, data: { name: 'Placed' } }] : []
        }
        catalogue={sources}
        onSelect={() => {}}
        onInspectSource={onInspectSource}
      >
        <input aria-label="Retained graph" />
      </CanvasGraphExplorer>
    );
    render(view(false));
    expect(roleReads).toBeGreaterThan(0);
    const row = screen.getByRole('button', { name: 'Orders raw · Warehouse' });
    expect(row.draggable).toBe(false);
    expect(row.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    roleReads = 0;
    act(() => root.render(view(true)));
    expect(roleReads).toBe(0);
    expect(screen.getByRole('button', { name: 'Orders raw · Warehouse' })).toBe(row);
    act(() => {
      fireEvent.change(screen.getAllByRole('searchbox')[0]!, { target: { value: 'warehouse' } });
    });
    expect(screen.getByRole('button', { name: 'Orders raw · Warehouse' })).toBe(row);
    act(() => {
      fireEvent.click(row);
    });
    expect(onInspectSource).toHaveBeenCalledExactlyOnceWith('registered');
    act(() =>
      root.render(
        view(true, [{ ...source, metadata: { schema: 'reporting', connectionName: 'Warehouse' } }])
      )
    );
    expect(screen.getByRole('button', { name: 'Orders reporting · Warehouse' })).toBe(row);
    expect(screen.queryByText('raw · Warehouse')).toBeNull();
    expect(screen.getByLabelText('Retained graph')).toBeTruthy();
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
