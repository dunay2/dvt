/**
 * Owned concern: Prepare one independent native Model and its dependency context.
 * Reason to change: Native Model copy eligibility or safe authoring fields change.
 * @baseline ADR-0064 / ADR-0069: canonical semantics and focused application boundaries.
 * @decision Copy admitted semantics and shared resource references with fresh local identity.
 * @consequence File authority, durable targets and runtime evidence cannot leak into a working copy.
 * @version 1.0.0
 */
import {
  CANVAS_AUTHORING_FIELD_LIMITS_V1,
  readWorkspaceDbtModelReference,
  projectWorkspaceNodeInstanceEdges,
  readWorkspaceGraphAuthoringEdgeExecutionGate,
} from '@dvt/contracts';
import { jcsCanonicalize, randomUuidV4 } from '@dvt/crypto';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import {
  applyDvtSubstraitSemanticDocument,
  readDvtTransformAuthoringAuthority,
} from './canvasDvtTransformAuthoringAuthority';
import { copyCanvasSemanticDocument } from './canvasSemanticDocumentCopy';
import { resolveCanvasPhysicalCompositionInput } from './canvasPhysicalCompositionInput';
import { readCanvasModelCompositionPublication } from './canvasModelCompositionInput';
import { readCanvasInputBindings } from './canvasInputBindings';

export type CanvasModelWorkingCopy = Readonly<{
  sourceId: string;
  sourceSignature: string;
  node: CanonicalNode;
  edges: readonly CanonicalEdge[];
}>;
type CopyContext = Readonly<{
  sourceId: string;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
}>;

function dependencyMetadata(edge: CanonicalEdge): Record<string, unknown> {
  const inputBindings = readCanvasInputBindings(edge);
  const gate = readWorkspaceGraphAuthoringEdgeExecutionGate(edge);
  if (gate === 'invalid') throw new Error('Invalid dependency gate.');
  return {
    ...(inputBindings == null ? {} : { inputBindings: structuredClone(inputBindings) }),
    ...(gate === 'closed' ? { executionGate: 'closed' } : {}),
  };
}

function sourceContext(args: CopyContext) {
  const source = args.nodes.find((node) => node.id === args.sourceId);
  if (
    source == null ||
    source.path != null ||
    readWorkspaceDbtModelReference(source) != null ||
    source.metadata?.authority === 'dbt-project-files'
  )
    throw new Error('Independent copying requires native Model authority.');
  const edges = projectWorkspaceNodeInstanceEdges(args.nodes, args.edges).filter(
    (edge) => edge.targetId === source.id
  );
  if (
    edges.some(
      (edge) => edge.relation !== 'lineage' || edge.metadata?.executionDependency === false
    )
  )
    throw new Error('Working copies require lossless native data dependencies.');
  let metadata: Record<string, unknown>;
  if (
    source.kind === 'dvt:source' &&
    source.role === 'input' &&
    ['dvt', 'dvt.warehouse-source'].includes(source.pluginId)
  ) {
    if (
      resolveCanvasPhysicalCompositionInput(source, { sourceId: source.id, targetId: source.id }) ==
      null
    )
      throw new Error('Physical Model publication is unavailable.');
    metadata = Object.fromEntries(
      ['columns', 'schema', 'tableName', 'connectedSourceRef'].map((key) => [
        key,
        source.metadata?.[key],
      ])
    );
    const authority = readDvtTransformAuthoringAuthority(source);
    if (authority != null) metadata.transformAuthoring = authority;
  } else if (
    source.kind === 'dvt:transform' &&
    source.pluginId === 'dvt' &&
    source.role === 'transform'
  ) {
    if (readCanvasModelCompositionPublication(source, args.nodes, args.edges) == null)
      throw new Error('Native Model publication is unavailable.');
    const authority = readDvtTransformAuthoringAuthority(source);
    if (authority == null) throw new Error('Native semantic authority is unavailable.');
    metadata = { transformAuthoring: authority };
  } else throw new Error('Unsupported independent Model authority.');
  return { source, edges, metadata };
}

export function canvasModelCopySourceSignature(args: CopyContext): string {
  const { source, edges, metadata } = sourceContext(args);
  return jcsCanonicalize({
    id: source.id,
    kind: source.kind,
    pluginId: source.pluginId,
    metadata,
    edges: edges
      .map((edge) => ({
        sourceId: edge.sourceId,
        targetId: edge.targetId,
        metadata: dependencyMetadata(edge),
      }))
      .sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
  });
}

export function prepareCanvasModelWorkingCopy(args: CopyContext): CanvasModelWorkingCopy {
  const { source, edges, metadata } = sourceContext(args);
  const names = new Set(args.nodes.map((node) => node.name));
  let ordinal = 2;
  let name: string;
  do {
    const suffix = ` ${ordinal++}`;
    name =
      [...source.name].length + suffix.length <=
      CANVAS_AUTHORING_FIELD_LIMITS_V1.humanNameCodePoints
        ? source.name + suffix
        : `Model${suffix}`;
  } while (names.has(name));
  let node: CanonicalNode = {
    id: randomUuidV4(),
    name,
    pluginId: source.pluginId,
    kind: source.kind,
    role: source.role,
    status: 'idle',
    tags: [...source.tags],
    description: source.description,
    metadata: structuredClone(metadata),
  };
  const authority = readDvtTransformAuthoringAuthority(source);
  if (authority != null) {
    node = applyDvtSubstraitSemanticDocument(
      node,
      copyCanvasSemanticDocument(authority.semanticDocument)
    );
  }
  return {
    sourceId: source.id,
    sourceSignature: canvasModelCopySourceSignature(args),
    node,
    edges: edges.map((edge) => ({
      id: randomUuidV4(),
      sourceId: edge.sourceId,
      targetId: node.id,
      relation: edge.relation,
      metadata: dependencyMetadata(edge),
    })),
  };
}
