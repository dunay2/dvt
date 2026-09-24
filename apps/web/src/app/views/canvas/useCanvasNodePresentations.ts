/** Keep semantic queries independent of Canvas geometry and discard obsolete completions. */
import { useEffect, useMemo, useRef, useState } from 'react';
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

type Graph = Pick<CanvasPresentationQuery, 'nodes' | 'edges'>;

function sameMetadata(left: CanonicalNode['metadata'], right: CanonicalNode['metadata']): boolean {
  if (left === right) return true;
  try {
    return JSON.stringify(left) === JSON.stringify(right);
  } catch {
    return false;
  }
}

function sameGraph(left: Graph, right: Graph): boolean {
  return (
    left.nodes.length === right.nodes.length &&
    left.edges.length === right.edges.length &&
    left.nodes.every((node, position) => {
      const next = right.nodes[position]!;
      return (
        node.id === next.id &&
        sameMetadata(node.metadata, next.metadata) &&
        node.name === next.name &&
        node.kind === next.kind &&
        node.pluginId === next.pluginId &&
        node.role === next.role &&
        node.path === next.path
      );
    }) &&
    left.edges.every(
      (edge, position) =>
        edge.sourceId === right.edges[position]!.sourceId &&
        edge.targetId === right.edges[position]!.targetId
    )
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
  const stable = useRef(graph);
  if (!sameGraph(stable.current, graph)) stable.current = graph;
  const current = stable.current;
  const owner = useRef<CanvasPresentationAnalysis | null>(null);
  const [published, setPublished] = useState<{
    graph: Graph;
    values: ReadonlyMap<string, CanvasNodePresentationTruth>;
  } | null>(null);
  useEffect(() => {
    const analysis = (owner.current ??= new CanvasPresentationAnalysis());
    const cancellation = new AbortController();
    analysis.retain(new Set(current.nodes.map((node) => node.id)));
    void projectCanvasGraphPresentation(current, analysis, cancellation.signal)
      .then((values) => {
        if (!cancellation.signal.aborted) setPublished({ graph: current, values });
      })
      .catch((error: unknown) => {
        if (cancellation.signal.aborted) return;
        const diagnostic =
          error instanceof Error ? error.message : 'Canonical field analysis failed.';
        const values = new Map(
          current.nodes.map(
            (node) =>
              [
                node.id,
                {
                  ...initialTruth(node, current),
                  columns: {
                    ...canvasColumnTruth([], []),
                    state: 'unavailable' as const,
                    diagnostic,
                  },
                },
              ] as const
          )
        );
        setPublished({ graph: current, values });
      });
    return () => cancellation.abort();
  }, [current]);
  useEffect(
    () => () => {
      owner.current?.dispose();
      owner.current = null;
    },
    []
  );
  const initial = useMemo(
    () => new Map(current.nodes.map((node) => [node.id, initialTruth(node, current)])),
    [current]
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
