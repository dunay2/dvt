// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GraphNodeColumnSection } from './GraphNodeColumnSection';
import { GraphNodeColumnChildren } from './GraphNodeColumnChildren';

describe('GraphNodeColumnChildren reorder', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.ResizeObserver = class implements ResizeObserver {
      disconnect(): void {}
      observe(): void {}
      unobserve(): void {}
    };
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each(['node', 'parent', 'field'] as const)(
    'cancels native context defaults for a nested field without %s menu identity',
    async (missingIdentity) => {
      const onAncestorContextMenu = vi.fn();
      const onColumnReorder = vi.fn();
      await act(async () => {
        root.render(
          <div onContextMenu={onAncestorContextMenu}>
            <GraphNodeColumnChildren
              nodeId={missingIdentity === 'node' ? undefined : 'transform-orders'}
              parentColumnId={missingIdentity === 'parent' ? undefined : 'output:identity'}
              children={[
                {
                  id: missingIdentity === 'field' ? undefined : 'output:customer',
                  name: 'customer',
                  type: 'text',
                },
              ]}
              onColumnReorder={onColumnReorder}
            />
          </div>
        );
      });
      const nested = container.querySelector<HTMLElement>(
        '[data-slot="graph-node-nested-column"]'
      )!;
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
      await act(async () => {
        fireEvent(nested, event);
      });

      expect(event.defaultPrevented).toBe(true);
      expect(onAncestorContextMenu).not.toHaveBeenCalled();
      expect(document.querySelector('[data-slot="graph-node-nested-column-menu"]')).toBeNull();
      expect(onColumnReorder).not.toHaveBeenCalled();
    }
  );

  it('preserves the nested field menu without dispatching a command before an action is chosen', async () => {
    const onAncestorContextMenu = vi.fn();
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <div onContextMenu={onAncestorContextMenu}>
          <GraphNodeColumnChildren
            nodeId="transform-orders"
            parentColumnId="output:identity"
            children={[
              { id: 'output:order_id', name: 'order_id', type: 'integer' },
              { id: 'output:customer', name: 'customer', type: 'text' },
            ]}
            onColumnReorder={onColumnReorder}
          />
        </div>
      );
    });
    const nested = container.querySelector<HTMLElement>('[data-field-id="output:customer"]')!;
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 });
    await act(async () => {
      fireEvent(nested, event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onAncestorContextMenu).not.toHaveBeenCalled();
    expect(document.querySelector('[data-slot="graph-node-nested-column-menu"]')).not.toBeNull();
    expect(onColumnReorder).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(document.querySelector('[data-slot="nested-column-move-up"]')!);
    });
    expect(onColumnReorder).toHaveBeenCalledExactlyOnceWith({
      nodeId: 'transform-orders',
      parentColumnId: 'output:identity',
      columnId: 'output:customer',
      targetColumnId: 'output:order_id',
      placement: 'before',
    });
  });

  it('moves a nested field with the accessible keyboard path', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          columns={[
            {
              id: 'output:identity',
              name: 'identity',
              type: 'struct',
              children: [
                { id: 'output:order_id', name: 'order_id', type: 'integer' },
                { id: 'output:customer', name: 'customer', type: 'text' },
              ],
            },
          ]}
          onColumnReorder={onColumnReorder}
        />
      );
    });
    await act(async () => {
      fireEvent.click(container.querySelector('[data-slot="graph-node-column-toggle"]')!);
    });
    const nested = container.querySelectorAll<HTMLElement>(
      '[data-slot="graph-node-nested-column"]'
    );

    await act(async () => {
      nested[1]!.focus();
      fireEvent.keyDown(nested[1]!, { key: 'ArrowUp', altKey: true });
    });

    expect(onColumnReorder).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      parentColumnId: 'output:identity',
      columnId: 'output:customer',
      targetColumnId: 'output:order_id',
      placement: 'before',
    });
  });

  it('keeps root and nested reorder available together', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <GraphNodeColumnSection
          nodeId="transform-orders"
          expanded
          columns={[
            {
              id: 'output:identity',
              name: 'identity',
              type: 'struct',
              children: [
                { id: 'output:order_id', name: 'order_id', type: 'integer' },
                { id: 'output:customer', name: 'customer', type: 'text' },
              ],
            },
            { id: 'output:amount', name: 'amount', type: 'numeric' },
          ]}
          onColumnReorder={onColumnReorder}
        />
      );
    });

    const roots = container.querySelectorAll<HTMLElement>('[data-slot="graph-node-column-piece"]');
    const nested = container.querySelectorAll<HTMLElement>(
      '[data-slot="graph-node-nested-column"]'
    );
    expect([...roots].every((rootColumn) => rootColumn.draggable)).toBe(true);

    await act(async () => {
      nested[1]!.focus();
      fireEvent.keyDown(nested[1]!, { key: 'ArrowUp', altKey: true });
    });

    expect(onColumnReorder).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      parentColumnId: 'output:identity',
      columnId: 'output:customer',
      targetColumnId: 'output:order_id',
      placement: 'before',
    });
  });
});
