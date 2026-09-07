/**
 * Owned concern: verify and plan one physical warehouse Source rebind without
 * performing graph or file writes.
 */
import {
  ConnectedSourceRefSchema,
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtTransformAuthoringAuthorityV1Schema,
  SourceObjectColumnSchema,
  WorkspaceGraphAuthoringDraftSchema,
  isRelationalSourceObject,
  type ConnectedSourceRef,
  type RelationalSourceObject,
  type SourceObjectColumn,
  type WorkspaceGraphAuthoringCanvasWorkspace,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { rebindDvtSubstraitSemanticSourceRefV1 } from '@dvt/contracts/substrait';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import {
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
} from '../ports/warehouseSourceImport.js';
import {
  WarehouseSourceRebindBindingConflictError,
  WarehouseSourceRebindNodeNotFoundError,
  WarehouseSourceRebindSchemaDriftError,
  WarehouseSourceRebindUnverifiedError,
  type RebindWarehouseSourceInput,
} from '../ports/warehouseSourceRebind.js';
import type { IWorkspaceFileRepository } from '../ports/workspaceFiles.js';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';
import type { SourceYamlRebindPlan } from './warehouseSourceRebindArtifactTransaction.js';
import { readExistingSourceDocument, serializeSourceDocument } from './warehouseSourceYaml.js';
import { buildGovernedSourceMetadata } from './warehouseSourceYamlMerge.js';

const SOURCE_PLUGIN_ID = 'dvt.warehouse-source';

type LocatedSource = Readonly<{
  canvasId: string;
  canvas: WorkspaceGraphAuthoringCanvasWorkspace;
  node: WorkspaceGraphAuthoringNode;
}>;

export type PreparedWarehouseSourceRebind = Readonly<{
  nextDraft: WorkspaceGraphAuthoringDraft;
  nextRef: ConnectedSourceRef;
  yamlPlan: SourceYamlRebindPlan;
  requestHash: string;
}>;

export async function prepareWarehouseSourceRebind(input: {
  command: RebindWarehouseSourceInput;
  draft: WorkspaceGraphAuthoringDraft;
  sourceObjectReader: WarehouseConnectionSourceObjectReader;
  workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
}): Promise<PreparedWarehouseSourceRebind> {
  const located = locateLogicalSource(input.draft, input.command.nodeId);
  const currentRef = readConnectedSourceRef(located.node);
  const persistedColumns = readPersistedColumns(located.node);
  const targetCatalog = await input.sourceObjectReader.read(
    input.command.scope,
    input.command.connectionId
  );
  const targetObject = targetCatalog.sourceObjects.find(
    (candidate) => candidate.objectId === input.command.sourceObjectId
  );
  if (targetObject == null) throw new SourceObjectNotFoundError(input.command.sourceObjectId);
  if (!isRelationalSourceObject(targetObject)) {
    throw new UnsupportedSourceObjectImportError(targetObject.objectId, targetObject.locator.kind);
  }
  const databaseUser = targetCatalog.databaseUser?.trim();
  if (!databaseUser) {
    throw new WarehouseSourceRebindUnverifiedError(
      'The target connection did not expose the governed database user required for dbt binding.'
    );
  }
  assertCompatibleColumns(persistedColumns, targetObject.columns);

  const nextRef = ConnectedSourceRefSchema.parse({
    schemaVersion: 'connected-source-ref.v1',
    connectionRef: {
      schemaVersion: 'connection-ref.v1',
      connectionId: targetCatalog.connection.id,
      provider: targetCatalog.connection.type,
    },
    sourceObjectId: targetObject.objectId,
  });
  assertBindingAvailable(located.canvas, located.node.id, nextRef);

  return {
    nextRef,
    yamlPlan: await buildSourceYamlRebindPlan({
      workspaceFiles: input.workspaceFiles,
      scope: input.command.scope,
      node: located.node,
      targetRef: nextRef,
      targetObject,
      databaseUser,
    }),
    nextDraft: rebindDraft({
      draft: input.draft,
      located,
      currentRef,
      nextRef,
      targetObject,
      connectionName: targetCatalog.connection.name,
      databaseUser,
    }),
    requestHash: sha256HexUtf8(
      jcsCanonicalize({
        scope: input.command.scope,
        nodeId: input.command.nodeId,
        connectionId: input.command.connectionId,
        sourceObjectId: input.command.sourceObjectId,
      })
    ),
  };
}

function locateLogicalSource(draft: WorkspaceGraphAuthoringDraft, nodeId: string): LocatedSource {
  const matches = (draft.canvases ?? []).flatMap((canvas) => {
    const node = canvas.nodes.find((candidate) => candidate.id === nodeId);
    return node == null ? [] : [{ canvasId: canvas.canvas.id, canvas, node }];
  });
  if (matches.length > 1) {
    throw new WarehouseSourceRebindBindingConflictError(
      'A logical Source ID must belong to exactly one Canvas.'
    );
  }
  const match = matches[0];
  if (match != null) return assertImportedSource(match);

  const node = draft.nodes.find((candidate) => candidate.id === nodeId);
  const canvasId = draft.canvas.id;
  if (node == null || canvasId == null) throw new WarehouseSourceRebindNodeNotFoundError(nodeId);
  return assertImportedSource({
    canvasId,
    canvas: {
      canvas: { ...draft.canvas, id: canvasId },
      nodeIds: draft.nodeIds,
      nodePositions: draft.nodePositions,
      nodes: draft.nodes,
      edges: draft.edges,
    },
    node,
  });
}

function assertImportedSource(located: LocatedSource): LocatedSource {
  if (located.node.pluginId !== SOURCE_PLUGIN_ID || located.node.kind !== 'dvt:source') {
    throw new WarehouseSourceRebindNodeNotFoundError(located.node.id);
  }
  return located;
}

function readConnectedSourceRef(node: WorkspaceGraphAuthoringNode): ConnectedSourceRef {
  const parsed = ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef);
  if (!parsed.success || node.metadata?.sourceObjectId !== undefined) {
    throw new WarehouseSourceRebindBindingConflictError(
      'The logical Source does not have one canonical ConnectedSourceRef binding.'
    );
  }
  return parsed.data;
}

