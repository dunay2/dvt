/** Keep semantic queries independent of Canvas geometry and discard obsolete completions. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { jcsCanonicalize } from '@dvt/crypto';
import { projectWorkspaceNodeInstanceEdges, workspaceNodeDefinitionId } from '@dvt/contracts';
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import type { CanonicalNode } from '../../types/canonical';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import {
  canvasNodePresentationBase,
  pendingCanvasNodePresentation,
  type CanvasPresentationQuery,
} from './canvasNodePresentationBase';
import { projectCanvasGraphPresentation } from './canvasNodePresentationProjection';
import { canvasColumnTruth } from './canvasPresentationColumns';
import { canvasNodeQueryMetadata } from './canvasNodeQueryMetadata';
import { readCanvasInputBindings } from './canvasInputBindings';

type Graph = Pick<CanvasPresentationQuery, 'nodes' | 'edges'>;
type Publication = { graph: Graph; values: ReadonlyMap<string, CanvasNodePresentationTruth> };

function sameMetadata(left: CanonicalNode, right: CanonicalNode): boolean {
  if (left.metadata === right.metadata) return true;
  try {
    return (
      jcsCanonicalize(canvasNodeQueryMetadata(left) ?? null) ===
      jcsCanonicalize(canvasNodeQueryMetadata(right) ?? null)
    );
  } catch {
    return false;
  }
}

function sameNode(node: CanonicalNode, next: CanonicalNode): boolean {
  return (
    node.id === next.id &&
    sameMetadata(node, next) &&
    node.name === next.name &&
    node.kind === next.kind &&
    node.pluginId === next.pluginId &&
    node.role === next.role &&
    node.path === next.path &&
    workspaceNodeDefinitionId(node) === workspaceNodeDefinitionId(next)
  );
}

function sameEdge(edge: Graph['edges'][number], next: Graph['edges'][number]): boolean {
  return (
    edge.sourceId === next.sourceId &&
    edge.targetId === next.targetId &&
    jcsCanonicalize(readCanvasInputBindings(edge) ?? null) ===
      jcsCanonicalize(readCanvasInputBindings(next) ?? null)
  );
}

function sameGraph(left: Graph, right: Graph): boolean {
  return (
    left.nodes.length === right.nodes.length &&
    left.edges.length === right.edges.length &&
    left.nodes.every((node, position) => sameNode(node, right.nodes[position]!)) &&
    left.edges.every((edge, position) => sameEdge(edge, right.edges[position]!))
  );
}

/** Retain a card only when neither its definition nor any upstream dependency changed. */
function retainUnchangedCards(
  previous: Publication | null,
  graph: Graph
): Map<string, CanvasNodePresentationTruth> {
  if (previous == null) return new Map();
  const before = new Map(previous.graph.nodes.map((node) => [node.id, node]));
  const after = new Map(graph.nodes.map((node) => [node.id, node]));
  const affected = new Set<string>();
  for (const [id, node] of before)
    if (!after.has(id) || !sameNode(node, after.get(id)!)) affected.add(id);
  for (const id of after.keys()) if (!before.has(id)) affected.add(id);
  const signature = (edge: Graph['edges'][number]) =>
    JSON.stringify([edge.sourceId, edge.targetId]);
  const oldEdges = new Map(previous.graph.edges.map((edge) => [signature(edge), edge]));
  const newEdges = new Map(graph.edges.map((edge) => [signature(edge), edge]));
  for (const [key, edge] of oldEdges)
    if (!newEdges.has(key) || !sameEdge(edge, newEdges.get(key)!)) affected.add(edge.targetId);
  for (const [key, edge] of newEdges) if (!oldEdges.has(key)) affected.add(edge.targetId);
  const consumers = new Map<string, Set<string>>();
  const depend = (source: string, target: string) => {
    if (!consumers.has(source)) consumers.set(source, new Set());
    consumers.get(source)!.add(target);
  };
  for (const edge of [...oldEdges.values(), ...newEdges.values()])
    depend(edge.sourceId, edge.targetId);
  for (const node of [...before.values(), ...after.values()]) {
    const definitionId = workspaceNodeDefinitionId(node);
    if (definitionId != null) depend(definitionId, node.id);
  }
  for (const id of affected) for (const consumer of consumers.get(id) ?? []) affected.add(consumer);
  return new Map(
    graph.nodes.flatMap((node) => {
      const value = previous.values.get(node.id);
      return value == null || affected.has(node.id) ? [] : [[node.id, value] as const];
    })
  );
}

