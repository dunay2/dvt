/** Owned concern: publish bounded HTTP JSON acquisition Canvas contributions. */
import { GraphNodeRenderer } from '../graph/GraphNodeRenderer';
import type { PluginContributions } from '../registry';
import { HTTP_JSON_NODE_KINDS } from './httpJsonNodeTypeCatalog';

export const HTTP_JSON_PLUGIN_ID = 'dvt.http-json';

export const httpJsonContributions: PluginContributions = {
  id: HTTP_JSON_PLUGIN_ID,
  displayName: 'DVT HTTP JSON',
  version: '1.0.0',
  capabilities: ['canvas.render', 'canvas.edit', 'plan.preview'],
  nodeKinds: HTTP_JSON_NODE_KINDS,
  nodeRenderers: new Map(
    HTTP_JSON_NODE_KINDS.map((kind) => [
      kind.kind,
      { kind: kind.kind, priority: 100, component: GraphNodeRenderer },
    ])
  ),
  connectionRules: [
    {
      sourceKind: '*',
      targetKind: '*',
      allowed: false,
      reason: 'HTTP acquisition nodes do not accept incoming graph edges',
    },
  ],
  produces: [{ portType: 'data.artifacts', forRoles: ['input'] }],
  consumes: [],
};
