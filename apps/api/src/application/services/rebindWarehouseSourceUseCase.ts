/**
 * Owned concern: rebind one persisted logical warehouse Source to a verified
 * physical relation without changing graph or Substrait logical identity.
 */
import {
  ConnectedSourceRefSchema,
  DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY,
  DvtTransformAuthoringAuthorityV1Schema,
  SourceObjectColumnSchema,
  WorkspaceGraphAuthoringDraftSchema,
  type ConnectedSourceRef,
  type WorkspaceGraphAuthoringCanvasWorkspace,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { jcsCanonicalize, sha256HexUtf8 } from '@dvt/crypto';

import {
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
} from '../ports/warehouseSourceImport.js';
import {
  WarehouseSourceRebindBindingConflictError,
  WarehouseSourceRebindIdempotencyMismatchError,
  WarehouseSourceRebindNodeNotFoundError,
  WarehouseSourceRebindSchemaDriftError,
  WarehouseSourceRebindUnverifiedError,
  type RebindWarehouseSourceInput,
  type RebindWarehouseSourceOutput,
} from '../ports/warehouseSourceRebind.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchReceipt,
  WorkspaceFileContent,
} from '../ports/workspaceFiles.js';
import {
  WorkspaceFileRevisionConflictError,
} from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import {
  resolveWorkspaceGraphDraftCanvasIds,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
} from '../ports/workspaceGraphDraft.js';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';
import {
  readExistingSourceDocument,
  serializeSourceDocument,
} from './warehouseSourceYaml.js';
import { buildGovernedSourceMetadata } from './warehouseSourceYamlMerge.js';

const SOURCE_PLUGIN_ID = 'dvt.warehouse-source';

type SourceYamlRebindPlan = Readonly<{
  path: string;
  previousFile: WorkspaceFileContent;
  content: string;
}>;

type LocatedSource = Readonly<{
  canvasId: string;
  canvas: WorkspaceGraphAuthoringCanvasWorkspace;
  node: WorkspaceGraphAuthoringNode;
}>;

export class RebindWarehouseSourceUseCase {
  public constructor(
    private readonly deps: Readonly<{
      draftStore: IWorkspaceGraphDraftStore;
      sourceObjectReader: WarehouseConnectionSourceObjectReader;
      workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
      batchMutation: IWorkspaceFileBatchMutationPort;
      now: () => Date;
    }>
  ) {}

