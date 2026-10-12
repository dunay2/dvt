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

  it.each([true, false])(
    'accepts one field on the Model body only when editable (%s)',
    async (canMutateGraph) => {
      const onMapCanvasInput = vi.fn();
      const onInspectNode = vi.fn();
      const onOpenNode = vi.fn();
      const nodeProps = {
        id: 'model',
        selected: false,
        data: {
          name: 'Model',
          status: 'idle',
          pluginId: 'dvt',
          pluginKind: 'dvt:transform',
          canMutateGraph,
          onMapCanvasInput,
          onInspectNode,
          onOpenNode,
        },
      } as unknown as ComponentProps<typeof DbtNodeComponent>;
      act(() =>
        root.render(
          <ReactFlowProvider>
            <DbtNodeComponent {...nodeProps} />
          </ReactFlowProvider>
        )
      );
      const identity = { nodeId: 'source', columnId: 'country' };
      await act(() =>
        fireEvent.drop(container.querySelector('[data-slot="canvas-node-shell"]')!, {
          dataTransfer: {
            types: ['application/x-dvt-canvas-field'],
            getData: (mime: string) =>
              mime === 'application/x-dvt-canvas-field' ? JSON.stringify(identity) : '',
          },
        })
      );
      expect(onMapCanvasInput).toHaveBeenCalledTimes(canMutateGraph ? 1 : 0);
      if (canMutateGraph)
        expect(onMapCanvasInput).toHaveBeenCalledWith({
          target: { nodeId: 'model' },
          source: identity,
        });
      expect(onInspectNode).not.toHaveBeenCalled();
      expect(onOpenNode).not.toHaveBeenCalled();
    }
  );

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

  it.each([
    ['dvt:source', 'input', 'columns'],
    ['dvt:transform', 'transform', 'general'],
  ] as const)('inspects %s on click without opening or running it', (pluginKind, role, tab) => {
    const onSelectNode = vi.fn();
    const onInspectNode = vi.fn();
    const onOpenNode = vi.fn();
    const onToggleNodeSelection = vi.fn();
    const projection = projectCanvasNodeFlowAdapter({
      nodeId: 'node',
      data: {
        name: 'Node',
        status: 'idle',
        pluginKind,
        role,
        onSelectNode,
        onInspectNode,
        onOpenNode,
        onToggleNodeSelection,
      },
      selected: false,
      onColumnLayoutChange: vi.fn(),
    });
    projection.selectNode?.();
    expect(onSelectNode).toHaveBeenCalledWith('node');
    expect(onInspectNode).toHaveBeenCalledWith('node', tab);
    expect(onOpenNode).not.toHaveBeenCalled();
    expect(onToggleNodeSelection).not.toHaveBeenCalled();
  });

  it('retrieves source data only through the explicit Preview action', () => {
    const onInspectNode = vi.fn();
    const onOpenSourceDataSample = vi.fn();
    const nodeProps = {
      id: 'source.orders',
      selected: false,
      data: {
        name: 'Orders',
        type: 'SOURCE',
        status: 'idle',
        onInspectNode,
        onOpenSourceDataSample,
        dataActionLabel: 'Run',
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
      fireEvent.dblClick(container.querySelector('[data-slot="canvas-node-shell"]')!);
    });

    expect(onOpenSourceDataSample).not.toHaveBeenCalled();
    act(() => {
      fireEvent.click(container.querySelector('[data-slot="canvas-node-execute"]')!);
    });
    expect(onOpenSourceDataSample).toHaveBeenCalledOnce();
    expect(onOpenSourceDataSample).toHaveBeenCalledWith('source.orders');
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
