/**
 * Owned concern: retain and revalidate file-only producer discovery before private Model Apply.
 * @baseline ADR-0064 / ADR-0069: accepted file publications remain the sole producer authority.
 * @decision Read the existing scoped project query once before registering all discovered inputs.
 * @consequence Cancel never registers a definition, and stale or unauthorized Apply cannot publish it.
 * @version 1.0.0
 */
import {
  readWorkspaceDbtModelReference,
  workspaceNodeDefinitionId,
  type WorkspaceDbtModelReference,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';
import { jcsCanonicalize } from '@dvt/crypto';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftInputChanges,
  CanvasInspectorNodeDraftApplyResult,
} from './canvasInspectorAuthoring.types';
import {
  createCanvasDbtModelDefinition,
  resolveCanvasDbtModelSignature,
} from './canvasDbtModelReference';
import { createCanvasNodeInstance } from './canvasNodeInstance';

export type CanvasDbtModelCompositionReference = Readonly<{
  sourceId: string;
  sourceSignature: string;
  node: CanonicalNode;
  edges: readonly [];
  linkedReference: WorkspaceDbtModelReference;
  discovery?: CanvasDbtModelDiscovery;
}>;

export function canvasDbtModelCompositionSourceSignature(node: CanonicalNode): string {
  const signature = resolveCanvasDbtModelSignature(node);
  if (signature == null || workspaceNodeDefinitionId(node) != null)
    throw new Error('A registered dbt Model publication is required.');
  return jcsCanonicalize({
    id: node.id,
    path: node.path ?? null,
    metadata: node.metadata,
    reference: signature.reference,
  });
}

/** Allocate only a placement; authority remains on the current registered file definition. */
export function prepareCanvasDbtModelCompositionReference(
  args: Readonly<{
    sourceId: string;
    nodes: readonly CanonicalNode[];
    discovery?: CanvasDbtModelDiscovery;
  }>
): CanvasDbtModelCompositionReference {
  const definition = args.nodes.find((node) => node.id === args.sourceId);
  if (definition == null) throw new Error('The registered dbt Model is unavailable.');
  const sourceSignature = canvasDbtModelCompositionSourceSignature(definition);
  if (
    args.discovery != null &&
    canvasDbtModelCompositionSourceSignature(args.discovery.definition) !== sourceSignature
  )
    throw new Error('Discovered Model publication has changed.');
  return {
    sourceId: definition.id,
    sourceSignature,
    linkedReference: readWorkspaceDbtModelReference(definition)!,
    node: createCanvasNodeInstance(definition, new Set(args.nodes.map((node) => node.name))),
    edges: [],
    ...(args.discovery == null ? {} : { discovery: args.discovery }),
  };
}

export type CanvasDbtModelDiscovery = Readonly<{
  definition: CanonicalNode;
  projectRevisionSha256: DbtProjectGraphProjection['projectRevision']['contentSetSha256'];
  analysisSha256: DbtProjectGraphProjection['analysisSha256'];
  projectRoot: string;
}>;

export type CanvasDbtModelPublication = Readonly<{
  projection: DbtProjectGraphProjection | undefined;
  refresh: () => Promise<DbtProjectGraphProjection | undefined>;
}>;

export function discoverCanvasDbtModels(
  projection: DbtProjectGraphProjection | undefined,
  nodes: readonly CanonicalNode[]
): ReadonlyMap<string, CanvasDbtModelDiscovery> {
  const discovered = new Map<string, CanvasDbtModelDiscovery>();
  if (projection?.authorityBinding.authority.kind !== 'dbt-project-files') return discovered;
  const registered = new Set(
    nodes.flatMap((node) => {
      const ref = readWorkspaceDbtModelReference(node);
      return ref == null ? [] : [JSON.stringify([ref.canvasId, ref.uniqueId])];
    })
  );
  for (const model of projection.nodes) {
    if (registered.has(JSON.stringify([projection.authorityBinding.canvasId, model.uniqueId])))
      continue;
    try {
      const definition = createCanvasDbtModelDefinition(projection, model.uniqueId);
      discovered.set(definition.id, {
        definition,
        projectRevisionSha256: projection.projectRevision.contentSetSha256,
        analysisSha256: projection.analysisSha256,
        projectRoot: projection.authorityBinding.authority.projectRoot,
      });
    } catch {
      // The canonical factory denies unsupported, stale and unpublished project resources.
    }
  }
  return discovered;
}