function readPersistedColumns(node: WorkspaceGraphAuthoringNode): readonly SourceObjectColumn[] {
  const parsed = SourceObjectColumnSchema.array().safeParse(node.metadata?.columns);
  if (!parsed.success) {
    throw new WarehouseSourceRebindUnverifiedError(
      'The logical Source has no complete persisted column schema for compatibility verification.'
    );
  }
  assertUniqueColumnNames(parsed.data);
  return parsed.data;
}

function assertCompatibleColumns(
  current: readonly SourceObjectColumn[],
  target: readonly SourceObjectColumn[] | undefined
): void {
  if (target == null) {
    throw new WarehouseSourceRebindUnverifiedError(
      'The target warehouse object has no complete column schema for compatibility verification.'
    );
  }
  assertUniqueColumnNames(target);
  if (current.length !== target.length) throw new WarehouseSourceRebindSchemaDriftError();
  const targetByName = new Map(target.map((column) => [column.name, column] as const));
  for (const currentColumn of current) {
    const targetColumn = targetByName.get(currentColumn.name);
    if (
      targetColumn == null ||
      normalizeType(targetColumn.type) !== normalizeType(currentColumn.type) ||
      targetColumn.nullable !== currentColumn.nullable
    ) {
      throw new WarehouseSourceRebindSchemaDriftError();
    }
  }
}

function assertUniqueColumnNames(columns: readonly Readonly<{ name: string }>[]): void {
  if (new Set(columns.map((column) => column.name)).size !== columns.length) {
    throw new WarehouseSourceRebindUnverifiedError(
      'Column identity is ambiguous in Source schema evidence.'
    );
  }
}

