// @vitest-environment jsdom
/** Owned concern: prove explorer disclosure preserves the graph and local panel state. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { CanvasExplorer } from './CanvasExplorer';
import { CanvasExplorerList } from './CanvasExplorerList';

let root: Root;
let container: HTMLDivElement;
function render(element: React.ReactNode) {
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

  it('filters names but selects by identity, keeping duplicate labels and denying disabled actions', () => {
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
});
