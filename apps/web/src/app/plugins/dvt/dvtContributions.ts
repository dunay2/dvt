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
  canvasKinds: [
    {
      kind: 'transformation',
      pluginId: DVT_PLUGIN_ID,
      label: 'Transformation',
      description: 'Flow-based transformation canvas for the protected authoring draft.',
      createTitle: 'Transformation canvas',
      emptyState: {
        title: 'Start transformation canvas',
        editableMessage:
          'Start this transformation canvas by adding a governed source, SQL transform, or sink node.',
        firstNodeLabel: 'Add first transformation node',
        firstNodeHelper:
          'Choose a governed transformation node kind to start this protected authoring flow.',
      },
      nodeKinds: DVT_AUTHORING_NODE_KINDS,
    },
  ],
  nodeRenderers,
  connectionRules: [
    { sourceKind: 'dvt:source', targetKind: 'dvt:sql_transform', allowed: true },
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
