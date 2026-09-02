// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { Position, ReactFlowProvider } from '@xyflow/react';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useApplicationLanguageStore } from '../../../stores/applicationLanguageStore';
import { CanvasColumnLineageEdge } from '../CanvasColumnLineageEdge';

vi.mock('@xyflow/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xyflow/react')>();
  return {
    ...actual,
    BaseEdge: ({ interactionWidth: _interactionWidth, ...props }: Record<string, unknown>) =>
      React.createElement('svg', null, React.createElement('path', props)),
    EdgeLabelRenderer: ({ children }: { children: React.ReactNode }) => children,
    getBezierPath: () => ['M 0 0 C 25 0 75 40 100 40', 50, 20, 0, 0],
  };
});

describe('CanvasColumnLineageEdge', () => {
  let container: HTMLDivElement;
  let labels: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    labels = document.createElement('div');
    labels.className = 'react-flow__edgelabel-renderer';
    document.body.append(labels);
    root = createRoot(container);
    useApplicationLanguageStore.setState({ language: 'es' });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    labels.remove();
  });

  it('shows a localized keyboard-reachable removal action only for a selected semantic mapping', () => {
    const onRemove = vi.fn();
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasColumnLineageEdge
            id="lineage-1"
            source="source"
            target="model"
            sourceX={0}
            sourceY={0}
            targetX={100}
            targetY={40}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            selected
            markerEnd={undefined}
            data={{
              kind: 'column-lineage',
              sourceNodeId: 'source',
              sourceColumnName: 'order_id',
              targetNodeId: 'model',
              targetColumnName: 'order_id',
              outputId: 'output:order_id',
              removable: true,
              onRemove,
            }}
          />
        </ReactFlowProvider>
      );
    });

    const edgePath = container.querySelector('[data-slot="canvas-column-lineage-edge"]');
    const remove = document.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-column-lineage-remove"]'
    );
    expect(edgePath).not.toBeNull();
    expect(remove?.getAttribute('aria-label')).toBe('Eliminar asignación order_id a order_id');
    act(() => {
      fireEvent.click(remove!);
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('keeps terminal lineage read-only', () => {
    act(() => {
      root.render(
        <ReactFlowProvider>
          <CanvasColumnLineageEdge
            id="lineage-terminal"
            source="model"
            target="sink"
            sourceX={0}
            sourceY={0}
            targetX={100}
            targetY={40}
            sourcePosition={Position.Right}
            targetPosition={Position.Left}
            selected
            markerEnd={undefined}
            data={{
              kind: 'column-lineage-terminal',
              sourceNodeId: 'model',
              sourceColumnName: 'order_id',
              targetNodeId: 'sink',
              targetColumnName: 'order_id',
              outputId: 'output:order_id',
              removable: false,
            }}
          />
        </ReactFlowProvider>
      );
    });

    expect(document.querySelector('[data-slot="canvas-column-lineage-remove"]')).toBeNull();
  });
});
