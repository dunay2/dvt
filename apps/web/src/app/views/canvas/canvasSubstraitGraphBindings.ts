/** Resolve the selected canonical document against connected source and producer identities once per query. */
import {
  indexSubstraitRelations,
  resolveProducerGraph,
  type SubstraitDocument,
  type SubstraitRelationIndex,
  type ResolvedProducer,
  type ProducerGraph,
} from '@dvt/substrait-analysis';
import {
  ConnectedSourceRefSchema,
  resolveWorkspaceNodeInstances,
  projectWorkspaceNodeInstanceEdges,
  type ConnectedSourceRef,
  type ConnectionRef,
  ConnectionRefSchema,
  isDvtSubstraitLiteralRowPlanV1,
} from '@dvt/contracts';
import type { CanonicalNode } from '../../types/canonical';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { bindCanvasSubstraitInputs, physicalReadMatches } from './canvasSubstraitInputBinding';
import { readDvtSourceOutputProjection } from './canvasDvtSourceSemanticAuthoring';
import { resolveCanvasDbtModelSignature } from './canvasDbtModelReference';
import { readCanvasInputBindings, type CanvasInputBindingEdge } from './canvasInputBindings';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

type Args = Readonly<{
  node: CanonicalNode;
  nodes: readonly CanonicalNode[];
  edges: readonly CanvasInputBindingEdge[];
}>;

type CanvasBindingContext = Readonly<{
  nodes: ReadonlyMap<string, CanonicalNode>;
  edges: readonly CanvasInputBindingEdge[];
  incoming: ReadonlyMap<string, ReadonlySet<string>>;
}>;

type CanvasProducerCatalog = {
  documents: Map<string, SubstraitDocument>;
  sources: Map<string, ConnectedSourceRef>;
  externalProducers: Map<string, Pick<ResolvedProducer, 'document' | 'connection'>>;
  literalConnections: Map<string, ConnectionRef>;
};

function canvasBindingContext(args: Args): CanvasBindingContext {
  const nodes = new Map(args.nodes.map((node) => [node.id, node]));
  nodes.set(args.node.id, args.node);
  for (const node of resolveWorkspaceNodeInstances([...nodes.values()])) nodes.set(node.id, node);
  const edges = projectWorkspaceNodeInstanceEdges([...nodes.values()], args.edges);
  const incoming = new Map<string, Set<string>>();
  for (const edge of edges) {
    const ids = incoming.get(edge.targetId) ?? new Set<string>();
    ids.add(edge.sourceId);
    incoming.set(edge.targetId, ids);
  }
  return { nodes, edges, incoming };
}

function requireCanvasBindingNode(nodes: CanvasBindingContext['nodes'], id: string): CanonicalNode {
  const node = nodes.get(id);
  if (node == null)
    throw new Error('Substrait source identities do not match the connected graph.');
  return node;
}

function connectedCanvasPhysicalInputs(
  id: string,
  inputIds: readonly string[],
  nodes: CanvasBindingContext['nodes']
): CanvasDvtCompositionInput[] {
  return inputIds.flatMap((sourceId) => {
    const input = requireCanvasBindingNode(nodes, sourceId);
    const source = resolveCanvasPhysicalCompositionInput(input, { sourceId, targetId: id });
    return source == null ? [] : [source];
  });
}

function assertCanvasPhysicalReadBindings(
  index: SubstraitRelationIndex,
  sources: readonly CanvasDvtCompositionInput[]
): void {
  for (const entry of index.relations.values()) {
    if (entry.relation.relType.case !== 'read') continue;
    if (entry.binding.producerRef != null) continue;
    if (sources.filter((source) => physicalReadMatches(entry, source)).length !== 1)
      throw new Error('Substrait source identities do not match the connected graph.');
  }
}

function registerCanvasProducerDocument(
  node: CanonicalNode,
  inputIds: readonly string[],
  nodes: CanvasBindingContext['nodes'],
  catalog: CanvasProducerCatalog
): void {
  const authority = readDvtTransformAuthoringAuthority(node);
  if (authority == null) return;
  const sources = connectedCanvasPhysicalInputs(node.id, inputIds, nodes);
  const document = bindCanvasSubstraitInputs(
    decodeDvtSubstraitSemanticDocument(authority.semanticDocument),
    sources
  );
  const indexed = indexSubstraitRelations(document);
  if (!indexed.ok) throw indexed.error;
  if (isDvtSubstraitLiteralRowPlanV1(document.plan, document.sidecar)) {
    const connection = ConnectionRefSchema.parse(node.metadata?.connectionRef);
    if (connection.provider !== 'postgres')
      throw new Error('Literal Models require a PostgreSQL connection.');
    catalog.literalConnections.set(node.id, connection);
  } else assertCanvasPhysicalReadBindings(indexed.index, sources);
  catalog.documents.set(node.id, document);
}

function collectCanvasProducer(
  id: string,
  context: CanvasBindingContext,
  catalog: CanvasProducerCatalog
): readonly string[] {
  const node = requireCanvasBindingNode(context.nodes, id);
  const inputIds = [...(context.incoming.get(id) ?? [])];
  const physical = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  if (node.role === 'input' && physical.success) catalog.sources.set(id, physical.data);
  const external = resolveCanvasDbtModelSignature(node);
  if (external != null) catalog.externalProducers.set(id, external);
  else registerCanvasProducerDocument(node, inputIds, context.nodes, catalog);
  return inputIds;
}

function canvasSourcePublications(
  sources: CanvasProducerCatalog['sources'],
  nodes: CanvasBindingContext['nodes']
): ProducerGraph['sourcePublications'] {
  return new Map(
    [...sources.keys()].map((id) => [
      id,
      new Set(
        readDvtSourceOutputProjection(nodes.get(id)!)?.outputs.map(
          (field) => field.sourceFieldName!
        ) ?? []
      ),
    ])
  );
}

export function resolveCanvasSubstraitGraphBindings(
  args: Args
): ResolvedProducer & Readonly<{ graph: ProducerGraph }> {
  const context = canvasBindingContext(args);
  const catalog: CanvasProducerCatalog = {
    documents: new Map(),
    sources: new Map(),
    externalProducers: new Map(),
    literalConnections: new Map(),
  };
  const visited = new Set<string>();
  const pending = [args.node.id];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    pending.push(...collectCanvasProducer(id, context, catalog));
  }
  const graph = {
    targetId: args.node.id,
    ...catalog,
    edges: context.edges.map((edge) => ({ ...edge, inputBindings: readCanvasInputBindings(edge) })),
    sourcePublications: canvasSourcePublications(catalog.sources, context.nodes),
  };
  const result = resolveProducerGraph(graph).get(args.node.id);
  if (result == null)
    throw new Error('PostgreSQL output projection requires canonical Substrait authority.');
  return { ...result, graph };
}
