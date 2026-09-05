import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  BadgeContext,
  NodeDecoration,
  NodeRendererProps,
  OverlayContext,
} from './contracts/NodeRendering';
import { costContributions } from './cost/costContributions';
import { COST_ROUTE_BOOTSTRAP_HANDLE } from './cost/costRouteHandle';
import {
  getAllCanvasRuntimeRegistrations,
  getAllNodeKinds,
  getAllOverlays,
  getAllViews,
  getGraphNodeCardStrategies,
  getRouteViews,
  getShellNavigationViews,
  getNodeBadges,
  getNodeRenderer,
  getPluginPortMap,
  type RuntimeCapabilities,
} from './registry';
import type { CanonicalNode } from '../types/canonical';

const APP_ROOT = path.resolve(import.meta.dirname, '../../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

function readRepoDoc(relativePathFromRepo: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePathFromRepo), 'utf8');
}

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
      getAllNodeKinds(capabilities).map((registration) => registration.pluginId)
    ).not.toContain('dbt');
    expect(getPluginPortMap(capabilities).has('dbt')).toBe(false);
    expect(getNodeRenderer('dbt:test', FallbackRenderer, capabilities)).toBe(FallbackRenderer);
    expect(getGraphNodeCardStrategies(capabilities).map((strategy) => strategy.id)).not.toContain(
      'dbt-card'
    );
  });

  it('publishes one Canvas runtime while keeping dbt as a plugin capability', () => {
    const dbtContributionsSource = readAppSource('src/app/plugins/dbt/dbtContributions.ts');

    expect(getAllCanvasRuntimeRegistrations().map((registration) => registration.kind)).toEqual([
      'transformation',
    ]);
    expect(getAllNodeKinds().some((registration) => registration.pluginId === 'dbt')).toBe(true);
    expect(dbtContributionsSource).not.toContain('canvasKinds:');
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

  it('keeps Cost route bootstrap ownership inside the Cost contribution while runtime projection requires backend availability', () => {
    const costDashboard = costContributions.views?.find((view) => view.id === 'cost.dashboard');

    expect(costDashboard?.handle?.routeBootstrap).toBe(COST_ROUTE_BOOTSTRAP_HANDLE);
    expect(getRouteViews().find((view) => view.id === 'cost.dashboard')).toBe(costDashboard);
    expect(getAllViews().find((view) => view.id === 'cost.dashboard')).toBeUndefined();
    expect(
      getAllViews({
        plugins: {
          cost: {
            available: true,
          },
        },
      }).find((view) => view.id === 'cost.dashboard')
    ).toBe(costDashboard);
  });

  it('projects one Canvas route without peer Code, Lineage, Diff, or Artifacts views', () => {
    const shellViewIds = getShellNavigationViews().map((view) => view.id);
    const canvasRoutePaths = getRouteViews()
      .map((view) => view.path)
      .filter((routePath) => routePath === '/canvas' || routePath.startsWith('/canvas/'));

    expect(shellViewIds).toContain('dbt.canvas');
    expect(shellViewIds).toContain('dvt.templates');
    expect(shellViewIds).toContain('monitoring.runs');
    expect(shellViewIds).not.toContain('dbt.code');
    expect(shellViewIds).not.toContain('dbt.lineage');
    expect(shellViewIds).not.toContain('dbt.diff');
    expect(shellViewIds).not.toContain('dbt.artifacts');

    expect(canvasRoutePaths).toEqual(['/canvas']);
  });

  it('decorates Cost overlay nodes at explicit cost-risk thresholds', () => {
    const costOverlay = costContributions.overlays?.find((overlay) => overlay.id === 'cost');
    const node = buildCanonicalNode();
    expect(costOverlay).toBeDefined();

    const decorateCost = (cost: number | null): NodeDecoration | null => {
      if (!costOverlay) {
        throw new Error('Cost overlay contribution must be registered');
      }

      return costOverlay.nodeDecorator(node, {
        activeRun: null,
        runStatusByNodeId: new Map(),
        costByNodeId:
          cost == null
            ? new Map()
            : new Map([
                [
                  node.id,
                  {
                    nodeId: node.id,
                    cost,
                    currency: 'USD',
                  },
                ],
              ]),
        selectedNodeIds: new Set(),
        upstreamOfSelected: new Set(),
        downstreamOfSelected: new Set(),
      } satisfies OverlayContext);
    };

    expect(decorateCost(null)).toBeNull();
    expect(decorateCost(0)).toBeNull();
    expect(decorateCost(0.19)).toEqual({
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.14)',
    });
    expect(decorateCost(0.2)).toEqual({
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.18)',
    });
    expect(decorateCost(0.4)).toEqual({
      borderColor: '#dc2626',
      backgroundColor: 'rgba(220, 38, 38, 0.18)',
    });
  });

  it('keeps governed plugin UX docks as explicit runtime rails with component documentation', () => {
    const contributionContracts = readAppSource('src/app/plugins/contracts/PluginManifest.ts');
    const registry = readAppSource('src/app/plugins/registry.ts');
    const componentGuide = readRepoDoc(
      'docs/architecture/components/web/plugins/plugin-ux-integration-contract.md'
    );

    for (const dock of [
      'RouteHeaderContribution',
      'CommandPaletteContribution',
      'BottomDiagnosticsContribution',
    ]) {
      expect(contributionContracts).toContain(`interface ${dock}`);
    }

    for (const rail of [
      'getRouteHeaderContributions',
      'getCommandPaletteContributions',
      'getBottomDiagnosticsContributions',
    ]) {
      expect(registry).toContain(`export function ${rail}`);
    }

    for (const requiredSection of [
      '## Public API',
      '## Invariants',
      '## Transitions',
      '## Consumers',
      '## Architecture',
    ]) {
      expect(componentGuide).toContain(requiredSection);
    }
  });
});
