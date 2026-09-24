/** Resolve the selected canonical document against connected source and producer identities once per query. */
import { indexSubstraitRelations, type SubstraitDocument } from '@dvt/substrait-analysis';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { bindCanvasSubstraitInputs, physicalReadMatches } from './canvasSubstraitInputBinding';
import {
  matchesCanvasSubstraitUpstream,
  type IndexedCanvasDocument,
} from './canvasSubstraitUpstreamBinding';

type Args = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly Pick<CanonicalEdge, 'sourceId' | 'targetId'>[];
}>;

export function resolveCanvasSubstraitGraphBindings(args: Args): IndexedCanvasDocument {
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  nodes.set(args.node.id, args.node);
  const incoming = new Map<string, Set<string>>();
  for (const edge of args.edges) {
    const ids = incoming.get(edge.targetId) ?? new Set<string>();
    ids.add(edge.sourceId);
    incoming.set(edge.targetId, ids);
  }
  const settled = new Map<string, IndexedCanvasDocument | null>();
  const visiting = new Set<string>();
  const pending = [{ id: args.node.id, ready: false }];
  while (pending.length > 0) {
    const item = pending.pop()!;
    if (settled.has(item.id)) continue;
    const node = nodes.get(item.id);
    if (node == null)
      throw new Error('Substrait source identities do not match the connected graph.');
    if (!item.ready) {
      if (visiting.has(item.id)) throw new Error('The connected graph contains a cycle.');
      visiting.add(item.id);
      pending.push({ ...item, ready: true });
      for (const id of incoming.get(item.id) ?? []) pending.push({ id, ready: false });
      continue;
    }
    const authority = readDvtTransformAuthoringAuthority(node);
    if (authority == null) {
      settled.set(item.id, null);
      visiting.delete(item.id);
      continue;
    }
    const inputIds = [...(incoming.get(item.id) ?? [])];
    const sources = resolveCanvasDvtCompositionInputs({
      targetNodeId: item.id,
      nodes: inputIds.map((id) => nodes.get(id)!),
      edges: inputIds.map((sourceId) => ({ sourceId, targetId: item.id })),
    });
    const document: SubstraitDocument = bindCanvasSubstraitInputs(
      decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
      sources
    );
    const indexed = indexSubstraitRelations(document);
    if (!indexed.ok) throw indexed.error;
    const current = { document, index: indexed.index };
    const covered = new Set<string>();
    for (const id of incoming.get(item.id) ?? []) {
      const producer = settled.get(id);
      if (producer == null || !current.index.relations.has(producer.index.rootId)) continue;
      if (!matchesCanvasSubstraitUpstream(current, producer))
        throw new Error('Substrait source identities do not match the connected graph.');
      for (const relationId of producer.index.relations.keys()) covered.add(relationId);
    }
    for (const [id, entry] of current.index.relations) {
      if (entry.relation.relType.case !== 'read' || covered.has(id)) continue;
      if (sources.filter((source) => physicalReadMatches(entry, source)).length !== 1)
        throw new Error('Substrait source identities do not match the connected graph.');
    }
    settled.set(item.id, current);
    visiting.delete(item.id);
  }
  const result = settled.get(args.node.id);
  if (result == null)
    throw new Error('PostgreSQL output projection requires canonical Substrait authority.');
  return result;
}
