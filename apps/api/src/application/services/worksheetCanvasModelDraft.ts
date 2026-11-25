/** Build the virtual target and complete final draft without invoking persistence. */
import {
  ConnectedSourceRefSchema,
  WorkspaceGraphAuthoringDraftSchema,
  workspaceNodeDefinitionId,
  resolveWorkspaceNodeInstances,
  readWorkspaceDbtModelReference,
  type ConnectedSourceRef,
  type ModelSqlCompilationResponse,
  type WorksheetCanvasModelRequest,
  type WorkspaceDbtModelReference,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import { CanvasModelSqlUnavailableError } from '../ports/canvasModelSql.js';

import type { WorksheetCatalogRelation } from './worksheetCanvasModelCatalog.js';

function replaceActiveCanvas(
  draft: WorkspaceGraphAuthoringDraft,
  nodes: WorkspaceGraphAuthoringDraft['nodes'],
  edges: WorkspaceGraphAuthoringDraft['edges'],
  nodeIds: string[],
  nodePositions: WorkspaceGraphAuthoringDraft['nodePositions']
) {
  const activeId = draft.activeCanvasId ?? draft.canvas.id;
  return {
    ...draft,
    nodes,
    edges,
    nodeIds,
    nodePositions,
    ...(draft.canvases == null
      ? {}
      : {
          canvases: draft.canvases.map((canvas) =>
            canvas.canvas.id === activeId
              ? { ...canvas, nodes, edges, nodeIds, nodePositions }
              : canvas
          ),
        }),
  };
}

export function appendWorksheetSource(
  draft: WorkspaceGraphAuthoringDraft,
  source: WorksheetCatalogRelation,
  input: WorksheetCanvasModelRequest
): Readonly<{ draft: WorkspaceGraphAuthoringDraft; nodeId: string }> {
  const ref = ConnectedSourceRefSchema.parse({
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: input.connectionRef,
    sourceObjectId: source.objectId,
  });
  const { definitions, visible } = worksheetSourcePlacements(draft, ref);
  if (visible != null) return { draft, nodeId: visible.id };
  const definitionId =
    [...definitions][0] ?? 'source_' + sha256HexUtf8(jcsCanonicalize(ref)).slice(0, 20);
  const nodeId = definitionId + '_worksheet';
  const newIds = definitions.size === 0 ? [nodeId, definitionId] : [nodeId];
  if (draft.nodes.some((node) => newIds.includes(node.id)))
    throw new CanvasModelSqlUnavailableError('invalid_model');
  const definition = worksheetSourceDefinition(definitionId, source, ref);
  const original = draft.nodes.find((node) => node.id === definitionId) ?? definition;
  const instance: WorkspaceGraphAuthoringNode = {
    id: nodeId,
    name: original.name,
    pluginId: original.pluginId,
    kind: original.kind,
    role: original.role,
    status: 'idle',
    tags: [...original.tags],
    sourceDefinitionId: definitionId,
  };
  const nodes = [...draft.nodes, ...(definitions.size ? [] : [definition]), instance];
  return {
    nodeId,
    draft: replaceActiveCanvas(draft, nodes, draft.edges, [...draft.nodeIds, nodeId], {
      ...draft.nodePositions,
      [nodeId]: { x: 80, y: 80 + draft.nodeIds.length * 160 },
    }),
  };
}

function worksheetSourcePlacements(draft: WorkspaceGraphAuthoringDraft, ref: ConnectedSourceRef) {
  const resolved = resolveWorkspaceNodeInstances(draft.nodes);
  const matching = resolved.filter(
    (node) => jcsCanonicalize(node.metadata?.connectedSourceRef ?? null) === jcsCanonicalize(ref)
  );
  const definitions = new Set(matching.map((node) => workspaceNodeDefinitionId(node) ?? node.id));
  if (definitions.size > 1) throw new CanvasModelSqlUnavailableError('ambiguous_reference');
  return { definitions, visible: matching.find((node) => draft.nodeIds.includes(node.id)) };
}

function worksheetSourceDefinition(
  id: string,
  source: WorksheetCatalogRelation,
  ref: ConnectedSourceRef
): WorkspaceGraphAuthoringNode {
  return {
    id,
    name: source.displayName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: 'input',
    status: 'idle',
    tags: ['source'],
    metadata: {
      connectedSourceRef: ref,
      sourceName: source.locator.schema,
      tableName: source.locator.name,
      tableIdentifier: source.locator.name,
      database: source.locator.catalog,
      schema: source.locator.schema,
      relationType: source.locator.relationType,
      columns: source.columns,
      constraints: source.constraints,
    },
  };
}

export function appendWorksheetVirtualTarget(
  draft: WorkspaceGraphAuthoringDraft,
  input: WorksheetCanvasModelRequest,
  inputIds: readonly string[]
): WorkspaceGraphAuthoringDraft {
  if (
    draft.nodes.some(
      (node) =>
        node.id === input.modelId ||
        node.name.trim().toLocaleLowerCase('en-US') === input.name.trim().toLocaleLowerCase('en-US')
    )
  )
    throw new CanvasModelSqlUnavailableError('invalid_model');
  const node: WorkspaceGraphAuthoringNode = {
    id: input.modelId,
    name: input.name,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['model'],
    metadata: {},
  };
  const edges = [
    ...draft.edges,
    ...[...new Set(inputIds)].map((sourceId) => ({
      id: 'worksheet_edge_' + sha256HexUtf8(JSON.stringify([sourceId, node.id])).slice(0, 24),
      sourceId,
      targetId: node.id,
      relation: 'lineage' as const,
    })),
  ];
  return WorkspaceGraphAuthoringDraftSchema.parse(
    replaceActiveCanvas(draft, [...draft.nodes, node], edges, [...draft.nodeIds, node.id], {
      ...draft.nodePositions,
      [node.id]: {
        x: Math.max(0, ...Object.values(draft.nodePositions).map((position) => position.x)) + 360,
        y: 80,
      },
    })
  );
}

function fileModelIdentity(reference: WorkspaceDbtModelReference | undefined) {
  if (!reference) return null;
  return jcsCanonicalize({
    canvasId: reference.canvasId,
    uniqueId: reference.uniqueId,
    connection: reference.connectionRef,
  });
}

function fileModelPublication(reference: WorkspaceDbtModelReference) {
  return jcsCanonicalize(
    reference.fields.map(({ name, dataType, nullable }) => ({ name, dataType, nullable }))
  );
}

function existingWorksheetFileModel(
  draft: WorkspaceGraphAuthoringDraft,
  reference: WorkspaceDbtModelReference
) {
  const matching = resolveWorkspaceNodeInstances(draft.nodes).filter(
    (node) =>
      fileModelIdentity(readWorkspaceDbtModelReference(node)) === fileModelIdentity(reference)
  );
  if (!matching.length) return;
  const owners = new Set(matching.map((node) => workspaceNodeDefinitionId(node) ?? node.id));
  if (owners.size !== 1) throw new CanvasModelSqlUnavailableError('ambiguous_reference');
  const node = matching.find((node) => draft.nodeIds.includes(node.id)) ?? matching[0]!;
  if (
    fileModelPublication(readWorkspaceDbtModelReference(node)!) !== fileModelPublication(reference)
  )
    throw new CanvasModelSqlUnavailableError('stale_context');
  return node;
}

export function appendWorksheetFileModel(
  draft: WorkspaceGraphAuthoringDraft,
  reference: WorkspaceDbtModelReference
): Readonly<{ draft: WorkspaceGraphAuthoringDraft; node: WorkspaceGraphAuthoringNode }> {
  const existing = existingWorksheetFileModel(draft, reference);
  if (existing != null) return { draft, node: existing };
  const id = 'dbt_model_' + sha256HexUtf8(jcsCanonicalize(reference)).slice(0, 24);
  if (draft.nodes.some((node) => node.id === id))
    throw new CanvasModelSqlUnavailableError('invalid_model');
  const node: WorkspaceGraphAuthoringNode = {
    id,
    name: reference.uniqueId,
    pluginId: 'dvt',
    kind: 'dvt:transform',
    role: 'transform',
    status: 'idle',
    tags: ['model'],
    metadata: { dbtModelReference: reference },
  };
  return {
    node,
    draft: replaceActiveCanvas(draft, [...draft.nodes, node], draft.edges, [...draft.nodeIds, id], {
      ...draft.nodePositions,
      [id]: { x: 80, y: 80 + draft.nodeIds.length * 160 },
    }),
  };
}

export function completeWorksheetDraft(
  draft: WorkspaceGraphAuthoringDraft,
  input: WorksheetCanvasModelRequest,
  compilation: Extract<ModelSqlCompilationResponse, { status: 'valid' }>
): WorkspaceGraphAuthoringDraft {
  const nodes = draft.nodes.map((node) =>
    node.id === input.modelId
      ? {
          ...node,
          metadata: {
            ...node.metadata,
            transformAuthoring: {
              version: 'v1',
              mode: 'substrait',
              semanticDocument: compilation.semanticDocument,
            },
          },
        }
      : node
  );
  if (draft.edges.every((edge) => edge.targetId !== input.modelId))
    throw new CanvasModelSqlUnavailableError('input_unavailable');
  return WorkspaceGraphAuthoringDraftSchema.parse(
    replaceActiveCanvas(draft, nodes, draft.edges, draft.nodeIds, draft.nodePositions)
  );
}
