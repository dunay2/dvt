import { describe, expect, it } from 'vitest';

import type { OverlayContext } from '../contracts/NodeRendering';
import type { CanonicalNode } from '../../types/canonical';
import { costContributions } from './costContributions';

const node: CanonicalNode = {
  id: 'node-1',
  name: 'node-1',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};

function buildOverlayContext(cost: number): OverlayContext {
  return {
    activeRun: null,
    costByNodeId: new Map([['node-1', { nodeId: 'node-1', cost, currency: 'USD' }]]),
    downstreamOfSelected: new Set(),
    runStatusByNodeId: new Map(),
    selectedNodeIds: new Set(),
    upstreamOfSelected: new Set(),
  };
}

describe('costContributions', () => {
  it('declares the cost route and cost heatmap overlay', () => {
    expect(costContributions.id).toBe('cost');
    expect(costContributions.views?.map((view) => view.path)).toContain('/cost');
    expect(costContributions.overlays?.map((overlay) => overlay.id)).toContain('cost');
  });

  it('does not advertise graph nodes or data ports without an execution consumer', () => {
    expect(costContributions.nodeKinds ?? []).toEqual([]);
    expect(costContributions.produces ?? []).toEqual([]);
    expect(costContributions.consumes ?? []).toEqual([]);
  });

  it('projects high cost nodes with the governed heatmap decoration', () => {
    const overlay = costContributions.overlays?.find((candidate) => candidate.id === 'cost');

    expect(overlay?.nodeDecorator(node, buildOverlayContext(0.5))).toEqual({
      backgroundColor: 'rgba(220, 38, 38, 0.18)',
      borderColor: '#dc2626',
    });
    expect(overlay?.nodeDecorator(node, buildOverlayContext(0))).toBeNull();
  });
});
