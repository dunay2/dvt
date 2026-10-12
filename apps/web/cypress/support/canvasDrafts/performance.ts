/**
 * Owned concern: construct bounded canvas performance graphs from the column-mapping scenario.
 * @baseline GH-3578: fixture construction is independent of browser transport.
 * @decision Preserve scenario data and reuse the existing draft contract.
 * @consequence Consumers share one builder without browser globals or HTTP effects.
 * @version 1.0.0
 */
import type { CanonicalNode } from '../../../src/app/types/canonical';

import { buildColumnMappingDraft } from './columnMapping';
import { buildScenarioDraft } from './scenario';
import type { CanvasAuthoringDraft } from './scenario';

export function buildPerformanceDraft(
  performanceGraphNodeCount: 10 | 30 | 60
): CanvasAuthoringDraft {
  const baseDraft = buildColumnMappingDraft(
    {
      id: 'main-canvas',
      kind: 'transformation',
      title: `Canvas performance ${performanceGraphNodeCount} nodes`,
    },
    { sourceInspectorOrdering: true }
  );
  const additionalNodeCount = performanceGraphNodeCount - baseDraft.nodes.length;
  const performanceSources: CanonicalNode[] = ['left', 'right'].map((side) => ({
    id: `performance-source-${side}`,
    name: `Performance source ${side}`,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      schema: 'performance',
      tableName: `customers_${side}`,
      connectedSourceRef: {
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: 'canvas-e2e-postgres',
          provider: 'postgres',
        },
        sourceObjectId: `performance.customers_${side}`,
      },
      columns: [
        { name: 'customer_id', type: 'string', nullable: false },
        { name: 'name', type: 'string', nullable: false },
      ],
    },
  }));
  const additionalTransformNodes: CanonicalNode[] = Array.from(
    { length: additionalNodeCount - performanceSources.length },
    (_, index) => ({
      id: `performance-model-${String(index + 1).padStart(2, '0')}`,
      name: `Performance model ${index + 1}`,
      pluginId: 'dvt',
      kind: 'dvt:transform',
      role: 'transform',
      status: 'idle',
      tags: ['transform'],
      metadata: {},
    })
  );
  const additionalNodes = [...performanceSources, ...additionalTransformNodes];

  return buildScenarioDraft({
    canvas: baseDraft.canvas,
    nodePositions: {
      ...baseDraft.nodePositions,
      ...Object.fromEntries(
        performanceSources.map((node, index) => [node.id, { x: 1000, y: 550 + index * 260 }])
      ),
      ...Object.fromEntries(
        additionalTransformNodes.map((node, index) => [
          node.id,
          { x: 1320 + (index % 3) * 320, y: 550 + (index % 2) * 260 },
        ])
      ),
    },
    nodes: [...baseDraft.nodes, ...additionalNodes],
    edges: [
      ...baseDraft.edges,
      {
        id: 'edge-performance-left-model-01',
        sourceId: 'performance-source-left',
        targetId: 'performance-model-01',
        relation: 'lineage' as const,
      },
      {
        id: 'edge-performance-right-model-02',
        sourceId: 'performance-source-right',
        targetId: 'performance-model-02',
        relation: 'lineage' as const,
      },
      ...additionalTransformNodes.slice(2).map((node) => ({
        id: `edge-source-${node.id}`,
        sourceId: 'source-orders',
        targetId: node.id,
        relation: 'lineage' as const,
      })),
      {
        id: 'edge-performance-model-01-model-03',
        sourceId: 'performance-model-01',
        targetId: 'performance-model-03',
        relation: 'lineage' as const,
      },
      {
        id: 'edge-performance-model-02-model-04',
        sourceId: 'performance-model-02',
        targetId: 'performance-model-04',
        relation: 'lineage' as const,
      },
    ],
  });
}
