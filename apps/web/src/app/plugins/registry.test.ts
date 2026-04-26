import { describe, expect, it } from 'vitest';

import type { BadgeContext } from './contracts/NodeRendering';
import {
  getAllOverlays,
  getNodeBadges,
  getPluginPortMap,
  type RuntimeCapabilities,
} from './registry';
import type { CanonicalNode } from '../types/canonical';

function buildRuntimeCapabilities(
  unavailablePluginId: string
): RuntimeCapabilities {
  return {
    plugins: {
      [unavailablePluginId]: {
        available: false,
        reason: 'disabled in test',
      },
    },
  };
}

function buildCanonicalNode(): CanonicalNode {
  return {
    id: 'node-1',
    name: 'node-1',
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: [],
  };
}

describe('plugin runtime projection', () => {
  it('excludes unavailable plugins from connection port maps', () => {
    const pluginPortMap = getPluginPortMap(buildRuntimeCapabilities('dbt'));

    expect(pluginPortMap.has('dbt')).toBe(false);
    expect(pluginPortMap.has('dvt')).toBe(true);
  });

  it('excludes unavailable plugins from overlays', () => {
    const overlays = getAllOverlays(buildRuntimeCapabilities('monitoring'));

    expect(overlays.map((overlay) => overlay.id)).not.toContain('runtime');
    expect(overlays.map((overlay) => overlay.id)).not.toContain('impact');
  });

  it('excludes unavailable plugins from node badges', () => {
    const badgeContext: BadgeContext = {
      activeRunId: 'run-1',
      runStatusByNodeId: new Map([['node-1', 'running']]),
    };

    const badges = getNodeBadges(
      buildCanonicalNode(),
      badgeContext,
      buildRuntimeCapabilities('monitoring')
    );

    expect(badges).toEqual([]);
  });
});
