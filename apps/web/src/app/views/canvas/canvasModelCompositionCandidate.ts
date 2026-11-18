/**
 * Owned concern: Prepare and admit one private producer and receiver composition transaction.
 * Reason to change: Model composition admission and aggregate candidate invariants change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Validate source freshness, native topology and Input publication before returning the whole candidate.
 * @consequence Rejected preparation leaves the original draft unchanged.
 * @version 1.0.0
 */
import { jcsCanonicalize, randomUuidV4 } from '@dvt/crypto';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { evaluateConnection, type PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import {
  canvasModelCopySourceSignature,
  type CanvasModelWorkingCopy,
} from './canvasModelWorkingCopy';
import { resolveCanvasDvtCompositionInputs } from './canvasDvtCompositionInputCatalog';
import {
  readCanvasModelCompositionPublication,
  projectCanvasModelCompositionInput,
} from './canvasModelCompositionInput';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { canvasInputSlotId } from './canvasInputBindings';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { canvasDraftEdgeExecutionGate } from './canvasDraftEdgeExecutionGate';

type CandidateArgs = Readonly<{
  copy: CanvasModelWorkingCopy;
  targetId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  pluginPorts: PluginPortMap;
}>;

export type CanvasModelCompositionCopy = Readonly<{
  copy: CanvasModelWorkingCopy;
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

export function prepareCanvasModelCompositionCandidate(args: CandidateArgs) {
  const { copy, targetId, pluginPorts } = args;
  if (
    args.nodes.some((node) => node.id === copy.node.id) ||
    canvasModelCopySourceSignature({ ...args, sourceId: copy.sourceId }) !== copy.sourceSignature
  )
    throw new Error('Working-copy source context has changed.');
  const nodes = [...args.nodes, copy.node];
  const target = nodes.find((node) => node.id === targetId);
  if (target?.pluginId !== 'dvt' || target.kind !== 'dvt:transform')
    throw new Error('Unavailable receiver.');
  const edges = [...args.edges];
  const append = (edge: CanonicalEdge) => {
    const source = nodes.find((node) => node.id === edge.sourceId);
    const receiver = nodes.find((node) => node.id === edge.targetId);
    if (
      source == null ||
      receiver == null ||
      !evaluateConnection(source, receiver, edges, pluginPorts).allowed
    )
      throw new Error('Model dependency is not admitted.');
    edges.push(edge);
  };
  for (const edge of copy.edges) append(edge);
  const identity = { sourceId: copy.node.id, targetId };
  const physical = resolveCanvasPhysicalCompositionInput(copy.node, identity);
  const publication =
    physical == null ? readCanvasModelCompositionPublication(copy.node, nodes, edges) : null;
  const input =
    physical ??
    (publication == null ? null : projectCanvasModelCompositionInput(publication, identity));
  if (input == null || input.fields.length === 0)
    throw new Error('Working-copy output is unavailable.');
  const connection = input.sourceRef?.connectionRef ?? input.producer?.connection;
  const existing = resolveCanvasDvtCompositionInputs({
    targetNodeId: targetId,
    nodes: args.nodes,
    edges: args.edges,
  });
  if (
    existing.some(
      (current) =>
        jcsCanonicalize(current.sourceRef?.connectionRef ?? current.producer?.connection) !==
        jcsCanonicalize(connection)
    )
  )
    throw new Error('Composition inputs require the same connection.');
  const receiverEdge: CanonicalEdge = {
    id: randomUuidV4(),
    ...identity,
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
  append(receiverEdge);
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
    const candidate = prepareCanvasModelCompositionCandidate({
      ...args,
      copy,
      nodes: resolveCanvasDraftNodes(session, args.canonicalNodesById),
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
