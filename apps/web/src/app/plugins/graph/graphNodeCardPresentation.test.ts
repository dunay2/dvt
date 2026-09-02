import { describe, expect, it, vi } from 'vitest';

import type { NodeRendererProps } from '../contracts/NodeRendering';
import { projectGraphNodeCardViewProps } from './graphNodeCardReadModel';

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
  it('projects one shared renderer contract without losing presentation state', () => {
    const props = projectGraphNodeCardViewProps(rendererProps());

    expect(props).toMatchObject({
      typeLabel: 'Transform',
      selected: true,
      hovered: false,
      dimmed: true,
      showColumns: true,
      tags: [{ value: 'critical', label: 'Critical' }],
      columns: [{ name: 'order_id', type: 'integer', nullable: false }],
      overlayStyle: {
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
      },
      nodeId: 'transform-1',
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