function sameDiscoveryRevision(
  discovery: CanvasDbtModelDiscovery,
  current: DbtProjectGraphProjection
): boolean {
  if (current.freshness !== 'fresh' || !current.capabilities.canPreview) return false;
  const authority = current.authorityBinding.authority;
  if (authority.kind !== 'dbt-project-files' || authority.projectRoot !== discovery.projectRoot)
    return false;
  return (
    current.projectRevision.contentSetSha256 === discovery.projectRevisionSha256 &&
    current.analysisSha256 === discovery.analysisSha256
  );
}

function sameDiscoveryOutput(
  discovery: CanvasDbtModelDiscovery,
  current: DbtProjectGraphProjection
): boolean {
  const reference = readWorkspaceDbtModelReference(discovery.definition);
  if (reference == null || current.authorityBinding.canvasId !== reference.canvasId) return false;
  const model = current.nodes.find(
    (node) => node.uniqueId === reference.uniqueId && node.resourceType === 'model'
  );
  const connection = current.executionTarget?.connectionRef;
  if (model == null || connection == null) return false;
  if (jcsCanonicalize(connection) !== jcsCanonicalize(reference.connectionRef)) return false;
  const fields = reference.fields.map(({ name, dataType, nullable }) => ({
    name,
    dataType,
    nullable,
  }));
  const columns = model.columns.map((column) => ({
    name: column.name,
    dataType: column.dataType,
    nullable: true,
  }));
  return jcsCanonicalize(fields) === jcsCanonicalize(columns);
}

async function applyDiscoveredModels(
  authoring: CanvasRelationalTreeAuthoringContract,
  refresh: CanvasDbtModelPublication['refresh'] | undefined,
  nodeId: string,
  draft: CanvasInspectorNodeDraft,
  changes: CanvasInspectorNodeDraftInputChanges,
  discoveries: readonly CanvasDbtModelDiscovery[]
): Promise<CanvasInspectorNodeDraftApplyResult> {
  const signal = changes.signal;
  if (signal == null) return { outcome: 'rejected', reason: 'node_unavailable' };
  signal.throwIfAborted();
  if (!authoring.canEditNode || refresh == null)
    return { outcome: 'rejected', reason: 'node_unavailable' };
  const current = await refresh();
  signal.throwIfAborted();
  if (current == null) return { outcome: 'rejected', reason: 'invalid_draft' };
  if (
    !discoveries.every(
      (discovery) =>
        sameDiscoveryRevision(discovery, current) && sameDiscoveryOutput(discovery, current)
    )
  )
    return { outcome: 'rejected', reason: 'invalid_draft' };
  return authoring.onApplyNodeDraft(nodeId, draft, changes);
}

export function guardDiscoveredDbtCompositionApply(
  authoring: CanvasRelationalTreeAuthoringContract | undefined,
  refresh: CanvasDbtModelPublication['refresh'] | undefined
): CanvasRelationalTreeAuthoringContract | undefined {
  if (authoring == null) return undefined;
  return {
    ...authoring,
    onApplyNodeDraft(nodeId, draft, changes) {
      const discoveries =
        changes?.modelCopies?.flatMap(({ copy }) =>
          'linkedReference' in copy && copy.discovery != null ? [copy.discovery] : []
        ) ?? [];
      if (discoveries.length === 0) return authoring.onApplyNodeDraft(nodeId, draft, changes);
      return applyDiscoveredModels(authoring, refresh, nodeId, draft, changes!, discoveries);
    },
  };
}
