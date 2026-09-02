// @vitest-environment jsdom

import { ReactFlowProvider } from '@xyflow/react';
import { fireEvent } from '@testing-library/dom';
import React, { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE } from '../canvasWorkspaceExplorerModel';
import DbtNodeComponent, { type DbtNodeData } from './DbtNodeComponent';
import { projectCanvasNodeFlowAdapter } from './canvasNodeFlowAdapterProjection';

describe('DbtNodeComponent behavior', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it('delegates every projected operation to the existing Canvas command callbacks', () => {
    const onInspectNode = vi.fn();
    const onDuplicateNode = vi.fn();
    const onToggleNodeSelection = vi.fn();
    const onRemoveNode = vi.fn();
    const data: DbtNodeData = {
      name: 'Orders model',
      type: 'MODEL',
      status: 'idle',
      selectedForExecution: true,
      canMutateGraph: true,
      onInspectNode,
      onDuplicateNode,
      onToggleNodeSelection,
      onRemoveNode,
    };

    const projection = projectCanvasNodeFlowAdapter({
      nodeId: 'model.orders',
      data,
      selected: false,
      onColumnLayoutChange: vi.fn(),
    });

    projection.openNode();
    projection.runAction('open-properties');
    projection.runAction('duplicate-node');
    projection.runAction('deselect-node-from-execution');
    projection.runAction('remove-node');

    expect(onInspectNode).toHaveBeenNthCalledWith(1, 'model.orders', 'code');
    expect(onInspectNode).toHaveBeenNthCalledWith(2, 'model.orders', 'general');
    expect(onDuplicateNode).toHaveBeenCalledWith('model.orders');
    expect(onToggleNodeSelection).toHaveBeenCalledWith('model.orders', false);
    expect(onRemoveNode).toHaveBeenCalledWith('model.orders');
  });

  it('translates a valid schema resource drop into one attachment command', () => {
    const onAttachSchemaToNode = vi.fn();
    const nodeProps = {
      id: 'model.orders',
      selected: false,
      data: {
        name: 'Orders model',
        type: 'MODEL',
        status: 'idle',
        canMutateGraph: true,
        onAttachSchemaToNode,
      },
    } as unknown as ComponentProps<typeof DbtNodeComponent>;

    act(() => {
      root.render(
        <ReactFlowProvider>
          <DbtNodeComponent {...nodeProps} />
        </ReactFlowProvider>
      );
    });

    const dataTransfer = {
      types: [CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE],
      dropEffect: 'none',
      getData: vi.fn(() =>
        JSON.stringify({
          resourceId: 'schema.analytics',
          resourceType: 'schema',
          schemaName: 'analytics',
          label: 'Analytics',
        })
      ),
    };

    act(() => {
      fireEvent.drop(container.querySelector('[data-slot="canvas-node-shell"]')!, {
        dataTransfer,
      });
    });

    expect(onAttachSchemaToNode).toHaveBeenCalledOnce();
    expect(onAttachSchemaToNode).toHaveBeenCalledWith('model.orders', 'analytics');
  });

  it('ignores malformed schema resource drops without invoking mutation', () => {
    const onAttachSchemaToNode = vi.fn();
    const nodeProps = {
      id: 'model.orders',
      selected: false,
      data: {
        name: 'Orders model',
        type: 'MODEL',
        status: 'idle',
        canMutateGraph: true,
        onAttachSchemaToNode,
      },
    } as unknown as ComponentProps<typeof DbtNodeComponent>;

    act(() => {
      root.render(
        <ReactFlowProvider>
          <DbtNodeComponent {...nodeProps} />
        </ReactFlowProvider>
      );
    });

    act(() => {
      fireEvent.drop(container.querySelector('[data-slot="canvas-node-shell"]')!, {
        dataTransfer: {
          types: [CANVAS_WORKSPACE_RESOURCE_DRAG_MIME_TYPE],
          dropEffect: 'none',
          getData: () => '{',
        },
      });
    });

    expect(onAttachSchemaToNode).not.toHaveBeenCalled();
  });
});
