// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasNodeShell } from '../../components/canvas/CanvasNodeShell';
import type { CanvasNodeContextMenuModel } from '../../components/canvas/canvasNodeContextMenuModel';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { GraphNodeColumnSection } from './GraphNodeColumnSection';

const nodeMenu: CanvasNodeContextMenuModel = {
  target: { kind: 'node', nodeId: 'transform-orders', nodeName: 'Model prueba' },
  actionGroups: [
    {
      id: 'edit',
      label: 'Edit',
      actions: [{ id: 'duplicate-node', label: 'Duplicar', intent: 'command', disabled: false }],
    },
  ],
};

describe('GraphNodeColumnSection context menu ownership', () => {
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
    useApplicationLanguageStore.setState({ language: 'es' });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document
      .querySelectorAll('[data-radix-popper-content-wrapper]')
      .forEach((node) => node.remove());
  });

  it('keeps a structured column in its own menu and appends an existing output', async () => {
    const onStructuredFieldApply = vi.fn();
    await act(async () => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={nodeMenu}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
        >
          <GraphNodeColumnSection
            expanded
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
              { id: 'output:amount', name: 'amount', type: 'numeric' },
            ]}
            canReorderTopLevelColumns={false}
            onColumnReorder={vi.fn()}
            onStructuredFieldApply={onStructuredFieldApply}
          />
        </CanvasNodeShell>
      );
    });

    const structuredColumn = container.querySelector<HTMLElement>(
      '[data-slot="graph-node-column-piece"]'
    )!;
    await act(async () => {
      fireEvent.contextMenu(structuredColumn);
    });

    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).toBeNull();
    expect(document.querySelector('[data-slot="graph-node-column-function-menu"]')).not.toBeNull();

    await act(async () => {
      fireEvent.click(
        document.querySelector<HTMLElement>(
          '[data-slot="graph-node-structured-field-append"][data-field-id="output:amount"]'
        )!
      );
    });

    expect(onStructuredFieldApply).toHaveBeenCalledWith({
      nodeId: 'transform-orders',
      draggedFieldId: 'output:amount',
      targetFieldId: 'output:identity',
      parentName: 'identity',
    });
  });

  it('keeps nested fields in their own menu and reorders through the existing command', async () => {
    const onColumnReorder = vi.fn();
    await act(async () => {
      root.render(
        <CanvasNodeShell
          contextMenuModel={nodeMenu}
          shouldShowSourceHandle={false}
          shouldShowTargetHandle={false}
          onContextMenuAction={vi.fn()}
        >
          <GraphNodeColumnSection
            expanded
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
            canReorderTopLevelColumns={false}
            onColumnReorder={onColumnReorder}
            onStructuredFieldApply={vi.fn()}
          />
        </CanvasNodeShell>
      );
    });

    const nested = container.querySelectorAll<HTMLElement>(
      '[data-slot="graph-node-nested-column"]'
    );
    await act(async () => {
      nested[1]!.focus();
      fireEvent.keyDown(nested[1]!, { key: 'F10', shiftKey: true });
    });

    expect(document.querySelector('[data-slot="canvas-node-context-menu"]')).toBeNull();
    expect(document.querySelector('[data-slot="graph-node-column-function-menu"]')).toBeNull();
    expect(document.querySelector('[data-slot="graph-node-nested-column-menu"]')).not.toBeNull();

    await act(async () => {
      fireEvent.click(document.querySelector<HTMLElement>('[data-slot="nested-column-move-up"]')!);
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
