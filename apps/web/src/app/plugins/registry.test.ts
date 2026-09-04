import { afterEach, describe, expect, it } from 'vitest';

import type { BadgeContext } from './contracts/NodeRendering';
import type { InspectorPanelContribution } from './contracts/PluginManifest';
import {
  getBottomDiagnosticsContributions,
  getCommandPaletteContributions,
  getAllCanvasKinds,
  getAllOverlays,
  getNodeBadges,
  getInspectorPanels,
  getSourceImportOptions,
  getRuntimePlugins,
  PLUGIN_REGISTRY,
  getPluginPortMap,
  getSourceImportContributions,
  getRouteHeaderContributions,
  mapRunToCanonical,
  type PluginContributions,
  type RuntimeCapabilities,
} from './registry';
import type { CanonicalNode, CanonicalRun } from '../types/canonical';

const registeredTestPluginIds = new Set<string>();

function registerTestPlugin(plugin: PluginContributions): void {
  PLUGIN_REGISTRY.push(plugin);
  registeredTestPluginIds.add(plugin.id);
}

afterEach(() => {
  for (let index = PLUGIN_REGISTRY.length - 1; index >= 0; index -= 1) {
    const plugin = PLUGIN_REGISTRY[index];
    if (plugin && registeredTestPluginIds.has(plugin.id)) {
      PLUGIN_REGISTRY.splice(index, 1);
    }
  }
  registeredTestPluginIds.clear();
});

