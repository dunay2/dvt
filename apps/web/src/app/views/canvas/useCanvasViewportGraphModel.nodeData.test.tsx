// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import {
  buildCanonicalNode,
  buildViewportGraphModelArgs,
  renderViewportGraphModel,
} from './useCanvasViewportGraphModel.test.support';

describe('useCanvasViewportGraphModel node data', () => {
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

      expect(sourceData?.portCompatibility?.source).toMatchObject({
        state: 'available',
        compatibleNodeNames: ['dbt-model'],
      });
      expect(modelData?.portCompatibility?.target).toMatchObject({
        state: 'available',
        compatibleNodeNames: ['warehouse-source'],
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
