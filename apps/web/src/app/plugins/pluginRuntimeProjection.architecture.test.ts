import { describe, expect, it } from 'vitest';

import type { BadgeContext, NodeRendererProps } from './contracts/NodeRendering';
import { costContributions } from './cost/costContributions';
import { COST_ROUTE_BOOTSTRAP_HANDLE } from './cost/costRouteHandle';
import {
  getAllCanvasRuntimeRegistrations,
  getAllNodeKinds,
  getAllOverlays,
  getAllViews,
  getNodeBadges,
  getNodeRenderer,
  getPluginPortMap,
  type RuntimeCapabilities,
} from './registry';
import type { CanonicalNode } from '../types/canonical';

function buildRuntimeCapabilities(unavailablePluginId: string): RuntimeCapabilities {
  return {
    plugins: {
      [unavailablePluginId]: {
        available: false,
        reason: 'disabled in architecture test',
      },
    },
  };
}

function buildCanonicalNode(overrides: Partial<CanonicalNode> = {}): CanonicalNode {
  return {
    id: 'node-1',
    name: 'node-1',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
    ...overrides,
  };
}

function FallbackRenderer(_props: NodeRendererProps): null {
  return null;
}

describe('plugin runtime projection architecture', () => {
  it('projects unavailable dbt plugins out of graph-facing runtime surfaces', () => {
    const capabilities = buildRuntimeCapabilities('dbt');

    expect(getAllViews(capabilities).map((view) => view.pluginId)).not.toContain('dbt');
    expect(
      getAllCanvasRuntimeRegistrations(capabilities).map((registration) => registration.kind)
    ).not.toContain('dbt');
    expect(getAllNodeKinds(capabilities).map((registration) => registration.pluginId)).not.toContain(
      'dbt'
    );
    expect(getPluginPortMap(capabilities).has('dbt')).toBe(false);
    expect(getNodeRenderer('dbt:model', FallbackRenderer, capabilities)).toBe(FallbackRenderer);
  });

  it('projects unavailable monitoring plugins out of overlays and node badges', () => {
    const capabilities = buildRuntimeCapabilities('monitoring');
    const badgeContext: BadgeContext = {
      activeRunId: 'run-1',
      runStatusByNodeId: new Map([['node-1', 'running']]),
    };

    expect(getAllOverlays(capabilities).map((overlay) => overlay.id)).not.toContain('runtime');
    expect(getAllOverlays(capabilities).map((overlay) => overlay.id)).not.toContain('impact');
    expect(getNodeBadges(buildCanonicalNode(), badgeContext, capabilities)).toEqual([]);
  });

  it('keeps Cost route bootstrap ownership inside the Cost contribution', () => {
    const costDashboard = costContributions.views?.find((view) => view.id === 'cost.dashboard');

    expect(costDashboard?.handle?.routeBootstrap).toBe(COST_ROUTE_BOOTSTRAP_HANDLE);
    expect(getAllViews().find((view) => view.id === 'cost.dashboard')).toBe(costDashboard);
  });
});
