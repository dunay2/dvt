import { Circle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import type { CanvasOverlayContribution } from '../../plugins/contracts/NodeRendering';
import type { CanonicalNode } from '../../types/canonical';
import { buildNodeDecorations, buildOverlayContext } from './canvasOverlayContext';

const node: CanonicalNode = {
  id: 'node-1',
  name: 'Node 1',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

function overlay(
  id: string,
  mode: CanvasOverlayContribution['mode'],
  nodeDecorator: CanvasOverlayContribution['nodeDecorator']
): CanvasOverlayContribution {
  return {
    id,
    label: id,
    icon: Circle,
    mode,
    priority: 10,
    nodeDecorator,
  };
}

describe('canvas overlay projection', () => {
  it('omits throwing decorators while preserving null and healthy overlays', () => {
    const context = buildOverlayContext([], [], null, new Map(), new Map());
    const decorations = buildNodeDecorations(
      [node],
      [
        overlay('failing-exclusive', 'exclusive', () => {
          throw new Error('exclusive overlay failed');
        }),
        overlay('null-additive', 'additive', () => null),
        overlay('failing-additive', 'additive', () => {
          throw new Error('additive overlay failed');
        }),
        overlay('healthy-additive', 'additive', () => ({ borderColor: '#22c55e' })),
      ],
      'failing-exclusive',
      context
    );

    expect(decorations.get(node.id)).toEqual({ borderColor: '#22c55e' });
  });
});
