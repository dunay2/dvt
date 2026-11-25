/**
 * Owned concern: admit producer authority, dependency topology and connection compatibility.
 * @baseline ADR-0064 / ADR-0069: file references remain linked and native copies retain local authority.
 * @decision Revalidate the producer snapshot before admitting a private receiver Input.
 * @consequence Failed or stale composition cannot alter the draft aggregate.
 * @version 1.0.0
 */
import { jcsCanonicalize } from '@dvt/crypto';
import { readWorkspaceDbtModelReference } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { evaluateConnection, type PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import {
  canvasModelCopySourceSignature,
  type CanvasModelWorkingCopy,
} from './canvasModelWorkingCopy';
import {
  canvasDbtModelCompositionSourceSignature,
  type CanvasDbtModelCompositionReference,
} from './canvasDbtModelReference';
import {
  resolveCanvasDvtCompositionInputs,
  type CanvasDvtCompositionInput,
} from './canvasDvtCompositionInputCatalog';
import {
  readCanvasModelCompositionPublication,
  projectCanvasModelCompositionInput,
} from './canvasModelCompositionInput';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { assertCanvasModelCompositionPhysicalInputAvailable } from './canvasModelCompositionPhysicalAdmission';

export type CompositionProducer = CanvasModelWorkingCopy | CanvasDbtModelCompositionReference;

function currentSourceSignature(
  copy: CompositionProducer,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): string {
  if (!('linkedReference' in copy))
    return canvasModelCopySourceSignature({ nodes, edges, sourceId: copy.sourceId });
  const definition = nodes.find((node) => node.id === copy.sourceId);
  if (definition == null) throw new Error('Linked dbt Model is unavailable.');
  if (
    copy.node.definitionId !== definition.id ||
    jcsCanonicalize(copy.linkedReference) !== jcsCanonicalize(copy.node.metadata?.dbtModelReference)
  )
    throw new Error('Linked Model authority has changed.');
  return canvasDbtModelCompositionSourceSignature(definition);
}

export type CandidateArgs = Readonly<{
  copy: CompositionProducer;
  targetId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  pluginPorts: PluginPortMap;
}>;

function assertNativeReceiver(target: CanonicalNode | undefined): void {
  if (target?.pluginId !== 'dvt' || target.kind !== 'dvt:transform')
    throw new Error('Unavailable receiver.');
  if (readWorkspaceDbtModelReference(target) != null)
    throw new Error('A native editable Model receiver is required.');
}

export function compositionNodes(args: CandidateArgs): CanonicalNode[] {
  const { copy, targetId } = args;
  if (
    args.nodes.some((node) => node.id === copy.node.id) ||
    currentSourceSignature(copy, args.nodes, args.edges) !== copy.sourceSignature
  )
    throw new Error('Working-copy source context has changed.');
  const nodes = [...args.nodes, copy.node];
  const target = nodes.find((node) => node.id === targetId);
  assertNativeReceiver(target);
  assertCanvasModelCompositionPhysicalInputAvailable({
    nodes,
    edges: args.edges,
    sourceId: copy.node.id,
    targetId,
  });
  return nodes;
}

export function appendDependency(
  nodes: readonly CanonicalNode[],
  edges: CanonicalEdge[],
  pluginPorts: PluginPortMap,
  edge: CanonicalEdge
): void {
  const source = nodes.find((node) => node.id === edge.sourceId);
  const receiver = nodes.find((node) => node.id === edge.targetId);
  if (source == null) throw new Error('Model dependency source is unavailable.');
  if (receiver == null) throw new Error('Model dependency receiver is unavailable.');
  if (!evaluateConnection(source, receiver, edges, pluginPorts).allowed)
    throw new Error('Model dependency is not admitted.');
  edges.push(edge);
}

function producerInput(
  args: CandidateArgs,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): CanvasDvtCompositionInput {
  const identity = { sourceId: args.copy.node.id, targetId: args.targetId };
  const physical = resolveCanvasPhysicalCompositionInput(args.copy.node, identity);
  const publication =
    physical == null ? readCanvasModelCompositionPublication(args.copy.node, nodes, edges) : null;
  const input =
    physical ??
    (publication == null ? null : projectCanvasModelCompositionInput(publication, identity));
  if (input == null || input.fields.length === 0)
    throw new Error('Working-copy output is unavailable.');
  return input;
}

export function compositionInput(
  args: CandidateArgs,
  nodes: readonly CanonicalNode[],
  edges: readonly CanonicalEdge[]
): CanvasDvtCompositionInput {
  const input = producerInput(args, nodes, edges);
  const connection = input.sourceRef?.connectionRef ?? input.producer?.connection;
  const existing = resolveCanvasDvtCompositionInputs({
    targetNodeId: args.targetId,
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
  return input;
}
