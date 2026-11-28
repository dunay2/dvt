/** Validate protected dependency selection independently of semantic projection. */
import {
  DVT_SINK_NODE_KINDS,
  WorkspaceGraphAuthoringDraftSchema,
  resolveWorkspaceNodeInstances,
  readWorkspaceDbtModelReference,
  DvtTransformAuthoringAuthorityV1Schema,
  hasIncompleteDvtRelationalAuthoring,
  isSourceFreeDvtSubstraitDocumentV1,
  type WorkspaceGraphAuthoringDraft,
} from '@dvt/contracts';

import { requireDvtSelectionEdges } from './dvtProtectedSelectionEdges.js';

type SelectionNode = WorkspaceGraphAuthoringDraft['nodes'][number];

function isDvtSource(node: SelectionNode): boolean {
  if (!['dvt', 'dvt.warehouse-source'].includes(node.pluginId)) return false;
  return node.kind === 'dvt:source' && node.role === 'input';
}

function hasIndependentPublication(node: SelectionNode): boolean {
  if (readWorkspaceDbtModelReference(node)) return true;
  const authority = DvtTransformAuthoringAuthorityV1Schema.safeParse(
    node.metadata?.['transformAuthoring']
  );
  return authority.success && isSourceFreeDvtSubstraitDocumentV1(authority.data.semanticDocument);
}

export type DvtTransformSelection = Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  selectedNodeIds: readonly string[];
  selectedEdgeIds: readonly string[];
  previewTargetId?: string;
}>;

export type ProtectedTransformSelection = Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  sources: Readonly<WorkspaceGraphAuthoringDraft['nodes']>;
  transforms: Readonly<WorkspaceGraphAuthoringDraft['nodes']>;
  transform: WorkspaceGraphAuthoringDraft['nodes'][number];
  sink?: WorkspaceGraphAuthoringDraft['nodes'][number];
  edges: Readonly<WorkspaceGraphAuthoringDraft['edges']>;
}>;

function selectReceiver(
  transforms: readonly SelectionNode[],
  previewId: string | undefined
): SelectionNode {
  if (previewId !== undefined) {
    const target = transforms.find((node) => node.id === previewId);
    if (!target)
      throw new Error('Selection must contain DVT Sources and one rooted consumer closure.');
    return target;
  }
  if (transforms.some(({ metadata }) => hasIncompleteDvtRelationalAuthoring(metadata)))
    throw new Error('Operational selection requires completed Model authoring.');
  const native = transforms.filter((node) => readWorkspaceDbtModelReference(node) == null);
  if (native.length !== 1)
    throw new Error('Operational workloads require exactly one Transform authority.');
  return native[0]!;
}

function selectSink(nodes: readonly SelectionNode[], preview: boolean): SelectionNode | undefined {
  const sinks = nodes.filter(
    (node) =>
      node.pluginId === 'dvt' &&
      node.role === 'output' &&
      DVT_SINK_NODE_KINDS.some((kind) => kind === node.kind)
  );
  if (sinks.length > (preview ? 0 : 1))
    throw new Error('Operational selection admits at most one explicit Sink.');
  return sinks[0];
}

export function selectProtectedDvtTransforms(
  input: DvtTransformSelection
): ProtectedTransformSelection {
  const draft = WorkspaceGraphAuthoringDraftSchema.parse(input.draft);
  const nodes = selectExact(
    resolveWorkspaceNodeInstances(draft.nodes),
    input.selectedNodeIds,
    'node'
  );
  const edges = selectExact(draft.edges, input.selectedEdgeIds, 'edge');
  const sources = nodes.filter(isDvtSource);
  const transforms = nodes.filter(
    (node) =>
      node.pluginId === 'dvt' &&
      node.role === 'transform' &&
      ['transform', 'dvt:transform'].includes(node.kind)
  );
  const preview = input.previewTargetId != null;
  const sink = selectSink(nodes, preview);
  const transform = selectReceiver(transforms, input.previewTargetId);
  const classified = sources.length + transforms.length + Number(sink != null);
  const published = sources.length > 0 || transforms.some(hasIndependentPublication);
  if (!published || classified !== nodes.length)
    throw new Error('Selection must contain DVT Sources and one rooted consumer closure.');
  const selection = { draft, sources, transforms, transform, edges, ...(sink ? { sink } : {}) };
  requireDvtSelectionEdges(selection, preview);
  return selection;
}

function selectExact<T extends { readonly id: string }>(
  items: readonly T[],
  ids: readonly string[],
  kind: 'node' | 'edge'
): readonly T[] {
  if ((kind === 'node' && ids.length === 0) || new Set(ids).size !== ids.length) {
    throw new Error(`Expected unique selected ${kind} identities.`);
  }
  const itemById = new Map(items.map((item) => [item.id, item]));
  return ids.map((id) => {
    const item = itemById.get(id);
    if (item === undefined) throw new Error(`Selection references an unknown ${kind}.`);
    return item;
  });
}
