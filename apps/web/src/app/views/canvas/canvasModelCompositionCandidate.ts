/**
 * Owned concern: Prepare and admit one private producer and receiver composition transaction.
 * Reason to change: Model composition admission and aggregate candidate invariants change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Validate source freshness, physical identity, topology and Input publication before returning the whole candidate.
 * @consequence Rejected preparation leaves the original draft unchanged.
 * @version 1.0.0
 */
import { randomUuidV4 } from '@dvt/crypto';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  compositionNodes,
  compositionInput,
  appendDependency,
  type CandidateArgs,
  type CompositionProducer,
} from './canvasModelCompositionAdmission';
import { canvasInputSlotId } from './canvasInputBindings';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';
export type CanvasModelCompositionCopy = Readonly<{
  copy: CompositionProducer;
  receiverEdge: CanonicalEdge;
}>;

/** Retain the private snapshot for inspection even if its original later becomes stale. */
export function projectCanvasModelCopies(
  args: Readonly<{
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    copies: readonly CanvasModelCompositionCopy[];
  }>
) {
  const pending = args.copies.filter(
    (addition) => !args.nodes.some((node) => node.id === addition.copy.node.id)
  );
  return pending.length === 0
    ? { nodes: args.nodes, edges: args.edges }
    : {
        nodes: [...args.nodes, ...pending.map((addition) => addition.copy.node)],
        edges: [
          ...args.edges,
          ...pending.flatMap((addition) => [...addition.copy.edges, addition.receiverEdge]),
        ],
      };
}

function compositionReceiverEdge(
  copy: CompositionProducer,
  targetId: string,
  input: CanvasDvtCompositionInput
): CanonicalEdge {
  return {
    id: randomUuidV4(),
    sourceId: copy.node.id,
    targetId,
    relation: 'lineage',
    metadata: {
      inputBindings: {
        version: 'v1',
        fields: input.fields.map((field) => ({
          inputId: canvasInputSlotId(copy.node.id, field.id ?? field.name),
          producerFieldId: field.id ?? field.name,
        })),
      },
    },
  };
}

export function prepareCanvasModelCompositionCandidate(args: CandidateArgs) {
  const { copy, targetId, pluginPorts } = args;
  const nodes = compositionNodes(args);
  const edges = [...args.edges];
  for (const edge of copy.edges) appendDependency(nodes, edges, pluginPorts, edge);
  const input = compositionInput(args, nodes, edges);
  const receiverEdge = compositionReceiverEdge(copy, targetId, input);
  appendDependency(nodes, edges, pluginPorts, receiverEdge);
  const admitted = resolveCanvasDvtCompositionInputs({ targetNodeId: targetId, nodes, edges }).find(
    (current) => current.nodeId === copy.node.id
  );
  if (admitted == null) throw new Error('Working-copy Input is unavailable.');
  return {
    nodes,
    edges,
    input: admitted,
    addition: { copy, receiverEdge } satisfies CanvasModelCompositionCopy,
  };
}

export function canvasModelCompositionSessionEdges(session: CanvasDraftSession): CanonicalEdge[] {
  return session.workingSet.visibleEdges.map((edge, index) => ({
    id: `composition-edge-${index}`,
    sourceId: edge.sourceId,
    targetId: edge.targetId,
    relation: 'lineage',
    metadata: {
      ...(edge.inputBindings == null ? {} : { inputBindings: edge.inputBindings }),
      ...(edge.executionGate == null ? {} : { executionGate: edge.executionGate }),
    },
  }));
}

export function admitCanvasModelCopiesToSession(
  args: Readonly<{
    draftSession: CanvasDraftSession;
    canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
    copies: readonly CanvasModelCompositionCopy[];
    targetId: string;
    pluginPorts: PluginPortMap;
  }>
): CanvasDraftSession {
  let session = args.draftSession;
  for (const addition of args.copies) {
    const { copy } = addition;
    if (addition.receiverEdge.targetId !== args.targetId)
      throw new Error('Working-copy receiver has changed.');
    const visibleNodes = resolveCanvasDraftNodes(session, args.canonicalNodesById);
    const linkedDefinition =
      'linkedReference' in copy ? args.canonicalNodesById.get(copy.sourceId) : undefined;
    const nodes =
      linkedDefinition != null && !visibleNodes.some((node) => node.id === linkedDefinition.id)
        ? [...visibleNodes, linkedDefinition]
        : visibleNodes;
    const candidate = prepareCanvasModelCompositionCandidate({
      ...args,
      copy,
      nodes,
      edges: canvasModelCompositionSessionEdges(session),
    });
    session = canvasDraftSession.workingSet.upsertNode(session, copy.node);
    session = canvasDraftSession.workingSet.replaceEdges(
      session,
      candidate.edges.map((edge) => canvasDraftEdgeExecutionGate.fromAuthoringEdge(edge))
    );
  }
  return session;
}
