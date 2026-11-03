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
import { CANVAS_CATALOG_NODE_DRAG_MIME_TYPE } from '../canvasNodeDropPayload';

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
  it('offers one catalogue with category additions even before objects are registered', () => {
    const onImport = vi.fn();
    const onAddModel = vi.fn();
    render(
      <CanvasGraphExplorer
        nodes={[]}
        catalogue={[]}
        onSelect={vi.fn()}
        onImport={onImport}
        onAddModel={onAddModel}
        canPlaceSource
      >
        <input aria-label="Graph" />
      </CanvasGraphExplorer>
    );
    expect(screen.queryByRole('button', { name: 'Sources' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Elements' }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Import sources' }));
    });
    expect(onImport).toHaveBeenCalledExactlyOnceWith();
    const addModel = screen.getByRole('button', { name: 'Add model' });
    act(() => {
      fireEvent.click(addModel);
    });
    expect(onAddModel).toHaveBeenCalledExactlyOnceWith(addModel);
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Models' })).toBeTruthy();
  });

  it('collapses categories independently and retains disclosure through search and panel changes', () => {
    const onSelect = vi.fn();
    render(
      <CanvasExplorer
        elements={
          <CanvasExplorerList
            items={[
              { id: 'orders', label: 'Orders', category: 'Sources' },
              { id: 'revenue', label: 'Revenue', category: 'Models', selected: true },
            ]}
            onSelect={onSelect}
          />
        }
      >
        <input aria-label="Retained graph" />
      </CanvasExplorer>
    );
    const sources = screen.getByRole('button', { name: 'Elements: Sources' });
    const models = screen.getByRole('button', { name: 'Elements: Models' });
    const graph = screen.getByLabelText('Retained graph');
    act(() => {
      fireEvent.click(sources);
    });
    expect(sources.getAttribute('aria-expanded')).toBe('false');
    expect(models.getAttribute('aria-expanded')).toBe('true');
    expect(screen.queryByRole('button', { name: 'Orders' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Revenue' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    act(() => {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Revenue' } });
    });
    expect(screen.queryByRole('button', { name: 'Elements: Sources' })).toBeNull();
    act(() => {
      fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
      fireEvent.click(screen.getByRole('button', { name: 'Elements' }));
    });
    expect(screen.queryByRole('searchbox')).toBeNull();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Elements' }));
    });
    const restoredSources = screen.getByRole('button', { name: 'Elements: Sources' });
    expect(restoredSources.getAttribute('aria-expanded')).toBe('false');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Elements: Models' }));
    });
    expect(screen.queryByRole('button', { name: 'Revenue' })).toBeNull();
    act(() => {
      fireEvent.click(restoredSources);
    });
    expect(screen.getByRole('button', { name: 'Orders' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Revenue' })).toBeNull();
    expect(screen.getByLabelText('Retained graph')).toBe(graph);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('defaults to one Elements catalogue', () => {
    render(
      <CanvasExplorer
        elements={
          <CanvasExplorerList items={[{ id: 'orders', label: 'Orders' }]} onSelect={vi.fn()} />
        }
      >
        <input aria-label="Graph" />
      </CanvasExplorer>
    );
    expect(screen.queryByRole('button', { name: 'Sources' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Elements' }).getAttribute('aria-expanded')).toBe(
      'true'
    );
    expect(container.querySelectorAll('input[type="search"]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Orders' })).toBeTruthy();
  });
  it.each([true, false])(
    'uses Elements as a definition catalogue with guarded instance drag (writable=%s)',
    (writable) => {
      const source: CanonicalNode = {
        id: 'source',
        name: 'Orders',
        pluginId: 'dvt',
        kind: 'dvt:source',
        role: 'input',
        status: 'idle',
        tags: [],
      };
      const model: CanonicalNode = {
        ...source,
        id: 'model',
        name: 'Revenue',
        kind: 'dvt:transform',
        role: 'transform',
      };
      const onInspectSource = vi.fn();
      const onSelect = vi.fn();
      render(
        <CanvasGraphExplorer
          nodes={[
            {
              id: 'instance',
              position: { x: 0, y: 0 },
              data: { name: 'Placed Orders', role: 'input' },
            },
          ]}
          catalogue={[
            source,
            { ...source, id: 'instance', name: 'Placed Orders', sourceDefinitionId: source.id },
            model,
          ]}
          onSelect={onSelect}
          onInspectSource={onInspectSource}
          canPlaceSource={writable}
        >
          <input aria-label="Retained graph" />
        </CanvasGraphExplorer>
      );
      expect(screen.queryByRole('button', { name: /Placed Orders/ })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Sources' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Models' })).toBeTruthy();
      const row = screen.getByRole('button', { name: 'Orders' });
      expect(row.draggable).toBe(writable);
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Revenue' }).draggable).toBe(
        false
      );
      if (writable) {
        const transfer = { setData: vi.fn(), effectAllowed: '' };
        act(() => {
          fireEvent.dragStart(row, { dataTransfer: transfer });
        });
        expect(transfer.setData).toHaveBeenCalledExactlyOnceWith(
          CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
          JSON.stringify({ id: 'source' })
        );
        expect(transfer.effectAllowed).toBe('copy');
      }
      act(() => {
        fireEvent.click(row);
      });
      expect(onInspectSource).toHaveBeenCalledExactlyOnceWith('source');
      expect(onSelect).not.toHaveBeenCalled();
    }
  );

  it('allows source and model reference drops without authoring permission', () => {
    render(
      <CanvasGraphExplorer
        nodes={[]}
        onSelect={vi.fn()}
        onInspectSource={vi.fn()}
        referencePlacementScope="scope"
        catalogue={[
          {
            id: 'source',
            name: 'Orders',
            role: 'input',
            kind: 'dvt:source',
            pluginId: 'dvt',
            status: 'idle',
            tags: [],
          },
          {
            id: 'model',
            name: 'Revenue',
            role: 'transform',
            kind: 'dvt:transform',
            pluginId: 'dvt',
            status: 'idle',
            tags: [],
          },
        ]}
      >
        <input aria-label="Retained graph" />
      </CanvasGraphExplorer>
    );
    for (const [name, id] of [
      ['Orders', 'source'],
      ['Revenue', 'model'],
    ]) {
      const row = screen.getByRole<HTMLButtonElement>('button', { name });
      expect(row.draggable).toBe(true);
      const transfer = { setData: vi.fn(), effectAllowed: '' };
      act(() => {
        fireEvent.dragStart(row, { dataTransfer: transfer });
      });
      expect(transfer.setData).toHaveBeenCalledExactlyOnceWith(
        CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
        JSON.stringify({ id, scopeKey: 'scope' })
      );
    }
  });

  it('enables project discovery only in the open Elements panel without remounting its list or graph', () => {
    const renderElements = vi.fn(({ enabled }: { enabled: boolean }) => (
      <input aria-label="Retained project search" data-enabled={enabled} />
    ));
    render(
      <CanvasGraphExplorer
        nodes={[]}
        onSelect={() => undefined}
        projectFiles={{ onActivate: async () => true, onCanvas: () => undefined, renderElements }}
      >
        <input aria-label="Retained graph" />
      </CanvasGraphExplorer>
    );
    const search = screen.getByLabelText('Retained project search');
    const graph = screen.getByLabelText('Retained graph');
    expect(search.dataset.enabled).toBe('true');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Elements' }));
    });
    expect(search.dataset.enabled).toBe('false');
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Elements' }));
    });
    expect(search.dataset.enabled).toBe('true');
    expect(screen.getByLabelText('Retained project search')).toBe(search);
    expect(screen.getByLabelText('Retained graph')).toBe(graph);
    act(() => useUiLayoutStore.getState().hideCanvasExplorer());
    expect(search.dataset.enabled).toBe('false');
  });

  it('waits for the shared rail host without moving retained content or creating an inline rail', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const view = (target: HTMLElement | null): JSX.Element => (
      <div aria-hidden="true" {...{ inert: '' }}>
        <CanvasExplorer
          elements={<input aria-label="Retained source search" defaultValue="orders" />}
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
      expect(screen.getByRole('button', { name: 'Elements' }).getAttribute('aria-expanded')).toBe(
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
    ['en', ['Elements', 'Git']],
    ['es', ['Elementos', 'Git']],
  ] as const)('keeps optional Git on the localized shared rail (%s)', (language, labels) => {
    useApplicationLanguageStore.setState({ language });
    render(
      <CanvasExplorer
        elements={<p>Source catalogue</p>}
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
          elements={<input aria-label="Source search" defaultValue="orders" />}
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

  it.each(['Elements', 'Collapse explorer', 'Close explorer'])(
    'delegates a newer Canvas intent to the workspace owner (%s)',
    async (destination) => {
      const onCanvas = vi.fn();
      render(
        <CanvasExplorer
          elements={<p>Catalogue</p>}
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
        elements={<input aria-label="Source search" defaultValue="orders" />}
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
      <CanvasExplorer elements={<p>Catalogue</p>} workspaceTask={task}>
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
      <CanvasExplorer elements={<p>Source catalogue</p>}>
        <p>Graph</p>
      </CanvasExplorer>
    );
    const button = screen.getByRole('button', { name: 'Elements' });
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
      CANVAS_CATALOG_NODE_DRAG_MIME_TYPE,
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
        <CanvasExplorer elements={<CanvasExplorerList items={[]} onSelect={() => {}} />}>
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
      fireEvent.click(screen.getByRole('button', { name: 'Elements' }));
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
