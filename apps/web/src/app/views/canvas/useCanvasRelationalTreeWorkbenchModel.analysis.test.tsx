// @vitest-environment jsdom
import React, { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupWorkbenchTest, COPY, root } from './CanvasRelationalTreeWorkbench.test-support';
import { occurrenceGraph } from './relational-source-occurrence/occurrence.test.fixtures';
import { useCanvasRelationalTreeWorkbenchModel } from './useCanvasRelationalTreeWorkbenchModel';
import * as analysis from './canvasRelationalAnalysis';

describe('Workbench shared analysis lifecycle', () => {
  setupWorkbenchTest();
  afterEach(() => vi.restoreAllMocks());

  it('shares one structural analysis and does not repeat it when selecting another occurrence', () => {
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
      act(() => model!.selectTreeNode(child.node.locator));
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
});
