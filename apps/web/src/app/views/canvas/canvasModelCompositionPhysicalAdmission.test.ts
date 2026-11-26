/** Physical-resource admission preserves valid publications and never stages an ambiguous Input. */
import { describe, expect, it } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { getPluginPortMap } from '../../plugins/registry';
import { emptyModel } from './canvasColumnOutputAuthoring.test-support';
import { createModelOutputDependencyFixture } from './canvasModelOutputDependency.test-support';
import { prepareCanvasModelWorkingCopy } from './canvasModelWorkingCopy';
import {
  admitCanvasModelCopiesToSession,
  prepareCanvasModelCompositionCandidate,
} from './canvasModelCompositionCandidate';
import { resolveCanvasSubstraitGraphBindings } from './canvasSubstraitGraphBindings';
import { readCanvasModelCompositionPhysicalInputs } from './canvasModelCompositionPhysicalAdmission';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';

async function validGraph(): Promise<
  Awaited<ReturnType<typeof createModelOutputDependencyFixture>>
> {
  const graph = await createModelOutputDependencyFixture();
  expect(() =>
    resolveCanvasSubstraitGraphBindings({ ...graph, node: graph.consumer })
  ).not.toThrow();
  return graph;
}

describe('physical Source working-copy admission', () => {
  it('resolves a connected physical Input even before the receiver has any Reads', async () => {
    const graph = await validGraph();
    const receiver = { ...emptyModel(), id: 'unused-receiver' };
    const context = {
      nodes: [...graph.nodes, receiver],
      edges: [
        ...graph.edges,
        {
          id: 'unused-input',
          sourceId: graph.right.id,
          targetId: receiver.id,
          relation: 'lineage' as const,
        },
      ],
    };
    const before = structuredClone(context);
    const inputs = readCanvasModelCompositionPhysicalInputs({
      ...context,
      targetId: receiver.id,
      inputs: resolveCanvasDvtCompositionInputs({ ...context, targetNodeId: receiver.id }),
    });
    expect(inputs.get(graph.right.id)).toMatchObject({
      nodeId: graph.right.id,
      sourceRef: graph.right.metadata?.connectedSourceRef,
    });
    expect(inputs.get(graph.right.id)?.fields.length).toBeGreaterThan(0);
    expect(inputs.has(graph.source.id)).toBe(false);
    expect(context).toEqual(before);
  });

  it('refuses ambiguous duplicate physical dependencies instead of picking an arbitrary Input', async () => {
    const graph = await validGraph();
    const duplicate = { ...graph.right, id: 'duplicate-physical-definition' };
    const context = {
      nodes: [...graph.nodes, duplicate],
      edges: [
        ...graph.edges,
        {
          id: 'duplicate-input',
          sourceId: duplicate.id,
          targetId: graph.consumer.id,
          relation: 'lineage' as const,
        },
      ],
    };
    const before = structuredClone(context);
    const inputs = readCanvasModelCompositionPhysicalInputs({
      ...context,
      targetId: graph.consumer.id,
      inputs: resolveCanvasDvtCompositionInputs({ ...context, targetNodeId: graph.consumer.id }),
    });
    expect(inputs.has(graph.right.id)).toBe(true);
    expect(inputs.get(graph.right.id)).toBeNull();
    expect(inputs.get(duplicate.id)).toBeNull();
    expect(context).toEqual(before);
  });

  it('rejects an already incoming physical resource without changing its valid publication', async () => {
    const graph = await validGraph();
    const before = structuredClone(graph);
    const publication = resolveCanvasSubstraitGraphBindings({ ...graph, node: graph.consumer });
    const copy = prepareCanvasModelWorkingCopy({ ...graph, sourceId: graph.right.id });
    expect(() =>
      prepareCanvasModelCompositionCandidate({
        ...graph,
        copy,
        targetId: graph.consumer.id,
        pluginPorts: getPluginPortMap(),
      })
    ).toThrow('Physical Source already supplies this receiver.');
    expect(graph).toEqual(before);
    expect(
      resolveCanvasSubstraitGraphBindings({ ...graph, node: graph.consumer }).document
    ).toEqual(publication.document);
  });

  it.each(['source', 'producer'] as const)(
    'preserves an eligible %s used upstream or through its independent Model identity',
    async (kind) => {
      const graph = await validGraph();
      const publication = resolveCanvasSubstraitGraphBindings({ ...graph, node: graph.consumer });
      const copy = prepareCanvasModelWorkingCopy({ ...graph, sourceId: graph[kind].id });
      const candidate = prepareCanvasModelCompositionCandidate({
        ...graph,
        copy,
        targetId: graph.consumer.id,
        pluginPorts: getPluginPortMap(),
      });
      expect(candidate.input.nodeId).toBe(copy.node.id);
      expect(
        resolveCanvasSubstraitGraphBindings({ ...candidate, node: graph.consumer }).document
      ).toEqual(publication.document);
    }
  );

  it('rejects a second staged Source in an empty receiver without relying on an old Read', async () => {
    const graph = await validGraph();
    const receiver = { ...emptyModel(), id: 'empty-receiver' };
    const context = { nodes: [...graph.nodes, receiver], edges: graph.edges };
    const first = prepareCanvasModelCompositionCandidate({
      ...context,
      copy: prepareCanvasModelWorkingCopy({ ...context, sourceId: graph.source.id }),
      targetId: receiver.id,
      pluginPorts: getPluginPortMap(),
    });
    const before = structuredClone(first);
    expect(receiver.metadata?.transformAuthoring).toBeUndefined();
    expect(() =>
      prepareCanvasModelCompositionCandidate({
        ...first,
        copy: prepareCanvasModelWorkingCopy({ ...first, sourceId: graph.source.id }),
        targetId: receiver.id,
        pluginPorts: getPluginPortMap(),
      })
    ).toThrow('Physical Source already supplies this receiver.');
    expect(first).toEqual(before);
    expect(first.input.sourceRef).toEqual(graph.source.metadata?.connectedSourceRef);
  });

  it.each(['source', 'receiver'] as const)(
    'normalizes the incoming %s instance before physical admission',
    async (kind) => {
      const graph = await validGraph();
      const definition = kind === 'source' ? graph.right : graph.consumer;
      const instance: CanonicalNode = {
        id: 'instance',
        name: 'Instance',
        pluginId: definition.pluginId,
        kind: definition.kind,
        role: definition.role,
        status: 'idle',
        tags: [],
        ...(kind === 'source'
          ? { sourceDefinitionId: definition.id }
          : { definitionId: definition.id }),
      };
      const context = {
        nodes: [...graph.nodes, instance],
        edges:
          kind === 'source'
            ? graph.edges.map((edge) =>
                edge.sourceId === graph.right.id ? { ...edge, sourceId: instance.id } : edge
              )
            : graph.edges,
      };
      const receiver = kind === 'source' ? graph.consumer : instance;
      expect(() =>
        resolveCanvasSubstraitGraphBindings({ ...context, node: receiver })
      ).not.toThrow();
      const before = structuredClone(context);
      expect(() =>
        prepareCanvasModelCompositionCandidate({
          ...context,
          copy: prepareCanvasModelWorkingCopy({ ...context, sourceId: graph.right.id }),
          targetId: receiver.id,
          pluginPorts: getPluginPortMap(),
        })
      ).toThrow('Physical Source already supplies this receiver.');
      expect(context).toEqual(before);
    }
  );

  it('revalidates a newly incoming physical edge during Apply without changing the session', async () => {
    const graph = await validGraph();
    const copy = prepareCanvasModelWorkingCopy({ ...graph, sourceId: graph.source.id });
    const candidate = prepareCanvasModelCompositionCandidate({
      ...graph,
      copy,
      targetId: graph.consumer.id,
      pluginPorts: getPluginPortMap(),
    });
    const draftSession = {
      ...graph.draftSession,
      workingSet: {
        ...graph.draftSession.workingSet,
        visibleEdges: [
          ...graph.draftSession.workingSet.visibleEdges,
          { sourceId: graph.source.id, targetId: graph.consumer.id },
        ],
      },
    };
    const before = structuredClone(draftSession);
    expect(() =>
      admitCanvasModelCopiesToSession({
        draftSession,
        canonicalNodesById: graph.canonicalNodesById,
        copies: [candidate.addition],
        targetId: graph.consumer.id,
        pluginPorts: getPluginPortMap(),
      })
    ).toThrow('Physical Source already supplies this receiver.');
    expect(draftSession).toEqual(before);
  });
});
