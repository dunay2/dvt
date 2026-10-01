/** Freshness inputs for relational inspection; no schema or publication decisions. */
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalAnalysisArgs } from './canvasRelationalAnalysis';
import { readCanvasInputBindings } from './canvasInputBindings';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

function producerReferences(node: CanonicalNode | undefined): readonly string[] {
  if (node == null) return [];
  try {
    return (
      readDvtTransformAuthoringAuthority(node)?.semanticDocument.sidecar.relations.flatMap(
        (binding) => (binding.producerRef == null ? [] : [binding.producerRef.nodeId])
      ) ?? []
    );
  } catch {
    // The analysis owns invalid-authority diagnostics; metadata still invalidates its result.
    return [];
  }
}

export function canvasRelationalAnalysisDependencies(
  args: CanvasRelationalAnalysisArgs
): readonly unknown[] {
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  nodes.set(args.node.id, args.node);
  const incoming = new Map<string, string[]>();
  for (const edge of args.edges) {
    const inputs = incoming.get(edge.targetId) ?? [];
    inputs.push(edge.sourceId);
    incoming.set(edge.targetId, inputs);
  }
  const visited = new Set<string>();
  const pending = [args.node.id];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...(incoming.get(id) ?? []), ...producerReferences(nodes.get(id)));
  }
  const { id, pluginId, kind, role, metadata } = args.node;
  return [
    id,
    pluginId,
    kind,
    role,
    metadata,
    // Missing identities participate too, so addition/removal invalidates the memo.
    JSON.stringify([...visited].sort()),
    ...args.nodes
      .filter((node) => node.id !== id && visited.has(node.id))
      .flatMap((node) => [node.id, node.pluginId, node.kind, node.role, node.name, node.metadata]),
    ...args.edges
      .filter((edge) => visited.has(edge.targetId))
      .map((edge) =>
        JSON.stringify([edge.sourceId, edge.targetId, readCanvasInputBindings(edge) ?? null])
      ),
  ];
}
