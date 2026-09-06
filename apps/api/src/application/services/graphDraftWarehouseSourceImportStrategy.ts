import {
  ConnectedSourceRefSchema,
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringDraftSchema,
  type CanvasAuthoringAuthorityBinding,
  type ConnectedSourceRef,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';
import { jcsCanonicalize, randomUuidV7, sha256HexUtf8 } from '@dvt/crypto';

import {
  WarehouseSourceImportDraftConflictError,
  WarehouseSourceImportIdempotencyMismatchError,
} from '../ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
} from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import {
  resolveWorkspaceGraphDraftCanvasIds,
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
} from '../ports/workspaceGraphDraft.js';

import {
  applyWarehouseSourceImportFilePlan,
  buildWarehouseSourceImportFilePlan,
  rollbackWarehouseSourceImportFilePlan,
  type WarehouseSourceImportCommandContext,
  type WarehouseSourceImportStrategyResult,
} from './warehouseSourceImportPlan.js';
import {
  buildWarehouseSourceYamlPath,
  sourceObjectIdentity,
  toStableYamlIdentifierPart,
  type WarehouseSourceYamlBinding,
} from './warehouseSourceYaml.js';

export class WarehouseSourceImportCanvasNotFoundError extends Error {
  public constructor(readonly canvasId: string) {
    super(`Warehouse Source Import target Canvas was not found: ${canvasId}`);
    this.name = 'WarehouseSourceImportCanvasNotFoundError';
  }
}

export class GraphDraftWarehouseSourceImportStrategy {
  public constructor(
    private readonly deps: Readonly<{
      draftStore: IWorkspaceGraphDraftStore;
      workspaceFiles: IWorkspaceFileRepository;
      batchMutation: IWorkspaceFileBatchMutationPort;
      now: () => Date;
    }>
  ) {}

  public async execute(
    context: WarehouseSourceImportCommandContext,
    authorityBinding: CanvasAuthoringAuthorityBinding
  ): Promise<WarehouseSourceImportStrategyResult> {
    if (authorityBinding.authority.kind !== 'graph-draft') {
      throw new Error('Graph-draft Source Import requires graph-draft authority.');
    }

    const stored = await this.deps.draftStore.read(context.scope);
    if (!stored) throw new WarehouseSourceImportCanvasNotFoundError(context.canvasId);
    const draft = WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
    assertTargetCanvas(draft, context.canvasId);
    for (const node of readTargetCanvas(draft, context.canvasId).nodes) {
      if (node.pluginId !== 'dvt.warehouse-source') continue;
      const connectedSourceRef = ConnectedSourceRefSchema.safeParse(
        node.metadata?.connectedSourceRef
      );
      if (!connectedSourceRef.success || node.metadata?.sourceObjectId !== undefined) {
        throw new WarehouseSourceImportDraftConflictError();
      }
    }

    const filePlan = await buildWarehouseSourceImportFilePlan({
      context,
      workspaceFiles: this.deps.workspaceFiles,
      authorityProjectRoot: null,
    });
    const mutation = appendImportedSourceNodes(draft, context, filePlan.bindings);
    const appliedReceipt = await applyWarehouseSourceImportFilePlan({
      context,
      plan: filePlan,
      batchMutation: this.deps.batchMutation,
    });
    const requestHash = sha256HexUtf8(
      jcsCanonicalize({
        scope: context.scope,
        canvasId: context.canvasId,
        connectionId: context.connection.id,
        sourceObjectIds: context.sourceObjects.map((sourceObject) => sourceObject.objectId).sort(),
        groupingStrategy: context.groupingStrategy,
        includeColumns: context.includeColumns,
        addTests: context.addTests,
        addFreshness: context.addFreshness,
      })
    );

    try {
      const saveResult = await this.deps.draftStore.save({
        scope: context.scope,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: stored.revision,
        idempotencyKey: context.idempotencyKey,
        draft: mutation.draft,
        canvasIds: resolveWorkspaceGraphDraftCanvasIds(mutation.draft),
        requestHash,
        revision: `source-import-${requestHash}`,
        nowIso: this.deps.now().toISOString(),
      });
      if (saveResult.kind === 'idempotency_mismatch') {
        throw new WarehouseSourceImportIdempotencyMismatchError(context.idempotencyKey);
      }
      if (saveResult.kind !== 'saved') throw new WarehouseSourceImportDraftConflictError();

      const importedNodeIds = saveResult.deduplicated
        ? await readPersistedImportedNodeIds(this.deps.draftStore, context)
        : mutation.selectedNodeIds;

      return {
        sourcesCreated: filePlan.updates.length,
        yamlFiles: filePlan.updates.map((update) => update.path),
        outcome: {
          kind: 'graph-draft',
          draftRevision: saveResult.revision,
          importedNodeIds: [...importedNodeIds],
        },
      };
    } catch (error) {
      if (appliedReceipt.deduplicated) throw error;
      try {
        await rollbackWarehouseSourceImportFilePlan({
          context,
          plan: filePlan,
          appliedReceipt,
          batchMutation: this.deps.batchMutation,
        });
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Warehouse Source Import failed and YAML rollback was incomplete.',
          { cause: rollbackError }
        );
      }
      throw error;
    }
  }
}

