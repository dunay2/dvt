/** Resolve the selected canonical document against connected source and producer identities once per query. */
import {
  indexSubstraitRelations,
  resolveProducerGraph,
  type SubstraitDocument,
  type ResolvedProducer,
  type ProducerGraph,
} from '@dvt/substrait-analysis';
import { ConnectedSourceRefSchema, type ConnectedSourceRef } from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { bindCanvasSubstraitInputs, physicalReadMatches } from './canvasSubstraitInputBinding';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';

type Args = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
}>;

export function resolveCanvasSubstraitGraphBindings(
  args: Args
): ResolvedProducer & Readonly<{ graph: ProducerGraph }> {
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  nodes.set(args.node.id, args.node);
  const incoming = new Map<string, Set<string>>();
  for (const edge of args.edges) {
    const ids = incoming.get(edge.targetId) ?? new Set<string>();
    ids.add(edge.sourceId);
    incoming.set(edge.targetId, ids);
  }
  const documents = new Map<string, SubstraitDocument>();
  const physicalSources = new Map<string, ConnectedSourceRef>();
  const visited = new Set<string>();
  const pending = [args.node.id];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodes.get(id);
    if (node == null)
      throw new Error('Substrait source identities do not match the connected graph.');
    const inputIds = [...(incoming.get(id) ?? [])];
    pending.push(...inputIds);
    const physical = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
    if (node.role === 'input' && physical.success) physicalSources.set(id, physical.data);
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) {
      continue;
    }
    const sources = inputIds.flatMap((sourceId) => {
      const input = nodes.get(sourceId);
      if (input == null)
        throw new Error('Substrait source identities do not match the connected graph.');
      const source = resolveCanvasPhysicalCompositionInput(input, { sourceId, targetId: id });
      return source == null ? [] : [source];
    });
    const document: SubstraitDocument = bindCanvasSubstraitInputs(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
      sources
    );
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    for (const entry of indexed.index.relations.values()) {
      if (entry.relation.relType.case !== 'read') continue;
      if (entry.binding.producerRef != null) continue;
      if (sources.filter((source) => physicalReadMatches(entry, source)).length !== 1)
        throw new Error('Substrait source identities do not match the connected graph.');
    }
    documents.set(id, document);
  }
  const graph = {
    targetId: args.node.id,
    documents,
    sources: physicalSources,
    edges: args.edges.map((edge) => ({ ...edge, inputBindings: readCanvasInputBindings(edge) })),
    sourcePublications: new Map(
      [...physicalSources.keys()].map(
        (id) =>
          [
            id,
            new Set(
              readDvtSourceOutputProjection(nodes.get(id)!)?.outputs.map(
                (field) => field.sourceFieldName!
              ) ?? []
            ),
          ] as const
      )
    ),
  };
  const result = resolveProducerGraph(graph).get(args.node.id);
  if (result == null)
    throw new Error('PostgreSQL output projection requires canonical Substrait authority.');
  return { ...result, graph };
}