function initialTruth(node: CanonicalNode, graph: Graph): CanvasNodePresentationTruth {
  const args = { ...graph, node };
  return node.role === 'input' && node.metadata?.transformAuthoring == null
    ? canvasNodePresentationBase(args)
    : pendingCanvasNodePresentation(args);
}

export function useCanvasNodePresentations(
  graph: Graph
): ReadonlyMap<string, CanvasNodePresentationTruth> {
  graph = { ...graph, edges: projectWorkspaceNodeInstanceEdges(graph.nodes, graph.edges) };
  const stable = useRef(graph);
  if (!sameGraph(stable.current, graph)) stable.current = graph;
  const current = stable.current;
  const owner = useRef<CanvasPresentationAnalysis | null>(null);
  const [published, setPublished] = useState<Publication | null>(null);
  const latestPublished = useRef(published);
  latestPublished.current = published;
  const retained = useMemo(() => retainUnchangedCards(latestPublished.current, current), [current]);
  useEffect(() => {
    const analysis = (owner.current ??= new CanvasPresentationAnalysis());
    const cancellation = new AbortController();
    analysis.retain(new Set(current.nodes.map((node) => node.id)));
    void projectCanvasGraphPresentation(
      current,
      analysis,
      cancellation.signal,
      current.nodes.filter((node) => !retained.has(node.id)).map((node) => node.id),
      retained
    )
      .then((values) => {
        if (!cancellation.signal.aborted) setPublished({ graph: current, values });
      })
      .catch((error: unknown) => {
        if (cancellation.signal.aborted) return;
        const diagnostic =
          error instanceof Error ? error.message : 'Canonical field analysis failed.';
        const values = new Map(
          current.nodes.map((node) =>
            retained.has(node.id)
              ? ([node.id, retained.get(node.id)!] as const)
              : ([
                  node.id,
                  {
                    ...initialTruth(node, current),
                    columns: {
                      ...canvasColumnTruth([], []),
                      state: 'unavailable' as const,
                      diagnostic,
                    },
                  },
                ] as const)
          )
        );
        setPublished({ graph: current, values });
      });
    return () => cancellation.abort();
  }, [current, retained]);
  useEffect(
    () => () => {
      owner.current?.dispose();
      owner.current = null;
    },
    []
  );
  const initial = useMemo(
    () =>
      new Map(
        current.nodes.map((node) => {
          const unchanged = retained.get(node.id);
          if (unchanged != null) return [node.id, unchanged];
          const value = initialTruth(node, current);
          const previous = published?.values.get(node.id);
          return [
            node.id,
            value.columns.state === 'pending' && previous?.columns.state === 'ready'
              ? { ...value, columns: { ...previous.columns, state: 'pending' as const } }
              : value,
          ];
        })
      ),
    [current, published, retained]
  );
  return published?.graph === current ? published.values : initial;
}

export function useCanvasNodePresentation(
  args: CanvasPresentationQuery
): CanvasNodePresentationTruth {
  const nodes = args.nodes.some((node) => node.id === args.node.id)
    ? args.nodes.map((node) => (node.id === args.node.id ? args.node : node))
    : [...args.nodes, args.node];
  return useCanvasNodePresentations({ nodes, edges: args.edges }).get(args.node.id)!;
}
