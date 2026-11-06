// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  setupWorkbenchTest,
  COPY,
  root,
  container,
  sourceNode,
  edge,
} from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import * as analysis from './canvasRelationalAnalysis';
import { analysisChain, withdrawChainSource } from './canvasRelationalAnalysisMemo.test-support';
import { CanvasRelationalTreeWorkbench } from './CanvasRelationalTreeWorkbench';

describe('Workbench shared analysis lifecycle', () => {
  setupWorkbenchTest();
  afterEach(() => vi.restoreAllMocks());

  it('removes the mounted consumer tree on indirect withdrawal and restores it without reopening', async () => {
    const graph = analysisChain();
    const analyze = vi.spyOn(analysis, 'analyzeCanvasRelations');
    const render = async (nodes: typeof graph.nodes): Promise<void> => {
      await act(async () =>
        root.render(
          <CanvasRelationalTreeWorkbench
            transformNode={graph.node}
            nodes={nodes}
            edges={graph.edges}
            copy={COPY}
          />
        )
      );
    };
    await render(graph.nodes);
    expect(container.querySelector('[data-slot="canvas-relational-tree-node"]')).not.toBeNull();
    expect(container.textContent).not.toContain(COPY.relationalTreeInputIdentityUnavailableMessage);
    expect(analyze).toHaveBeenCalledTimes(1);
    await render(withdrawChainSource(graph.nodes));
    expect(container.textContent).toContain(COPY.relationalTreeInputIdentityUnavailableMessage);
    expect(container.querySelector('[data-slot="canvas-relational-tree-node"]')).toBeNull();
    expect(analyze).toHaveBeenCalledTimes(2);
    await render(graph.nodes);
    expect(container.textContent).not.toContain(COPY.relationalTreeInputIdentityUnavailableMessage);
    expect(container.querySelector('[data-slot="canvas-relational-tree-node"]')).not.toBeNull();
    expect(analyze).toHaveBeenCalledTimes(3);
  });

  it('shares one structural analysis and does not repeat it when selecting another occurrence', async () => {
    const graph = occurrenceGraph();
    const analyze = vi.spyOn(analysis, 'analyzeCanvasRelations');
    let model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    function Host(): React.JSX.Element {
      model = useCanvasRelationalTreeWorkbenchModel({
        transformNode: graph.targetNode,
        nodes: graph.nodes,
        edges: graph.edges,
        copy: COPY,
      });
      return <output>{model.selectedLocator}</output>;
    }
    act(() => root.render(<Host />));
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(model!.inputs).toHaveLength(1);
    expect(model!.projection!.inputs).toHaveLength(2);
    const children = model!.projection!.root.children;
    expect(children).toHaveLength(2);
    for (const child of children) {
      await act(async () => model!.selectTreeNode(child.node.locator));
      expect(model!.selectedNode?.relationId).toBe(child.node.relationId);
    }
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('keeps analysis across refreshed Canvas node wrappers and display-only changes', async () => {
    const graph = occurrenceGraph();
    const analyze = vi.spyOn(analysis, 'analyzeCanvasRelations');
    let model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    function Host(): React.JSX.Element {
      model = useCanvasRelationalTreeWorkbenchModel({
        transformNode: graph.targetNode,
        nodes: graph.nodes,
        edges: graph.edges,
        copy: COPY,
      });
      return <output>{model.selectedLocator}</output>;
    }
    await act(async () => root.render(<Host />));
    const owner = model!.session.analysis!.session;
    const first = await owner.query(null);
    const work = owner.work;
    graph.targetNode = { ...graph.targetNode, name: 'Display only' };
    graph.nodes = graph.nodes.map((node) =>
      node.id === graph.targetNode.id ? graph.targetNode : { ...node }
    );
    graph.edges = [...graph.edges];
    await act(async () => root.render(<Host />));
    expect(model!.session.analysis!.session).toBe(owner);
    expect(await owner.query(null)).toEqual(first);
    expect(owner.work).toEqual(work);
    expect(analyze).toHaveBeenCalledTimes(1);
  });

  it('revises samples for used producer changes but not unused catalogue additions', async () => {
    const graph = occurrenceGraph();
    let nodes = graph.nodes;
    let edges = graph.edges;
    let model: ReturnType<typeof useCanvasRelationalTreeWorkbenchModel>;
    function Host(): React.JSX.Element {
      model = useCanvasRelationalTreeWorkbenchModel({
        transformNode: graph.targetNode,
        nodes,
        edges,
        copy: COPY,
      });
      return <output>{model.inputRevision}</output>;
    }
    await act(async () => root.render(<Host />));
    const revision = model!.inputRevision;
    const unused = sourceNode('unused', 'unused');
    nodes = [...nodes, unused];
    edges = [...edges, { ...edge(unused.id), targetId: graph.targetNode.id }];
    await act(async () => root.render(<Host />));
    expect(model!.inputRevision).toBe(revision);
    nodes = nodes.map((node) =>
      node.id === graph.source.id
        ? {
            ...node,
            metadata: { ...node.metadata, columns: [{ name: 'customer_id', type: 'numeric' }] },
          }
        : node
    );
    await act(async () => root.render(<Host />));
    expect(model!.inputRevision).not.toBe(revision);
    nodes = nodes.filter((node) => node.id !== graph.source.id);
    await act(async () => root.render(<Host />));
    expect(model!.projection).toBeNull();
  });
});
