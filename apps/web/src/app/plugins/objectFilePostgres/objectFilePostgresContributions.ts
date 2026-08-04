/** Owned concern: publish object-file PostgreSQL Canvas contributions through the plugin registry. */
import { GraphNodeRenderer } from '../graph/GraphNodeRenderer';
import type { PluginContributions } from '../registry';
import { OBJECT_FILE_POSTGRES_NODE_KINDS } from './objectFilePostgresNodeTypeCatalog';

export const OBJECT_FILE_POSTGRES_PLUGIN_ID = 'dvt.object-file-postgres';

const nodeRenderers = new Map(
  OBJECT_FILE_POSTGRES_NODE_KINDS.map((kind) => [
    kind.kind,
    {
      kind: kind.kind,
      priority: 100,
      component: GraphNodeRenderer,
    },
  ])
);

export const objectFilePostgresContributions: PluginContributions = {
  id: OBJECT_FILE_POSTGRES_PLUGIN_ID,
  displayName: 'DVT Object-file PostgreSQL',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.preview'],
  nodeKinds: OBJECT_FILE_POSTGRES_NODE_KINDS,
  nodeRenderers,
  connectionRules: [
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'Object-file loads do not accept incoming object-file load edges',
    },
  ],
  produces: [{ portType: 'data.tabular', forRoles: ['input'] }],
  consumes: [],
};
