import type { PluginContributions } from '../registry';
import { DbtNodeRenderer } from '../dbt/DbtNodeRenderer';
import { DVT_AUTHORING_NODE_KINDS } from '../nodeTypeCatalog.dbt';

const DVT_PLUGIN_ID = 'dvt';

const nodeRenderers = new Map(
  DVT_AUTHORING_NODE_KINDS.map((kind) => [
    kind.kind,
    {
      kind: kind.kind,
      priority: 100,
      component: DbtNodeRenderer,
    },
  ])
);

export const dvtContributions: PluginContributions = {
  id: DVT_PLUGIN_ID,
  displayName: 'DVT',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit'],
  nodeKinds: DVT_AUTHORING_NODE_KINDS,
  nodeRenderers,
  connectionRules: [
    { sourceKind: 'dvt:sql_transform', targetKind: 'dvt:sink', allowed: true },
    {
      sourceKind: 'dvt:sink',
      targetKind: '*',
      allowed: false,
      reason: 'Sinks are terminal nodes',
    },
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Connection not permitted by DVT authoring rules',
    },
  ],
  produces: [{ portType: 'data.tabular', forRoles: ['transform'] }],
  consumes: [{ portType: 'data.tabular', forRoles: ['transform'] }],
};
