import { describe, expect, it, vi } from 'vitest';

import type { NodeRendererProps } from '../contracts/NodeRendering';
import { projectGraphNodeCardViewProps } from './graphNodeCardReadModel';
import { canvasColumnTruth } from '../../views/canvas/canvasPresentationColumns';

function rendererProps(): NodeRendererProps {
  return {
    node: {
      id: 'transform-1',
      name: 'Transform 1',
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: ['finance'],
    },
    selected: true,
    hovered: false,
    overlayDecoration: {
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37, 99, 235, 0.1)',
      dimmed: true,
    },
    badges: [],
    graphNodeCardStrategies: [],
    data: {
      typeLabel: 'Transform',
      showColumns: true,
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      displayTags: [{ value: 'critical', label: 'Critical' }],
    },
  };
}

describe('projectGraphNodeCardViewProps', () => {
  it.each(['ready', 'pending', 'unavailable', 'unconfigured'] as const)(
    'preserves %s output state even when the canonical schema has no fields',
    (state) => {
      const props = rendererProps();
      const view = projectGraphNodeCardViewProps({
        ...props,
        data: {
          ...props.data,
          columns: [],
          inputColumns: [],
          presentationTruth: {
            columns: { ...canvasColumnTruth([], []), state },
            code: { kind: 'unavailable' },
          },
        },
      });
      expect(view.columnSection).toMatchObject({
        outputState: state,
        columns: [],
        inputColumns: [],
      });
    }
  );
  it('projects one shared renderer contract without losing presentation state', () => {
    const props = projectGraphNodeCardViewProps(rendererProps());

    expect(props).toMatchObject({
      selected: true,
      hovered: false,
      dimmed: true,
      tags: [{ value: 'critical', label: 'Critical' }],
      columnSection: {
        columns: [{ name: 'order_id', type: 'integer', nullable: false }],
        nodeId: 'transform-1',
      },
      overlayStyle: {
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
      },
    });
  });

  it('keeps node inspection on the existing InspectCanvasNode callback', () => {
    const onInspectNode = vi.fn();
    const props = projectGraphNodeCardViewProps({
      ...rendererProps(),
      data: { ...rendererProps().data, onInspectNode },
    });

    props.onOpenCode?.();

    expect(onInspectNode).toHaveBeenCalledWith('transform-1', 'code');
  });
});
