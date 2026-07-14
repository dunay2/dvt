import { createHash } from 'node:crypto';

import {
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringDraftSchema,
  type CanvasAuthoringAuthorityBinding,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

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
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
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
    const draft = stored
      ? WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload)
      : createInitialDraft(context.canvasId, context.scope.environmentId);
    assertTargetCanvas(draft, context.canvasId);

    const filePlan = await buildWarehouseSourceImportFilePlan({
      context,
      workspaceFiles: this.deps.workspaceFiles,
      authorityProjectRoot: null,
    });
    const appliedReceipt = await applyWarehouseSourceImportFilePlan({
      context,
      plan: filePlan,
      batchMutation: this.deps.batchMutation,
    });
    const mutation = appendImportedSourceNodes(draft, context, filePlan.bindings);
    const requestHash = sha256({
      scope: context.scope,
      canvasId: context.canvasId,
      connectionId: context.connection.id,
      sourceObjectIds: context.sourceObjects.map((sourceObject) => sourceObject.objectId).sort(),
      groupingStrategy: context.groupingStrategy,
      includeColumns: context.includeColumns,
      addTests: context.addTests,
      addFreshness: context.addFreshness,
    });

    try {
      const saveResult = await this.deps.draftStore.save({
        scope: context.scope,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: stored?.revision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
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

      return {
        sourcesCreated: filePlan.updates.length,
        yamlFiles: filePlan.updates.map((update) => update.path),
        outcome: {
          kind: 'graph-draft',
          draftRevision: saveResult.revision,
          importedNodeIds: [...mutation.selectedNodeIds],
        },
      };
    } catch (error) {
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
  const existingNodeIdBySourceObjectId = new Map<string, string>();
  for (const node of target.nodes) {
    const sourceObjectId = readSourceObjectId(node);
    if (sourceObjectId) existingNodeIdBySourceObjectId.set(sourceObjectId, node.id);
  }

  const stableIdOwners = new Map<string, Set<string>>();
  for (const sourceObject of context.sourceObjects) {
    const stableNodeId = toStableSourceNodeId(sourceObject);
    const owners = stableIdOwners.get(stableNodeId) ?? new Set<string>();
    owners.add(sourceObject.objectId);
    stableIdOwners.set(stableNodeId, owners);
  }

  const importedNodes: WorkspaceGraphAuthoringNode[] = [];
  const selectedNodeIds: string[] = [];
  const nextPositions = { ...target.nodePositions };
  for (const sourceObject of context.sourceObjects) {
    const existingNodeId = existingNodeIdBySourceObjectId.get(sourceObject.objectId);
    if (existingNodeId) {
      selectedNodeIds.push(existingNodeId);
      continue;
    }

    const stableNodeId = toStableSourceNodeId(sourceObject);
    const hasRequestedCollision = (stableIdOwners.get(stableNodeId)?.size ?? 0) > 1;
    const nodeId =
      hasRequestedCollision || existingIds.has(stableNodeId)
        ? toCollisionResistantSourceNodeId(sourceObject)
        : stableNodeId;
    if (existingIds.has(nodeId)) {
      selectedNodeIds.push(nodeId);
      continue;
    }

    existingIds.add(nodeId);
    selectedNodeIds.push(nodeId);
    const binding = sourceYamlBindings.get(sourceObject.objectId);
    importedNodes.push(toSourceNode(nodeId, context, sourceObject, binding));
    nextPositions[nodeId] = { x: 80 + selectedNodeIds.length * 40, y: 120 };
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
      sourceObjectId: sourceObject.objectId,
      sourceName,
      tableName,
      tableIdentifier: sourceObject.locator.name,
      connectionName: context.connection.name,
      connectionType: context.connection.type,
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

function createInitialDraft(canvasId: string, environmentId: string): WorkspaceGraphAuthoringDraft {
  const canvas = { id: canvasId, kind: 'canvas' as const, title: 'Canvas', environmentId };
  return {
    canvas,
    activeCanvasId: canvasId,
    nodeIds: [],
    nodePositions: {},
    nodes: [],
    edges: [],
    canvases: [{ canvas, nodeIds: [], nodePositions: {}, nodes: [], edges: [] }],
  };
}

function toStableSourceNodeId(
  sourceObject: WarehouseSourceImportCommandContext['sourceObjects'][number]
): string {
  return [
    'src',
    toStableYamlIdentifierPart(sourceObject.connectionId),
    toStableYamlIdentifierPart(sourceObject.locator.catalog),
    toStableYamlIdentifierPart(sourceObject.locator.schema),
    toStableYamlIdentifierPart(sourceObject.locator.name),
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('_');
}

function toCollisionResistantSourceNodeId(
  sourceObject: WarehouseSourceImportCommandContext['sourceObjects'][number]
): string {
  const suffix = createHash('sha256')
    .update(JSON.stringify([sourceObject.connectionId, sourceObject.objectId]))
    .digest('hex')
    .slice(0, 8);
  return `${toStableSourceNodeId(sourceObject)}_${suffix}`;
}

function readSourceObjectId(node: WorkspaceGraphAuthoringNode): string | null {
  const sourceObjectId = node.metadata?.sourceObjectId;
  return typeof sourceObjectId === 'string' && sourceObjectId.length > 0 ? sourceObjectId : null;
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');
}