  public async execute(input: RebindWarehouseSourceInput): Promise<RebindWarehouseSourceOutput> {
    const stored = await this.deps.draftStore.read(input.scope);
    if (stored == null) throw new WarehouseSourceRebindNodeNotFoundError(input.nodeId);

    let draft: WorkspaceGraphAuthoringDraft;
    try {
      draft = WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
    } catch {
      throw new WarehouseSourceRebindBindingConflictError('The persisted graph draft is invalid.');
    }
    const located = locateLogicalSource(draft, input.nodeId);
    const currentRef = readConnectedSourceRef(located.node);
    const persistedColumns = readPersistedColumns(located.node);

    const targetCatalog = await this.deps.sourceObjectReader.read(input.scope, input.connectionId);
    const targetObject = targetCatalog.sourceObjects.find(
      (candidate) => candidate.objectId === input.sourceObjectId
    );
    if (targetObject == null) throw new SourceObjectNotFoundError(input.sourceObjectId);
    if (targetObject.locator.kind !== 'relation') {
      throw new UnsupportedSourceObjectImportError(targetObject.objectId, targetObject.locator.kind);
    }
    if (targetCatalog.databaseUser == null || targetCatalog.databaseUser.trim().length === 0) {
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

    const yamlPlan = await buildSourceYamlRebindPlan({
      workspaceFiles: this.deps.workspaceFiles,
      scope: input.scope,
      node: located.node,
      targetRef: nextRef,
      targetObject,
      databaseUser: targetCatalog.databaseUser,
    });
    const nextDraft = rebindDraft({
      draft,
      located,
      currentRef,
      nextRef,
      targetObject,
      connectionName: targetCatalog.connection.name,
      databaseUser: targetCatalog.databaseUser,
    });
    const requestHash = sha256HexUtf8(
      jcsCanonicalize({
        scope: input.scope,
        nodeId: input.nodeId,
        connectionId: input.connectionId,
        sourceObjectId: input.sourceObjectId,
      })
    );

    const appliedFile = await applySourceYamlRebindPlan({
      scope: input.scope,
      idempotencyKey: input.idempotencyKey,
      plan: yamlPlan,
      batchMutation: this.deps.batchMutation,
    });
    try {
      const saveResult = await this.deps.draftStore.save({
        scope: input.scope,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: stored.revision,
        idempotencyKey: input.idempotencyKey,
        draft: nextDraft,
        canvasIds: resolveWorkspaceGraphDraftCanvasIds(nextDraft),
        requestHash,
        revision: `source-rebind-${requestHash}`,
        nowIso: this.deps.now().toISOString(),
      });
      if (saveResult.kind === 'idempotency_mismatch') {
        throw new WarehouseSourceRebindIdempotencyMismatchError(input.idempotencyKey);
      }
      if (saveResult.kind !== 'saved') {
        throw new WarehouseSourceRebindBindingConflictError();
      }
      return {
        schemaVersion: 'source-rebind-result.v1',
        nodeId: input.nodeId,
        draftRevision: saveResult.revision,
        connectedSourceRef: nextRef,
      };
    } catch (error) {
      if (!appliedFile.deduplicated) {
        await rollbackSourceYamlRebindPlan({
          scope: input.scope,
          idempotencyKey: input.idempotencyKey,
          plan: yamlPlan,
          appliedReceipt: appliedFile,
          batchMutation: this.deps.batchMutation,
        });
      }
      throw error;
    }
  }
}

function locateLogicalSource(draft: WorkspaceGraphAuthoringDraft, nodeId: string): LocatedSource {
  const canvasMatches = (draft.canvases ?? []).flatMap((canvas) => {
    const node = canvas.nodes.find((candidate) => candidate.id === nodeId);
    return node == null ? [] : [{ canvasId: canvas.canvas.id, canvas, node }];
  });
  if (canvasMatches.length > 1) {
    throw new WarehouseSourceRebindBindingConflictError(
      'A logical Source ID must belong to exactly one Canvas.'
    );
  }
  const match = canvasMatches[0];
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

function readPersistedColumns(node: WorkspaceGraphAuthoringNode) {
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
  current: readonly Readonly<{ name: string; type: string; nullable: boolean }>[],
  target: readonly Readonly<{ name: string; type: string; nullable: boolean }>[] | undefined
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
    throw new WarehouseSourceRebindUnverifiedError('Column identity is ambiguous in Source schema evidence.');
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
  targetObject: Extract<Awaited<ReturnType<WarehouseConnectionSourceObjectReader['read']>>['sourceObjects'][number], { locator: { kind: 'relation' } }>;
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
    throw new WarehouseSourceRebindBindingConflictError('The bound dbt source declaration is ambiguous.');
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
  const nextDocument = {
    ...document,
    sources: document.sources.map((candidate) => (candidate === source ? nextSource : candidate)),
  };
  return { path, previousFile, content: serializeSourceDocument(nextDocument) };
}

function rebindDraft(input: {
  draft: WorkspaceGraphAuthoringDraft;
  located: LocatedSource;
  currentRef: ConnectedSourceRef;
  nextRef: ConnectedSourceRef;
  targetObject: Extract<Awaited<ReturnType<WarehouseConnectionSourceObjectReader['read']>>['sourceObjects'][number], { locator: { kind: 'relation' } }>;
  connectionName: string;
  databaseUser: string;
}): WorkspaceGraphAuthoringDraft {
  const reachableNodeIds = collectReachableNodeIds(input.located.canvas, input.located.node.id);
  const nextNodes = input.located.canvas.nodes.map((node) => {
    let nextNode = node;
    if (node.id === input.located.node.id) {
      nextNode = {
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
    return reachableNodeIds.has(node.id)
      ? replaceSemanticSourceRef(nextNode, input.currentRef, input.nextRef)
      : nextNode;
  });
  const nextCanvas = { ...input.located.canvas, nodes: nextNodes };
  const targetIsTopLevel = input.draft.canvas.id === input.located.canvasId;
  const nextDraft = {
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
  };
  return WorkspaceGraphAuthoringDraftSchema.parse(nextDraft);
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

function replaceSemanticSourceRef(
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
  const currentKey = jcsCanonicalize(currentRef);
  const matchedRelations = parsed.data.semanticDocument.sidecar.relations.filter(
    (relation) => relation.sourceRef != null && jcsCanonicalize(relation.sourceRef) === currentKey
  );
  if (matchedRelations.length === 0) return node;
  const nextAuthority = DvtTransformAuthoringAuthorityV1Schema.parse({
    ...parsed.data,
    semanticDocument: {
      ...parsed.data.semanticDocument,
      sidecar: {
        ...parsed.data.semanticDocument.sidecar,
        relations: parsed.data.semanticDocument.sidecar.relations.map((relation) =>
          relation.sourceRef != null && jcsCanonicalize(relation.sourceRef) === currentKey
            ? { ...relation, sourceRef: nextRef }
            : relation
        ),
      },
    },
  });
  return {
    ...node,
    metadata: {
      ...node.metadata,
      [DVT_TRANSFORM_AUTHORING_AUTHORITY_METADATA_KEY]: nextAuthority,
    },
  };
}

async function applySourceYamlRebindPlan(input: {
  scope: RebindWarehouseSourceInput['scope'];
  idempotencyKey: string;
  plan: SourceYamlRebindPlan;
  batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<WorkspaceFileBatchReceipt> {
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-rebind:apply`,
    expectedFiles: [
      { path: input.plan.path, expectedContentSha256: input.plan.previousFile.contentSha256 },
    ],
    writes: [{ path: input.plan.path, content: input.plan.content }],
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const conflict = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      conflict?.path ?? input.plan.path,
      conflict?.currentContentSha256 ?? null
    );
  }
  return result;
}

async function rollbackSourceYamlRebindPlan(input: {
  scope: RebindWarehouseSourceInput['scope'];
  idempotencyKey: string;
  plan: SourceYamlRebindPlan;
  appliedReceipt: WorkspaceFileBatchReceipt;
  batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<void> {
  const applied = input.appliedReceipt.writes.find((write) => write.path === input.plan.path);
  if (applied == null) {
    throw new WarehouseSourceRebindBindingConflictError(
      'The Source rebind receipt is missing the applied dbt source artifact.'
    );
  }
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-rebind:rollback`,
    expectedFiles: [{ path: input.plan.path, expectedContentSha256: applied.contentSha256 }],
    writes: [{ path: input.plan.path, content: input.plan.previousFile.content }],
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const conflict = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      conflict?.path ?? input.plan.path,
      conflict?.currentContentSha256 ?? null
    );
  }
}

function readNonBlank(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
