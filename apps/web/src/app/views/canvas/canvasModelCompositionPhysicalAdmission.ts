/**
 * Owned concern: admit one physical resource identity per receiver during Model composition.
 * Reason to change: physical Input identity must remain unambiguous before a private copy is staged.
 * @baseline ADR-0064 / ADR-0070: preserve shared physical references and independent working identities.
 * @decision Reuse canonical Source keys and instance projections for direct incoming dependencies.
 * @consequence Upstream Sources and native Model copies remain eligible without weakening the binder.
 * @version 1.0.0
 */
import { resolveWorkspaceNodeInstances, projectWorkspaceNodeInstanceEdges } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import {
  canvasPhysicalSourceReferenceKey,
  canvasSourceReferenceKey,
} from './canvasRelationalAnalysis';
import type { CanvasDvtCompositionInput } from './canvasDvtCompositionInputCatalog';

function admittedPhysicalInput(
  input: CanvasDvtCompositionInput | undefined,
  key: string
): CanvasDvtCompositionInput | null {
  if (input?.sourceRef == null || input.fields.length === 0) return null;
  return canvasSourceReferenceKey(input.sourceRef) === key ? input : null;
}

function physicalInputsByReference(
  args: Readonly<{
    nodes: ReadonlyMap<string, CanonicalNode>;
    edges: readonly CanonicalEdge[];
    inputs: ReadonlyMap<string, CanvasDvtCompositionInput>;
    targetId: string;
  }>
): ReadonlyMap<string, CanvasDvtCompositionInput | null> {
  const physical = new Map<string, CanvasDvtCompositionInput | null>();
  for (const edge of args.edges) {
    if (edge.targetId !== args.targetId) continue;
    const source = args.nodes.get(edge.sourceId);
    const key = source == null ? null : canvasPhysicalSourceReferenceKey(source);
    if (key == null) continue;
    const input = admittedPhysicalInput(args.inputs.get(edge.sourceId), key);
    physical.set(key, physical.has(key) ? null : input);
  }
  return physical;
}

/** Index existing admitted Inputs once; Read count cannot remove a physical dependency. */
export function readCanvasModelCompositionPhysicalInputs(
  args: Readonly<{
    targetId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
    inputs: readonly CanvasDvtCompositionInput[];
  }>
): ReadonlyMap<string, CanvasDvtCompositionInput | null> {
  const nodes = resolveWorkspaceNodeInstances(args.nodes);
  const physical = physicalInputsByReference({
    nodes: new Map(nodes.map((node) => [node.id, node])),
    edges: projectWorkspaceNodeInstanceEdges(args.nodes, args.edges),
    inputs: new Map(args.inputs.map((input) => [input.nodeId, input])),
    targetId: args.targetId,
  });
  const result = new Map<string, CanvasDvtCompositionInput | null>();
  for (const node of nodes) {
    const key = canvasPhysicalSourceReferenceKey(node);
    if (key != null && physical.has(key)) result.set(node.id, physical.get(key) ?? null);
  }
  return result;
}

export function assertCanvasModelCompositionPhysicalInputAvailable(
  args: Readonly<{
    sourceId: string;
    targetId: string;
    nodes: readonly CanonicalNode[];
    edges: readonly CanonicalEdge[];
  }>
): void {
  const nodes = new Map(resolveWorkspaceNodeInstances(args.nodes).map((node) => [node.id, node]));
  const source = nodes.get(args.sourceId);
  const key = source == null ? null : canvasPhysicalSourceReferenceKey(source);
  if (key == null) return;
  for (const edge of projectWorkspaceNodeInstanceEdges(args.nodes, args.edges)) {
    if (edge.targetId !== args.targetId) continue;
    const input = nodes.get(edge.sourceId);
    if (input != null && canvasPhysicalSourceReferenceKey(input) === key)
      throw new Error('Physical Source already supplies this receiver.');
  }
}

export function readCanvasPhysicalCopyMetadata(source: CanonicalNode): Record<string, unknown> {
  if (!resolveCanvasPhysicalCompositionInput(source, { sourceId: source.id, targetId: source.id }))
    throw new Error('Physical Model publication is unavailable.');
  const metadata = Object.fromEntries(
    ['columns', 'schema', 'tableName', 'connectedSourceRef'].map((key) => [
      key,
      source.metadata?.[key],
    ])
  );
  const authority = readDvtTransformAuthoringAuthority(source);
  if (authority != null) metadata.transformAuthoring = authority;
  return metadata;
}
