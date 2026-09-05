import { Circle } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { Edge } from '@xyflow/react';

import type { CanvasOverlayContribution } from '../../plugins/contracts/NodeRendering';
import type { CanonicalNode } from '../../types/canonical';
import { buildNodeDecorations, buildOverlayContext } from './canvasOverlayContext';

const node: CanonicalNode = {
  id: 'node-1',
  name: 'Node 1',
  pluginId: 'dvt',
  kind: 'dvt:transform',
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
  it('preserves exact branching impact semantics', () => {
    const context = buildOverlayContext(
      [
        { id: 'a-b', source: 'a', target: 'b' },
        { id: 'a-c', source: 'a', target: 'c' },
        { id: 'b-d', source: 'b', target: 'd' },
        { id: 'c-d', source: 'c', target: 'd' },
        { id: 'd-e', source: 'd', target: 'e' },
      ],
      ['d'],
      null,
      new Map(),
      new Map()
    );

    expect([...context.upstreamOfSelected].sort()).toEqual(['a', 'b', 'c']);
    expect([...context.downstreamOfSelected].sort()).toEqual(['e']);
    expect(context.upstreamOfSelected.has('d')).toBe(false);
    expect(context.downstreamOfSelected.has('d')).toBe(false);
  });

  it('preserves per-root exclusion and union semantics for multiple roots in a cycle', () => {
    const context = buildOverlayContext(
      [
        { id: 'a-b', source: 'a', target: 'b' },
        { id: 'b-c', source: 'b', target: 'c' },
        { id: 'c-a', source: 'c', target: 'a' },
        { id: 'c-d', source: 'c', target: 'd' },
        { id: 'x-b', source: 'x', target: 'b' },
      ],
      ['b', 'd'],
      null,
      new Map(),
      new Map()
    );

    expect([...context.upstreamOfSelected].sort()).toEqual(['a', 'b', 'c', 'x']);
    expect([...context.downstreamOfSelected].sort()).toEqual(['a', 'c', 'd']);
  });

  it('enumerates edges once for adjacency construction and skips them when Impact is disabled', () => {
    const sourceEdges: Edge[] = [
      { id: 'a-b', source: 'a', target: 'b' },
      { id: 'b-c', source: 'b', target: 'c' },
      { id: 'c-d', source: 'c', target: 'd' },
    ];
    let edgeVisits = 0;
    const countedEdges = new Proxy(sourceEdges, {
      get(target, property, receiver) {
        if (property !== Symbol.iterator) {
          return Reflect.get(target, property, receiver);
        }

        return function* countedIterator() {
          for (const edge of target) {
            edgeVisits += 1;
            yield edge;
          }
        };
      },
    });

    buildOverlayContext(countedEdges, ['a', 'c'], null, new Map(), new Map(), true);
    expect(edgeVisits).toBe(sourceEdges.length);

    edgeVisits = 0;
    const disabledContext = buildOverlayContext(
      countedEdges,
      ['a'],
      null,
      new Map(),
      new Map(),
      false
    );
    expect(edgeVisits).toBe(0);
    expect(disabledContext.upstreamOfSelected.size).toBe(0);
    expect(disabledContext.downstreamOfSelected.size).toBe(0);
  });

  it('invokes every active decorator once per node', () => {
    const nodes = [node, { ...node, id: 'node-2' }, { ...node, id: 'node-3' }];
    let invocationCount = 0;
    const countInvocation = (): null => {
      invocationCount += 1;
      return null;
    };
    const context = buildOverlayContext([], [], null, new Map(), new Map());
    const decorations = buildNodeDecorations(
      nodes,
      [
        overlay('runtime', 'exclusive', countInvocation),
        overlay('impact', 'additive', countInvocation),
        overlay('health', 'additive', countInvocation),
      ],
      'runtime',
      context
    );

    expect(decorations.size).toBe(nodes.length);
    expect(invocationCount).toBe(nodes.length * 3);
  });

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