async function readPersistedImportedNodeIds(
  draftStore: IWorkspaceGraphDraftStore,
  context: WarehouseSourceImportCommandContext
): Promise<readonly string[]> {
  const stored = await draftStore.read(context.scope);
  const parsed = stored ? WorkspaceGraphAuthoringDraftSchema.safeParse(stored.draftPayload) : null;
  if (!parsed?.success || !hasTargetCanvas(parsed.data, context.canvasId)) {
    throw new WarehouseSourceImportDraftConflictError();
  }

  const nodeIdsByConnectedSourceRef = new Map<string, string[]>();
  for (const node of readTargetCanvas(parsed.data, context.canvasId).nodes) {
    if (node.pluginId !== 'dvt.warehouse-source') continue;
    const connectedSourceRef = ConnectedSourceRefSchema.safeParse(
      node.metadata?.connectedSourceRef
    );
    if (!connectedSourceRef.success || node.metadata?.sourceObjectId !== undefined) {
      throw new WarehouseSourceImportDraftConflictError();
    }
    const bindingKey = jcsCanonicalize(connectedSourceRef.data);
    const nodeIds = nodeIdsByConnectedSourceRef.get(bindingKey) ?? [];
    nodeIds.push(node.id);
    nodeIdsByConnectedSourceRef.set(bindingKey, nodeIds);
  }

  return context.sourceObjects.map((sourceObject) => {
    const connectedSourceRef: ConnectedSourceRef = {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: sourceObject.connectionId,
        provider: context.connection.type,
      },
      sourceObjectId: sourceObject.objectId,
    };
    const nodeIds = nodeIdsByConnectedSourceRef.get(jcsCanonicalize(connectedSourceRef));
    const nodeId = nodeIds?.[0];
    if (nodeIds?.length !== 1 || !nodeId) {
      throw new WarehouseSourceImportDraftConflictError();
    }
    return nodeId;
  });
}

function appendImportedSourceNodes(
  draft: WorkspaceGraphAuthoringDraft,
  context: WarehouseSourceImportCommandContext,
  sourceYamlBindings: ReadonlyMap<string, WarehouseSourceYamlBinding>
): Readonly<{
  draft: WorkspaceGraphAuthoringDraft;
  selectedNodeIds: readonly string[];
}> {
  const target = readTargetCanvas(draft, context.canvasId);
  const existingIds = new Set(target.nodeIds);
  const existingNodeIdByConnectedSourceRef = new Map<string, string>();
  for (const node of target.nodes) {
    if (node.pluginId !== 'dvt.warehouse-source') continue;
    const connectedSourceRef = ConnectedSourceRefSchema.safeParse(
      node.metadata?.connectedSourceRef
    );
    if (!connectedSourceRef.success || node.metadata?.sourceObjectId !== undefined) {
      throw new WarehouseSourceImportDraftConflictError();
    }
    const bindingKey = jcsCanonicalize(connectedSourceRef.data);
    if (existingNodeIdByConnectedSourceRef.has(bindingKey)) {
      throw new WarehouseSourceImportDraftConflictError();
    }
    existingNodeIdByConnectedSourceRef.set(bindingKey, node.id);
  }

  const importedNodes: WorkspaceGraphAuthoringNode[] = [];
  const selectedNodeIds: string[] = [];
  const nextPositions = { ...target.nodePositions };
  const rightmostExistingPosition = Object.values(target.nodePositions).reduce(
    (rightmost, position) => Math.max(rightmost, position.x),
    -200
  );
  for (const sourceObject of context.sourceObjects) {
    const connectedSourceRef: ConnectedSourceRef = {
      schemaVersion: 'connected-source-ref.v1',
      connectionRef: {
        schemaVersion: 'connection-ref.v1',
        connectionId: sourceObject.connectionId,
        provider: context.connection.type,
      },
      sourceObjectId: sourceObject.objectId,
    };
    const existingNodeId = existingNodeIdByConnectedSourceRef.get(
      jcsCanonicalize(connectedSourceRef)
    );
    if (existingNodeId) {
      selectedNodeIds.push(existingNodeId);
      continue;
    }

    const nodeId = `dvt_src_${randomUuidV7()}`;
    if (existingIds.has(nodeId)) {
      throw new WarehouseSourceImportDraftConflictError();
    }

    existingIds.add(nodeId);
    selectedNodeIds.push(nodeId);
    const binding = sourceYamlBindings.get(sourceObjectIdentity(sourceObject));
    importedNodes.push(toSourceNode(nodeId, context, sourceObject, binding));
    nextPositions[nodeId] = {
      x: rightmostExistingPosition + importedNodes.length * 320,
      y: 120,
    };
  }

  const nextTarget = {
    ...target,
    nodeIds: [...target.nodeIds, ...importedNodes.map((node) => node.id)],
    nodePositions: nextPositions,
    nodes: [...target.nodes, ...importedNodes],
  };
  const targetIsActive = draft.activeCanvasId === context.canvasId;
  const nextDraft = {
    ...draft,
    ...(targetIsActive
      ? {
          canvas: nextTarget.canvas,
          nodeIds: nextTarget.nodeIds,
          nodePositions: nextTarget.nodePositions,
          nodes: nextTarget.nodes,
          edges: nextTarget.edges,
        }
      : {}),
    canvases: draft.canvases?.map((canvas) =>
      canvas.canvas.id === context.canvasId ? nextTarget : canvas
    ),
  };

  return {
    draft: WorkspaceGraphAuthoringDraftSchema.parse(nextDraft),
    selectedNodeIds,
  };
}