function normalizeType(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function assertBindingAvailable(
  canvas: WorkspaceGraphAuthoringCanvasWorkspace,
  nodeId: string,
  targetRef: ConnectedSourceRef
): void {
  const targetKey = jcsCanonicalize(targetRef);
  for (const candidate of canvas.nodes) {
    if (candidate.id === nodeId || candidate.kind !== 'dvt:source') continue;
    const parsed = ConnectedSourceRefSchema.safeParse(candidate.metadata?.connectedSourceRef);
    if (parsed.success && jcsCanonicalize(parsed.data) === targetKey) {
      throw new WarehouseSourceRebindBindingConflictError(
        'Another logical Source already owns the requested connected binding in this Canvas.'
      );
    }
  }
}

async function buildSourceYamlRebindPlan(input: {
  workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
  scope: RebindWarehouseSourceInput['scope'];
  node: WorkspaceGraphAuthoringNode;
  targetRef: ConnectedSourceRef;
  targetObject: RelationalSourceObject;
  databaseUser: string;
}): Promise<SourceYamlRebindPlan> {
  const path = readNonBlank(input.node.path);
  const sourceName = readNonBlank(input.node.metadata?.sourceName);
  const tableName = readNonBlank(input.node.metadata?.tableName);
  if (path == null || sourceName == null || tableName == null) {
    throw new WarehouseSourceRebindBindingConflictError(
      'The logical Source is missing its canonical dbt source artifact binding.'
    );
  }
  const previousFile = await input.workspaceFiles.getFileContent(input.scope, path);
  let document: ReturnType<typeof readExistingSourceDocument>;
  try {
    document = readExistingSourceDocument(previousFile.content);
  } catch {
    throw new WarehouseSourceRebindBindingConflictError(
      'The persisted dbt source artifact cannot be decoded safely.'
    );
  }
  const matchingSources = document.sources.filter((candidate) => candidate.name === sourceName);
  const source = matchingSources[0];
  if (matchingSources.length !== 1 || source == null) {
    throw new WarehouseSourceRebindBindingConflictError(
      'The bound dbt source declaration is ambiguous.'
    );
  }
  const matchingTables = source.tables.filter((candidate) => candidate.name === tableName);
  const table = matchingTables[0];
  if (matchingTables.length !== 1 || table == null) {
    throw new WarehouseSourceRebindBindingConflictError('The bound dbt source table is ambiguous.');
  }

  const changesSharedBinding =
    (source.database ?? input.node.metadata?.database) !== input.targetObject.locator.catalog ||
    (source.schema ?? input.node.metadata?.schema) !== input.targetObject.locator.schema;
  if (changesSharedBinding && source.tables.length !== 1) {
    throw new WarehouseSourceRebindBindingConflictError(
      'A shared dbt source group cannot change database/schema through a single-Source rebind.'
    );
  }

  const { identifier: _oldIdentifier, ...tableWithoutIdentifier } = table;
  const nextTable = {
    ...tableWithoutIdentifier,
    ...(tableName === input.targetObject.locator.name
      ? {}
      : { identifier: input.targetObject.locator.name }),
    metadata: buildGovernedSourceMetadata(
      table.metadata,
      input.targetRef.connectionRef.connectionId,
      input.databaseUser
    ),
  };
  const nextSource = {
    ...source,
    database: input.targetObject.locator.catalog,
    schema: input.targetObject.locator.schema,
    tables: source.tables.map((candidate) => (candidate === table ? nextTable : candidate)),
  };
  return {
    path,
    previousFile,
    content: serializeSourceDocument({
      ...document,
      sources: document.sources.map((candidate) => (candidate === source ? nextSource : candidate)),
    }),
  };
}

function rebindDraft(input: {
  draft: WorkspaceGraphAuthoringDraft;
  located: LocatedSource;
  currentRef: ConnectedSourceRef;
  nextRef: ConnectedSourceRef;
  targetObject: RelationalSourceObject;
  connectionName: string;
  databaseUser: string;
}): WorkspaceGraphAuthoringDraft {
  const reachableNodeIds = collectReachableNodeIds(input.located.canvas, input.located.node.id);
  const nodes = input.located.canvas.nodes.map((node) => {
    const reboundNode = node.id === input.located.node.id ? rebindSourceNode(node, input) : node;
    return reachableNodeIds.has(node.id)
      ? rebindNodeSemanticAuthority(reboundNode, input.currentRef, input.nextRef)
      : reboundNode;
  });
  const nextCanvas = { ...input.located.canvas, nodes };
  const targetIsTopLevel = input.draft.canvas.id === input.located.canvasId;
  return WorkspaceGraphAuthoringDraftSchema.parse({
    ...input.draft,
    ...(targetIsTopLevel
      ? {
          canvas: nextCanvas.canvas,
          nodeIds: nextCanvas.nodeIds,
          nodePositions: nextCanvas.nodePositions,
          nodes: nextCanvas.nodes,
          edges: nextCanvas.edges,
        }
      : {}),
    ...(input.draft.canvases == null
      ? {}
      : {
          canvases: input.draft.canvases.map((canvas) =>
            canvas.canvas.id === input.located.canvasId ? nextCanvas : canvas
          ),
        }),
  });
}

function rebindSourceNode(
  node: WorkspaceGraphAuthoringNode,
  input: {
    targetObject: RelationalSourceObject;
    nextRef: ConnectedSourceRef;
    connectionName: string;
    databaseUser: string;
  }
): WorkspaceGraphAuthoringNode {
  return {
    ...node,
    description: `Imported source for ${input.targetObject.locator.catalog}.${input.targetObject.locator.schema}.${input.targetObject.locator.name}`,
    metadata: {
      ...node.metadata,
      connectedSourceRef: input.nextRef,
      connectionName: input.connectionName,
      databaseUser: input.databaseUser,
      database: input.targetObject.locator.catalog,
      schema: input.targetObject.locator.schema,
      tableIdentifier: input.targetObject.locator.name,
      relationType: input.targetObject.locator.relationType,
      sourceMetricEvidence: input.targetObject.metricEvidence,
    },
  };
}

function collectReachableNodeIds(
  canvas: WorkspaceGraphAuthoringCanvasWorkspace,
  sourceNodeId: string
): ReadonlySet<string> {
  const reachable = new Set<string>([sourceNodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of canvas.edges) {
      if (reachable.has(edge.sourceId) && !reachable.has(edge.targetId)) {
        reachable.add(edge.targetId);
        changed = true;
      }
    }
  }
  return reachable;
}

function rebindNodeSemanticAuthority(
  node: WorkspaceGraphAuthoringNode,
  currentRef: ConnectedSourceRef,
  nextRef: ConnectedSourceRef
): WorkspaceGraphAuthoringNode {
  const rawAuthority = node.metadata?.[DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY];
  if (rawAuthority === undefined) return node;
  const parsed = DvtTransformAuthoringAuthorityV1Schema.safeParse(rawAuthority);
  if (!parsed.success) {
    throw new WarehouseSourceRebindBindingConflictError(
      'A reachable semantic document is invalid and cannot be rebound safely.'
    );
  }
  const semanticDocument = rebindDvtSubstraitSemanticSourceRefV1(
    parsed.data.semanticDocument,
    currentRef,
    nextRef
  );
  if (jcsCanonicalize(semanticDocument) === jcsCanonicalize(parsed.data.semanticDocument))
    return node;
  return {
    ...node,
    metadata: {
      ...node.metadata,
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]:
        DvtTransformAuthoringAuthorityV1Schema.parse({
          ...parsed.data,
          semanticDocument,
        }),
    },
  };
}

function readNonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