function buildRuntimeCapabilities(unavailablePluginId: string): RuntimeCapabilities {
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
  it('projects plugin-owned Canvas copy in the selected language', () => {
    const transformation = getAllCanvasKinds(undefined, 'es-ES').find(
      (registration) => registration.kind === 'transformation'
    );

    expect(transformation).toMatchObject({
      label: 'Transformación',
      createTitle: 'Canvas de transformación',
    });
  });

  it('excludes backend-backed plugins until the backend publishes an available capability row', () => {
    const backendPlugin = PLUGIN_REGISTRY.find((plugin) => plugin.backendPluginId);

    expect(backendPlugin?.backendPluginId).toBeDefined();
    if (!backendPlugin?.backendPluginId) {
      return;
    }

    expect(getRuntimePlugins().map((plugin) => plugin.id)).not.toContain(backendPlugin.id);
    expect(getRuntimePlugins({ plugins: {} }).map((plugin) => plugin.id)).not.toContain(
      backendPlugin.id
    );
    expect(
      getRuntimePlugins({
        plugins: {
          [backendPlugin.backendPluginId]: {
            available: true,
          },
        },
      }).map((plugin) => plugin.id)
    ).toContain(backendPlugin.id);
  });

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

  it('projects governed UX dock contributions through dedicated runtime rails', () => {
    const capabilities = buildRuntimeCapabilities('monitoring');

    expect(getRouteHeaderContributions().map((contribution) => contribution.id)).toContain(
      'monitoring.runs.status'
    );
    expect(getCommandPaletteContributions().map((contribution) => contribution.id)).toContain(
      'monitoring.open-runs'
    );
    expect(getBottomDiagnosticsContributions().map((contribution) => contribution.id)).toContain(
      'monitoring.run-events'
    );

    expect(getRouteHeaderContributions(capabilities)).toEqual([]);
    expect(getCommandPaletteContributions(capabilities)).toEqual([]);
    expect(getBottomDiagnosticsContributions(capabilities)).toEqual([]);
  });

  it('projects warehouse source import independently from dbt runtime availability', () => {
    const sourceImportContributions = getSourceImportContributions();
    const warehouseImport = sourceImportContributions.find(
      (contribution) => contribution.pluginId === 'dvt.warehouse-source'
    );

    expect(sourceImportContributions.map((contribution) => contribution.pluginId)).toEqual([
      'dvt.warehouse-source',
    ]);
    expect(warehouseImport?.artifactKind).toBe('warehouse-source');
    expect(getSourceImportOptions().map((option) => option.id)).toEqual([
      'includeColumns',
      'addTests',
      'addFreshness',
    ]);
    expect(
      getSourceImportOptions().find((option) => option.id === 'includeColumns')?.defaultEnabled
    ).toBe(true);
    expect(
      getSourceImportOptions(buildRuntimeCapabilities('dbt')).map((option) => option.id)
    ).toEqual(['includeColumns', 'addTests', 'addFreshness']);
    expect(getSourceImportOptions(buildRuntimeCapabilities('dvt.warehouse-source'))).toEqual([]);
  });

  it('continues run projection after a plugin adapter throws', () => {
    const canonicalRun: CanonicalRun = {
      runId: 'run-1',
      planId: 'plan-1',
      pluginId: 'healthy-run-adapter',
      status: 'completed',
      startedAt: '2026-08-01T00:00:00.000Z',
      environment: 'test',
      tasks: [],
    };
    registerTestPlugin({
      id: 'failing-run-adapter',
      displayName: 'Failing run adapter',
      version: '1.0.0',
      runAdapter: {
        mapToCanonical: () => {
          throw new Error('run mapping failed');
        },
      },
    });
    registerTestPlugin({
      id: 'null-run-adapter',
      displayName: 'Null run adapter',
      version: '1.0.0',
      runAdapter: { mapToCanonical: () => null },
    });
    registerTestPlugin({
      id: 'healthy-run-adapter',
      displayName: 'Healthy run adapter',
      version: '1.0.0',
      runAdapter: { mapToCanonical: () => canonicalRun },
    });

    expect(mapRunToCanonical({ id: 'plugin-run' })).toEqual(canonicalRun);
  });

  it('omits a failing inspector predicate while preserving false and healthy panels', () => {
    const panel = (id: string, shouldShow: () => boolean): InspectorPanelContribution => ({
      id,
      pluginId: id,
      label: id,
      icon: (() => null) as unknown as InspectorPanelContribution['icon'],
      order: id === 'healthy-panel' ? 10 : 20,
      shouldShow,
      component: () => null,
    });
    registerTestPlugin({
      id: 'inspector-callbacks',
      displayName: 'Inspector callbacks',
      version: '1.0.0',
      inspectorPanels: [
        panel('failing-panel', () => {
          throw new Error('predicate failed');
        }),
        panel('hidden-panel', () => false),
        panel('healthy-panel', () => true),
      ],
    });

    const panels = getInspectorPanels(buildCanonicalNode(), {
      activeRunId: null,
      registeredPlugins: new Set(),
    });

    expect(panels.map(({ id }) => id)).toContain('healthy-panel');
    expect(panels.map(({ id }) => id)).not.toContain('failing-panel');
    expect(panels.map(({ id }) => id)).not.toContain('hidden-panel');
  });

  it('omits a failing badge callback while preserving null and healthy badges', () => {
    registerTestPlugin({
      id: 'badge-callbacks',
      displayName: 'Badge callbacks',
      version: '1.0.0',
      nodeBadges: [
        {
          id: 'failing-badge',
          pluginId: 'badge-callbacks',
          forKinds: 'all',
          priority: 30,
          getBadge: () => {
            throw new Error('badge failed');
          },
        },
        {
          id: 'null-badge',
          pluginId: 'badge-callbacks',
          forKinds: 'all',
          priority: 20,
          getBadge: () => null,
        },
        {
          id: 'healthy-badge',
          pluginId: 'badge-callbacks',
          forKinds: 'all',
          priority: 10,
          getBadge: () => ({ text: 'Healthy', color: 'green', position: 'top-right' }),
        },
      ],
    });

    const badges = getNodeBadges(buildCanonicalNode(), {
      activeRunId: null,
      runStatusByNodeId: new Map(),
    });

    expect(badges.map(({ text }) => text)).toContain('Healthy');
  });
});
