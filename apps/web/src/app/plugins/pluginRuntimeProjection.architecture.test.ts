import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

function readAppSource(relativePath: string): string {
  return readFileSync(path.resolve(import.meta.dirname, '..', relativePath), 'utf8');
}

function appSourcePath(relativePath: string): string {
  return path.resolve(import.meta.dirname, '..', relativePath);
}

const REGISTRY_SOURCE = readAppSource('plugins/registry.ts');
const EDGE_AUTHORING_SOURCE = readAppSource('views/canvas/useCanvasEdgeAuthoringHandlers.ts');
const READ_MODEL_SOURCE = readAppSource('views/canvas/useCanvasControllerReadModel.ts');
const DBT_NODE_SOURCE = readAppSource('components/canvas/DbtNodeComponent.tsx');
const PLUGIN_NODE_SOURCE = readAppSource('plugins/PluginNodeWrapper.tsx');

describe('plugin runtime projection architecture', () => {
  it('keeps plugin projections capability-aware from registry to canvas consumers', () => {
    expect(REGISTRY_SOURCE).toContain('getRuntimePlugins(capabilities)');
    expect(EDGE_AUTHORING_SOURCE).toContain('getPluginPortMap(policy.runtimeCapabilities)');
    expect(READ_MODEL_SOURCE).toContain('runtimeCapabilities,');
    expect(DBT_NODE_SOURCE).toContain(
      'getNodeBadges(canonicalNode, badgeCtx, data.runtimeCapabilities)'
    );
    expect(PLUGIN_NODE_SOURCE).toContain(
      'getNodeBadges(canonicalNode, badgeCtx, data.runtimeCapabilities)'
    );
    expect(DBT_NODE_SOURCE).toContain('data.runtimeCapabilities');
    expect(PLUGIN_NODE_SOURCE).toContain('data.runtimeCapabilities');
  });

  it('keeps Cost route bootstrap ownership inside the Cost plugin boundary', () => {
    const costContributionsPath = appSourcePath('plugins/cost/costContributions.ts');

    expect(REGISTRY_SOURCE).toContain("from './cost/costContributions'");
    expect(REGISTRY_SOURCE).not.toContain("from '../views/cost/costRouteBootstrap'");
    expect(existsSync(costContributionsPath)).toBe(true);

    const costContributionsSource = readFileSync(costContributionsPath, 'utf8');
    expect(costContributionsSource).toContain('COST_ROUTE_BOOTSTRAP_HANDLE');
    expect(costContributionsSource).toContain("from './costRouteHandle'");
    expect(costContributionsSource).not.toContain("from '../../views/cost/costRouteBootstrap'");
  });
});