function toSourceNode(
  nodeId: string,
  context: WarehouseSourceImportCommandContext,
  sourceObject: WarehouseSourceImportCommandContext['sourceObjects'][number],
  sourceYamlBinding: WarehouseSourceYamlBinding | undefined
): WorkspaceGraphAuthoringNode {
  const schema = sourceObject.locator.schema.toLowerCase();
  const tableName = sourceYamlBinding?.tableName ?? sourceObject.locator.name.toLowerCase();
  const sourceName =
    sourceYamlBinding?.sourceName ??
    [sourceObject.connectionId, sourceObject.locator.catalog, sourceObject.locator.schema]
      .map(toStableYamlIdentifierPart)
      .join('_');

  return {
    id: nodeId,
    name: sourceObject.displayName,
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.input,
    status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
    tags: ['source', schema],
    path:
      sourceYamlBinding?.path ??
      buildWarehouseSourceYamlPath(sourceObject, context.groupingStrategy),
    description: `Imported source for ${sourceObject.locator.catalog}.${sourceObject.locator.schema}.${sourceObject.locator.name}`,
    metadata: {
      connectedSourceRef: ConnectedSourceRefSchema.parse({
        schemaVersion: 'connected-source-ref.v1',
        connectionRef: {
          schemaVersion: 'connection-ref.v1',
          connectionId: sourceObject.connectionId,
          provider: context.connection.type,
        },
        sourceObjectId: sourceObject.objectId,
      }),
      sourceName,
      tableName,
      tableIdentifier: sourceObject.locator.name,
      connectionName: context.connection.name,
      ...(context.databaseUser === undefined ? {} : { databaseUser: context.databaseUser }),
      database: sourceObject.locator.catalog,
      schema: sourceObject.locator.schema,
      relationType: sourceObject.locator.relationType,
      sourceMetricEvidence: sourceObject.metricEvidence,
      columns: context.includeColumns ? sourceObject.columns : undefined,
      constraints: context.includeColumns ? sourceObject.constraints : undefined,
    },
  };
}

function assertTargetCanvas(draft: WorkspaceGraphAuthoringDraft, canvasId: string): void {
  if (!hasTargetCanvas(draft, canvasId))
    throw new WarehouseSourceImportCanvasNotFoundError(canvasId);
}

function hasTargetCanvas(draft: WorkspaceGraphAuthoringDraft, canvasId: string): boolean {
  return (
    draft.canvas.id === canvasId ||
    draft.canvases?.some((workspace) => workspace.canvas.id === canvasId) === true
  );
}

function readTargetCanvas(draft: WorkspaceGraphAuthoringDraft, canvasId: string) {
  const target = draft.canvases?.find((workspace) => workspace.canvas.id === canvasId);
  if (target) return target;
  if (draft.canvas.id === canvasId) {
    return {
      canvas: draft.canvas,
      nodeIds: draft.nodeIds,
      nodePositions: draft.nodePositions,
      nodes: draft.nodes,
      edges: draft.edges,
    };
  }
  throw new WarehouseSourceImportCanvasNotFoundError(canvasId);
}
