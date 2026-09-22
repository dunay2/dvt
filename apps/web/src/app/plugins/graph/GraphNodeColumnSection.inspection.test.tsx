// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

describe('output inspection gestures', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('inspects on one click or Enter, with no extra double-click action or output mutation', () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const inspect = vi.fn(),
      toggle = vi.fn(),
      openCard = vi.fn();
    act(() =>
      root.render(
        <div onDoubleClick={openCard}>
          <GraphNodeColumnSection
            expanded
            nodeId="model"
            columns={[{ id: 'output:id', name: 'alias', type: 'integer' }]}
            onColumnInspect={inspect}
            onColumnOutputToggle={toggle}
          />
        </div>
      )
    );
    const piece = container.querySelector<HTMLElement>('[data-slot="graph-node-column-piece"]')!;
    act(() => fireEvent.doubleClick(piece));
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
    act(() => fireEvent.keyDown(piece, { key: 'Enter' }));
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
    act(() => root.unmount());
    container.remove();
  });
});
