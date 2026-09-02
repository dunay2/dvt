// @vitest-environment jsdom

import { act } from 'react';
import { describe, expect, it } from 'vitest';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import {
  buildCanonicalNode,
  buildViewportGraphModelArgs,
  renderViewportGraphModel,
} from './useCanvasViewportGraphModel.test.support';

describe('useCanvasViewportGraphModel node data', () => {
  it('projects the connected origin schema onto a default DBT model card', async () => {
    const source = {
      ...buildCanonicalNode('warehouse-source', 'dvt:source', 'input'),
      pluginId: 'dvt.warehouse-source',
      metadata: { schema: 'dvt', tableName: 'orders' },
    };
    const model = {
      ...buildCanonicalNode('dbt-model', 'dbt:model', 'transform'),
      pluginId: 'dbt',
      metadata: {
        config: { schema: 'raw', table: 'model_1', materialized: 'view' },
        dbt: { schemaName: 'raw', tableName: 'model_1', materialized: 'view' },
      },
    };
    const edge = { sourceId: source.id, targetId: model.id };
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [edge],
        draftSemanticGraph: {
          canonicalNodes: [source, model],
          canonicalEdges: [{ id: 'source-model', ...edge, relation: 'lineage' }],
        },
      })
    );

    try {
      const modelData = mounted.readState()?.nodes.find((node) => node.id === model.id)?.data as
        DbtNodeData | undefined;

      expect(modelData?.metadata).toMatchObject({
        config: { schema: 'dvt', table: 'model_1' },
        dbt: { schemaName: 'dvt', selectedSourceId: source.id },
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('preserves transient column disclosure across semantic node reprojection', async () => {
    const args = buildViewportGraphModelArgs({
      visibleNodeIds: ['source-node'],
      visibleEdges: [],
      draftSemanticGraph: {
        canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
        canonicalEdges: [],
      },
    });
    const mounted = await renderViewportGraphModel(args);

    try {
      await act(async () => {
        mounted.readState()?.setNodes((nodes) =>
          nodes.map((node) => ({
            ...node,
            data: { ...node.data, columnDisclosureExpanded: true },
          }))
        );
      });
      expect(mounted.readState()?.nodes[0]?.data.columnDisclosureExpanded).toBe(true);

      await mounted.rerender(args);
      expect(mounted.readState()?.nodes[0]?.data.columnDisclosureExpanded).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });

  it('projects governed port compatibility into visible node data', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['warehouse-source', 'dbt-model'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [
            {
              ...buildCanonicalNode('warehouse-source', 'dvt:source', 'input'),
              pluginId: 'dvt.warehouse-source',
            },
            {
              ...buildCanonicalNode('dbt-model', 'dbt:model', 'transform'),
              pluginId: 'dbt',
            },
          ],
          canonicalEdges: [],
        },
      })
    );

    try {
      const sourceNode = mounted.readState()?.nodes.find((node) => node.id === 'warehouse-source');
      const modelNode = mounted.readState()?.nodes.find((node) => node.id === 'dbt-model');
      const sourceData = sourceNode?.data as DbtNodeData | undefined;
      const modelData = modelNode?.data as DbtNodeData | undefined;

      expect(sourceData?.pluginId).toBe('dvt.warehouse-source');
      expect(sourceData?.pluginKind).toBe('dvt:source');
      expect(sourceData?.portCompatibility?.source).toMatchObject({
        state: 'available',
        compatibleNodeNames: ['Dbt Model'],
      });
      expect(modelData?.portCompatibility?.target).toMatchObject({
        state: 'available',
        compatibleNodeNames: ['Warehouse Source'],
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('refreshes projected node identity details when canonical node details change', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
          canonicalEdges: [],
        },
      })
    );

    try {
      expect(mounted.readState()?.nodes[0]?.data.name).toBe('source-node');

      await mounted.rerender(
        buildViewportGraphModelArgs({
          visibleNodeIds: ['source-node'],
          visibleEdges: [],
          draftSemanticGraph: {
            canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
            canonicalEdges: [],
          },
          localCanonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              name: 'source-node-renamed',
              description: 'Edited in inspector',
            },
          ],
        })
      );

      expect(mounted.readState()?.nodes[0]?.data.name).toBe('source-node-renamed');
      expect(mounted.readState()?.nodes[0]?.data.description).toBe('Edited in inspector');
    } finally {
      await mounted.cleanup();
    }
  });

  it('refreshes projected node metadata when canonical metadata changes', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              metadata: {
                config: {
                  schema: 'raw',
                },
              },
            },
          ],
          canonicalEdges: [],
        },
      })
    );

    try {
      expect(mounted.readState()?.nodes[0]?.data.metadata).toEqual({
        config: {
          schema: 'raw',
        },
      });

      await mounted.rerender(
        buildViewportGraphModelArgs({
          visibleNodeIds: ['source-node'],
          visibleEdges: [],
          draftSemanticGraph: {
            canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
            canonicalEdges: [],
          },
          localCanonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              metadata: {
                config: {
                  schema: 'mart',
                },
              },
            },
          ],
        })
      );

      expect(mounted.readState()?.nodes[0]?.data.metadata).toEqual({
        config: {
          schema: 'mart',
        },
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('keeps recorded columns visible on node cards independent of column-lineage overlay posture', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              metadata: {
                columns: [
                  { name: 'order_id', type: 'integer' },
                  { name: 'customer_id', type: 'text' },
                ],
              },
            },
          ],
          canonicalEdges: [],
        },
      })
    );

    try {
      const nodeData = mounted.readState()?.nodes[0]?.data as DbtNodeData | undefined;

      expect(nodeData?.columns).toMatchObject([
        { name: 'order_id', type: 'integer' },
        { name: 'customer_id', type: 'text' },
      ]);
      expect(nodeData?.showColumns).toBe(true);
    } finally {
      await mounted.cleanup();
    }
  });

  it('projects inherited transform columns as the same semantic truth consumed by the card', async () => {
    const source = {
      ...buildCanonicalNode('source-node', 'dbt:source', 'input'),
      metadata: {
        columns: [
          { name: 'order_id', type: 'integer' },
          { name: 'amount', type: 'numeric' },
        ],
      },
    };
    const model = {
      ...buildCanonicalNode('model-node', 'dbt:model', 'transform'),
      path: 'models/orders.sql',
    };
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: [source.id, model.id],
        visibleEdges: [{ sourceId: source.id, targetId: model.id }],
        draftSemanticGraph: {
          canonicalNodes: [source, model],
          canonicalEdges: [
            {
              id: 'source-node->model-node',
              sourceId: source.id,
              targetId: model.id,
              relation: 'lineage',
            },
          ],
        },
      })
    );

    try {
      const modelData = mounted.readState()?.nodes.find((node) => node.id === model.id)?.data as
        DbtNodeData | undefined;

      expect(modelData?.presentationTruth?.columns).toMatchObject({
        declaredCount: 0,
        inheritedCount: 2,
        visibleCount: 2,
        visibleProvenance: 'inherited',
      });
      expect(modelData?.columns).toMatchObject([
        {
          name: 'order_id',
          type: 'integer',
          output: true,
          sourceNodeName: 'source-node',
          reference: 'source-node.order_id',
        },
        {
          name: 'amount',
          type: 'numeric',
          output: true,
          sourceNodeName: 'source-node',
          reference: 'source-node.amount',
        },
      ]);
      expect(modelData?.presentationTruth?.code).toEqual({
        kind: 'workspace-file',
        path: 'models/orders.sql',
        language: 'sql',
      });
    } finally {
      await mounted.cleanup();
    }
  });

  it('refreshes projected node tags when canonical tags change', async () => {
    const mounted = await renderViewportGraphModel(
      buildViewportGraphModelArgs({
        visibleNodeIds: ['source-node'],
        visibleEdges: [],
        draftSemanticGraph: {
          canonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              tags: ['authoring'],
            },
          ],
          canonicalEdges: [],
        },
      })
    );

    try {
      expect(mounted.readState()?.nodes[0]?.data.tags).toEqual(['authoring']);

      await mounted.rerender(
        buildViewportGraphModelArgs({
          visibleNodeIds: ['source-node'],
          visibleEdges: [],
          draftSemanticGraph: {
            canonicalNodes: [buildCanonicalNode('source-node', 'dvt:source', 'input')],
            canonicalEdges: [],
          },
          localCanonicalNodes: [
            {
              ...buildCanonicalNode('source-node', 'dvt:source', 'input'),
              tags: ['authoring', 'finance'],
            },
          ],
        })
      );

      expect(mounted.readState()?.nodes[0]?.data.tags).toEqual(['authoring', 'finance']);
    } finally {
      await mounted.cleanup();
    }
  });
});
