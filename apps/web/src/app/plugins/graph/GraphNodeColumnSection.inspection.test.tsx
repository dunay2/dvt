// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';
import type { GraphNodeColumn } from './graphNodeColumnContracts';

describe('output inspection gestures', () => {
  let root: Root;
  let container: HTMLDivElement;
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });
  function mount(column: GraphNodeColumn): {
    piece: HTMLElement;
    inspect: ReturnType<typeof vi.fn>;
    toggle: ReturnType<typeof vi.fn>;
    openCard: ReturnType<typeof vi.fn>;
  } {
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
    const inspect = vi.fn(),
      toggle = vi.fn(),
      openCard = vi.fn();
    act(() =>
      root.render(
        <div onDoubleClick={openCard}>
          <GraphNodeColumnSection
            expanded
            nodeId="model"
            columns={[column]}
            onColumnInspect={inspect}
            onColumnOutputToggle={toggle}
          />
        </div>
      )
    );
    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    return { piece, inspect, toggle, openCard };
  }

  it('inspects on one click or Enter, with no extra double-click action or output mutation', async () => {
    const { piece, inspect, toggle, openCard } = mount({
      id: 'output:id',
      name: 'alias',
      type: 'integer',
    });
    await act(() => fireEvent.doubleClick(piece));
    expect(inspect).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(piece, { detail: 1 });
      fireEvent.click(piece, { detail: 2 });
      fireEvent.doubleClick(piece);
    });
    expect(toggle).not.toHaveBeenCalled();
    expect(openCard).not.toHaveBeenCalled();
    expect(inspect).toHaveBeenCalledWith({
      nodeId: 'model',
      fieldId: 'output:id',
      anchorElement: piece,
    });
    expect(inspect).toHaveBeenCalledOnce();
    inspect.mockClear();
    await act(() => fireEvent.keyDown(piece, { key: 'Enter' }));
    expect(inspect).toHaveBeenCalledOnce();
    inspect.mockClear();
    const checkbox = piece.querySelector('button')!;
    act(() => {
      fireEvent.click(checkbox);
      fireEvent.doubleClick(checkbox);
      fireEvent.keyDown(checkbox, { key: 'Enter' });
    });
    expect(toggle).toHaveBeenCalledOnce();
    expect(inspect).not.toHaveBeenCalled();
  });

  it.each([
    { name: 'inactive', id: 'output:id', type: 'integer', output: false },
    { name: 'without stable identity', type: 'integer' },
  ])('does not inspect $name or invent identity from its alias', (column) => {
    const { piece, inspect, toggle, openCard } = mount(column);
    act(() => {
      fireEvent.click(piece);
      fireEvent.keyDown(piece, { key: 'Enter' });
      fireEvent.doubleClick(piece);
    });
    expect(inspect).not.toHaveBeenCalled();
    expect(toggle).not.toHaveBeenCalled();
    expect(openCard).not.toHaveBeenCalled();
    expect(piece.hasAttribute('aria-keyshortcuts')).toBe(false);
  });
});
