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
import { readCanvasPhysicalCopyMetadata } from './canvasModelCompositionPhysicalAdmission';
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

function transformCopyMetadata(source: CanonicalNode, args: CopyContext): Record<string, unknown> {
  if (source.path != null) throw new Error('Independent copying requires native Model authority.');
  if (!readCanvasModelCompositionPublication(source, args.nodes, args.edges))
    throw new Error('Native Model publication is unavailable.');
  const authority = readDvtTransformAuthoringAuthority(source);
  if (!authority) throw new Error('Native semantic authority is unavailable.');
  return { transformAuthoring: authority };
}

function copyMetadata(source: CanonicalNode, args: CopyContext): Record<string, unknown> {
  if (source.kind === 'dvt:source' && ['dvt', 'dvt.warehouse-source'].includes(source.pluginId))
    return readCanvasPhysicalCopyMetadata(source);
  return transformCopyMetadata(source, args);
}

function ownsFileModel(source: CanonicalNode): boolean {
  return (
    readWorkspaceDbtModelReference(source) != null ||
    source.metadata?.authority === 'dbt-project-files'
  );
}

function sourceContext(args: CopyContext) {
  const source = args.nodes.find((node) => node.id === args.sourceId);
  if (!source || ownsFileModel(source))
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
  return { source, edges, metadata: copyMetadata(source, args) };
}

export function canvasModelCopySourceSignature(args: CopyContext): string {
  return sourceSignature(sourceContext(args));
}

function sourceSignature({ source, edges, metadata }: ReturnType<typeof sourceContext>): string {
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
  const context = sourceContext(args);
  const { source, edges, metadata } = context;
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
    sourceSignature: sourceSignature(context),
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
