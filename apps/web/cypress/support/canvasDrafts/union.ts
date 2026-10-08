/**
 * Owned concern: construct the two-source UNION catalogue with stable node and edge identities.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import type { CanonicalNode } from '../../../src/app/types/canonical';

import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft } from './scenario';

export function buildUnionDraft(canvas: CanvasAuthoringDraft['canvas']): CanvasAuthoringDraft {
  const connectionRef = {
    schemaVersion: 'connection-ref.v1' as const,
    connectionId: 'warehouse-a',
    provider: 'postgres' as const,
  };
  const fields = ['customer_id', 'name', 'country'];
  const source = (id: string, table: string): CanonicalNode => ({
    id,
    name: table,
    pluginId: 'dvt',
    kind: 'dvt:source',
    role: 'input' as const,
    status: 'idle' as const,
    tags: ['source'],
    metadata: {
      sourceName: table,
      schema: 'public',
      tableName: table,
      columns: fields.map((name) => ({ name, type: 'string' })),
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1' as const,
        connectionRef,
        sourceObjectId: `public.${table}`,
      },
    },
  });
  const sides = ['north', 'south'];
  const sources = sides.map((side) => source(`source-customers-${side}`, `customers_${side}`));
  return buildScenarioDraft({
    canvas,
    nodePositions: {
      ...Object.fromEntries(
        sources.map((source, index) => [source.id, { x: 40, y: 100 + index * 240 }])
      ),
      'union-transform': { x: 420, y: 220 },
    },
    nodes: [
      ...sources,
      {
        id: 'union-transform',
        name: 'All customers',
        pluginId: 'dvt',
        kind: 'dvt:transform',
        role: 'transform',
        status: 'idle',
        tags: ['authoring'],
        metadata: {},
      },
    ],
    edges: sources.map((source, index) => ({
      id: `${sides[index]}-union`,
      sourceId: source.id,
      targetId: 'union-transform',
      relation: 'lineage' as const,
    })),
  });
}
