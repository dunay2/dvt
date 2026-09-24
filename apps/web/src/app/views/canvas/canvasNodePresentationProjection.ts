/** One disposable projection per graph revision, with iterative dependency ordering. */
import type { CanvasNodePresentationTruth } from '../../components/canvas/canvasNodePresentationTruth.contract';
import { CanvasPresentationAnalysis } from './canvasPresentationAnalysis';
import {
  canvasNodePresentationBase,
  type CanvasPresentationQuery,
} from './canvasNodePresentationBase';
import { canvasColumnTruth } from './canvasPresentationColumns';
import { projectCanvasPresentationNode } from './canvasPresentationNode';

type Graph = Pick<CanvasPresentationQuery, 'nodes' | 'edges'>;

export async function projectCanvasGraphPresentation(
  graph: Graph,
  analysis: CanvasPresentationAnalysis,
  signal?: AbortSignal,
  targets: readonly string[] = graph.nodes.map((node) => node.id)
): Promise<ReadonlyMap<string, CanvasNodePresentationTruth>> {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const inputs = new Map<string, Set<string>>();
  const consumers = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!nodes.has(edge.sourceId) || !nodes.has(edge.targetId)) continue;
    if (!inputs.has(edge.targetId)) inputs.set(edge.targetId, new Set());
    if (!consumers.has(edge.sourceId)) consumers.set(edge.sourceId, new Set());
    inputs.get(edge.targetId)!.add(edge.sourceId);
    consumers.get(edge.sourceId)!.add(edge.targetId);
  }
  const selected = new Set<string>();
  const pending = [...targets];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (selected.has(id) || !nodes.has(id)) continue;
    selected.add(id);
    pending.push(...(inputs.get(id) ?? []));
  }
  const remaining = new Map([...selected].map((id) => [id, inputs.get(id)?.size ?? 0]));
  let ready = [...remaining].filter(([, count]) => count === 0).map(([id]) => id);
  const projected = new Map<string, CanvasNodePresentationTruth>();
  while (ready.length > 0) {
    signal?.throwIfAborted();
    const wave = ready;
    ready = [];
    const values = await Promise.all(
      wave.map(
        async (id) =>
          [
            id,
            await projectCanvasPresentationNode(
              { ...graph, node: nodes.get(id)! },
              analysis,
              signal,
              [...(inputs.get(id) ?? [])].map((input) => nodes.get(input)!),
              projected
            ),
          ] as const
      )
    );
    for (const [id, value] of values) {
      projected.set(id, value);
      for (const consumer of consumers.get(id) ?? []) {
        if (!remaining.has(consumer)) continue;
        const count = remaining.get(consumer)! - 1;
        remaining.set(consumer, count);
        if (count === 0) ready.push(consumer);
      }
    }
  }
  for (const id of selected) {
    if (projected.has(id)) continue;
    projected.set(id, {
      ...canvasNodePresentationBase({ ...graph, node: nodes.get(id)! }),
      columns: {
        ...canvasColumnTruth([], []),
        state: 'unavailable',
        diagnostic: 'Cyclic Canvas dependency.',
      },
    });
  }
  return projected;
}

export async function projectCanvasNodePresentationTruth(
  args: CanvasPresentationQuery,
  analysis?: CanvasPresentationAnalysis,
  signal?: AbortSignal
): Promise<CanvasNodePresentationTruth> {
  const owner = analysis ?? new CanvasPresentationAnalysis();
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  nodes.set(args.node.id, args.node);
  try {
    const values = await projectCanvasGraphPresentation(
      { ...args, nodes: [...nodes.values()] },
      owner,
      signal,
      [args.node.id]
    );
    return values.get(args.node.id)!;
  } finally {
    if (analysis == null) owner.dispose();
  }
}
