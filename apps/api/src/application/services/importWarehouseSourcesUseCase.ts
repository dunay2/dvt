/** Owned concern: execute ImportWarehouseSources against the authoritative draft aggregate. */
import { createHash, randomUUID } from 'node:crypto';

import {
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringDraftSchema,
  isRelationalSourceObject,
  ImportSourceObjectsRequestSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type {
  ImportWarehouseSourcesInput,
  ImportWarehouseSourcesResult,
  SourceImportGrouping,
  WarehouseConnection,
} from '../ports/warehouseSourceImport.js';
import {
  InvalidWarehouseSourceImportRequestError,
  SourceObjectNotFoundError,
  UnsupportedSourceObjectImportError,
  WarehouseSourceImportDraftConflictError,
} from '../ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceFileSaveReceipt,
  WorkspaceFileSaveResult,
} from '../ports/workspaceFiles.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../ports/workspaceGraphDraft.js';

import type { WarehouseConnectionSourceObjectReader } from './WarehouseConnectionSourceObjectReader.js';
import {
  InvalidWarehouseSourceYamlError,
  buildWarehouseSourceYamlBindings,
  buildWarehouseSourceYamlPath,
  buildWarehouseSourceYamlUpdates,
  groupSourceObjectsForYaml,
  toStableYamlIdentifierPart,
  type ConnectedRelationalSourceObject,
  type WarehouseSourceYamlBinding,
  type WarehouseSourceYamlUpdate,
} from './warehouseSourceYaml.js';

export class ImportWarehouseSourcesUseCase {
  public constructor(
    private readonly sourceObjectReader: WarehouseConnectionSourceObjectReader,
    private readonly draftStore: IWorkspaceGraphDraftStore,
    private readonly workspaceFiles: IWorkspaceFileRepository,
    private readonly clock: () => Date
  ) {}

  public async execute(input: ImportWarehouseSourcesInput): Promise<ImportWarehouseSourcesResult> {
    const parsedRequest = ImportSourceObjectsRequestSchema.safeParse({
      connectionId: input.connectionId,
      objects: input.objects,
      groupingStrategy: input.groupingStrategy,
      includeColumns: input.includeColumns,
      addTests: input.addTests,
      addFreshness: input.addFreshness,
    });
    if (!parsedRequest.success) {
      throw new InvalidWarehouseSourceImportRequestError(
        'Source import requests must use a known grouping, boolean options, and non-empty unique object-id-only selections.'
      );
    }

    const { connection, sourceObjects: catalogSourceObjects } = await this.sourceObjectReader.read(
      input.scope,
      input.connectionId
    );
    const authoritativeSourceObjects: ConnectedRelationalSourceObject[] = [];
    for (const selection of parsedRequest.data.objects) {
      const sourceObject = catalogSourceObjects.find(
        (catalogObject) => catalogObject.objectId === selection.objectId
      );
      if (!sourceObject) {
        throw new SourceObjectNotFoundError(selection.objectId);
      }
      if (!isRelationalSourceObject(sourceObject)) {
        throw new UnsupportedSourceObjectImportError(
          sourceObject.objectId,
          sourceObject.locator.kind
        );
      }
      authoritativeSourceObjects.push({
        ...sourceObject,
        connectionId: input.connectionId,
      });
    }

    const stored = await this.draftStore.read(input.scope);
    const draft =
      stored === null
        ? createInitialDraft(input.scope.environmentId)
        : WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
    const yamlFiles = Array.from(
      groupSourceObjectsForYaml(authoritativeSourceObjects, input.groupingStrategy).keys()
    );
    const existingSourceFiles = await this.readExistingSourceFiles(input.scope, yamlFiles);
    const existingSourceFileContents = new Map(
      [...existingSourceFiles].map(([filePath, file]) => [filePath, file.content])
    );
    let sourceYamlBindings: ReadonlyMap<string, WarehouseSourceYamlBinding>;
    let sourceYamlUpdates: readonly WarehouseSourceYamlUpdate[];
    try {
      sourceYamlBindings = buildWarehouseSourceYamlBindings({
        sourceObjects: authoritativeSourceObjects,
        groupingStrategy: input.groupingStrategy,
        existingFiles: existingSourceFileContents,
      });
      sourceYamlUpdates = buildWarehouseSourceYamlUpdates({
        sourceObjects: authoritativeSourceObjects,
        groupingStrategy: input.groupingStrategy,
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
        existingFiles: existingSourceFileContents,
      });
    } catch (error) {
      if (error instanceof InvalidWarehouseSourceYamlError) {
        throw new InvalidWarehouseSourceImportRequestError(
          error.message,
          'invalid_existing_source_yaml'
        );
      }
      throw error;
    }

    const writtenSourceYamlUpdates = await this.saveSourceYamlUpdates(
      input.scope,
      sourceYamlUpdates,
      existingSourceFiles
    );

    const mutation = appendImportedSourceNodes(
      draft,
      {
        ...input,
        sourceObjects: authoritativeSourceObjects,
      },
      connection,
      sourceYamlBindings
    );
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ scope: input.scope, importedNodeIds: mutation.importedNodeIds }))
      .digest('hex');

    let saveResult;
    try {
      saveResult = await this.draftStore.save({
        scope: input.scope,
        schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
        expectedRevision: stored?.revision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
        idempotencyKey: randomUUID(),
        draft: mutation.draft,
        requestHash,
        revision: randomUUID(),
        nowIso: this.clock().toISOString(),
      });
    } catch (error) {
      await this.rollbackSourceYamlUpdates(
        input.scope,
        writtenSourceYamlUpdates,
        existingSourceFiles
      );
      throw error;
    }
    if (saveResult.kind !== 'saved') {
      await this.rollbackSourceYamlUpdates(
        input.scope,
        writtenSourceYamlUpdates,
        existingSourceFiles
      );
      throw new WarehouseSourceImportDraftConflictError();
    }

    return {
      success: true,
      draftRevision: saveResult.revision,
      sourcesCreated: mutation.importedNodeIds.length,
      objectsImported: parsedRequest.data.objects.length,
      yamlFiles: sourceYamlUpdates.map((update) => update.path),
      importedNodeIds: [...mutation.importedNodeIds],
      grouping: input.groupingStrategy,
      options: {
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
      },
    };
  }

  private async readExistingSourceFiles(
    scope: ImportWarehouseSourcesInput['scope'],
    paths: readonly string[]
  ): Promise<ReadonlyMap<string, WorkspaceFileContent>> {
    const files = new Map<string, WorkspaceFileContent>();
    for (const filePath of paths) {
      try {
        files.set(filePath, await this.workspaceFiles.getFileContent(scope, filePath));
      } catch (error) {
        if (error instanceof WorkspaceFileNotFoundError) {
          continue;
        }
        throw error;
      }
    }
    return files;
  }

  private async saveSourceYamlUpdates(
    scope: ImportWarehouseSourcesInput['scope'],
    updates: readonly WarehouseSourceYamlUpdate[],
    existingFiles: ReadonlyMap<string, WorkspaceFileContent>
  ): Promise<readonly WrittenSourceYamlUpdate[]> {
    const writtenUpdates: WrittenSourceYamlUpdate[] = [];
    try {
      for (const update of updates) {
        const previous = existingFiles.get(update.path);
        const result = await this.workspaceFiles.saveFileContent(scope, {
          path: update.path,
          content: update.content,
          expectedRevision: previous
            ? { kind: 'content_sha256', value: previous.contentSha256 }
            : { kind: 'absent' },
        });
        writtenUpdates.push({ update, receipt: requireSavedWorkspaceFile(update.path, result) });
      }
    } catch (error) {
      await this.rollbackSourceYamlUpdates(scope, writtenUpdates, existingFiles);
      throw error;
    }
    return writtenUpdates;
  }

  private async rollbackSourceYamlUpdates(
    scope: ImportWarehouseSourcesInput['scope'],
    updates: readonly WrittenSourceYamlUpdate[],
    existingFiles: ReadonlyMap<string, WorkspaceFileContent>
  ): Promise<void> {
    for (const written of [...updates].reverse()) {
      const previous = existingFiles.get(written.update.path);
      if (previous) {
        const result = await this.workspaceFiles.saveFileContent(scope, {
          path: written.update.path,
          content: previous.content,
          expectedRevision: {
            kind: 'content_sha256',
            value: written.receipt.contentSha256,
          },
        });
        if (result.kind === 'conflict') {
          continue;
        }
      } else {
        await this.workspaceFiles.deleteFileContent(scope, {
          path: written.update.path,
          expectedRevision: {
            kind: 'content_sha256',
            value: written.receipt.contentSha256,
          },
        });
      }
    }
  }
}

type WrittenSourceYamlUpdate = Readonly<{
  update: WarehouseSourceYamlUpdate;
  receipt: WorkspaceFileSaveReceipt;
}>;

function requireSavedWorkspaceFile(
  path: string,
  result: WorkspaceFileSaveResult
): WorkspaceFileSaveReceipt {
  if (result.kind === 'conflict') {
    throw new WorkspaceFileRevisionConflictError(path, result.currentContentSha256);
  }
  return result;
}

function appendImportedSourceNodes(
  draft: WorkspaceGraphAuthoringDraft,
  input: Omit<ImportWarehouseSourcesInput, 'objects'> & {
    readonly sourceObjects: readonly ConnectedRelationalSourceObject[];
  },
  connection: WarehouseConnection,
  sourceYamlBindings: ReadonlyMap<string, WarehouseSourceYamlBinding>
): {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly importedNodeIds: readonly string[];
  readonly yamlFiles: readonly string[];
} {
  const existingIds = new Set(draft.nodeIds);
  const existingNodeIdBySourceObjectId = new Map<string, string>();
  for (const node of draft.nodes) {
    const sourceObjectId = readSourceObjectId(node);
    if (sourceObjectId) {
      existingNodeIdBySourceObjectId.set(sourceObjectId, node.id);
    }
  }
  const requestedSourceObjectIdsByStableNodeId = new Map<string, Set<string>>();
  for (const sourceObject of input.sourceObjects) {
    const stableNodeId = toStableSourceNodeId(sourceObject);
    const sourceObjectIds = requestedSourceObjectIdsByStableNodeId.get(stableNodeId) ?? new Set();
    sourceObjectIds.add(sourceObject.objectId);
    requestedSourceObjectIdsByStableNodeId.set(stableNodeId, sourceObjectIds);
  }
  const importedNodes: WorkspaceGraphAuthoringNode[] = [];
  const importedNodeIds: string[] = [];
  const yamlFiles = new Set<string>();
  const nextPositions = { ...draft.nodePositions };

  for (const sourceObject of input.sourceObjects) {
    yamlFiles.add(
      sourceYamlBindings.get(sourceObject.objectId)?.path ??
        buildWarehouseSourceYamlPath(sourceObject, input.groupingStrategy)
    );
    if (existingNodeIdBySourceObjectId.has(sourceObject.objectId)) {
      continue;
    }
    const stableNodeId = toStableSourceNodeId(sourceObject);
    const hasRequestedCollision =
      (requestedSourceObjectIdsByStableNodeId.get(stableNodeId)?.size ?? 0) > 1;
    const nodeId =
      hasRequestedCollision || existingIds.has(stableNodeId)
        ? toCollisionResistantSourceNodeId(sourceObject)
        : stableNodeId;
    if (existingIds.has(nodeId)) {
      continue;
    }

    existingIds.add(nodeId);
    importedNodeIds.push(nodeId);
    importedNodes.push(
      toSourceNode(
        nodeId,
        sourceObject,
        connection,
        input.groupingStrategy,
        input.includeColumns,
        sourceYamlBindings.get(sourceObject.objectId)
      )
    );
    nextPositions[nodeId] = { x: 80 + importedNodeIds.length * 40, y: 120 };
  }

  const nextDraft = {
    ...draft,
    nodeIds: [...draft.nodeIds, ...importedNodeIds],
    nodePositions: nextPositions,
    nodes: [...draft.nodes, ...importedNodes],
    canvases: draft.canvases?.map((canvas) =>
      canvas.canvas.id === draft.activeCanvasId
        ? {
            ...canvas,
            nodeIds: [...canvas.nodeIds, ...importedNodeIds],
            nodePositions: { ...canvas.nodePositions, ...nextPositions },
            nodes: [...canvas.nodes, ...importedNodes],
          }
        : canvas
    ),
  };

  return {
    draft: WorkspaceGraphAuthoringDraftSchema.parse(nextDraft),
    importedNodeIds,
    yamlFiles: Array.from(yamlFiles),
  };
}

function toSourceNode(
  nodeId: string,
  sourceObject: ConnectedRelationalSourceObject,
  connection: WarehouseConnection,
  groupingStrategy: SourceImportGrouping,
  includeColumns: boolean,
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
    path: sourceYamlBinding?.path ?? buildWarehouseSourceYamlPath(sourceObject, groupingStrategy),
    description: `Imported source for ${sourceObject.locator.catalog}.${sourceObject.locator.schema}.${sourceObject.locator.name}`,
    metadata: {
      sourceObjectId: sourceObject.objectId,
      sourceName,
      tableName,
      tableIdentifier: sourceObject.locator.name,
      connectionName: connection.name,
      connectionType: connection.type,
      database: sourceObject.locator.catalog,
      schema: sourceObject.locator.schema,
      relationType: sourceObject.locator.relationType,
      sourceMetricEvidence: sourceObject.metricEvidence,
      columns: includeColumns ? sourceObject.columns : undefined,
      constraints: includeColumns ? sourceObject.constraints : undefined,
    },
  };
}

function createInitialDraft(environmentId: string): WorkspaceGraphAuthoringDraft {
  return {
    canvas: { id: 'default', kind: 'canvas', title: 'Canvas', environmentId },
    activeCanvasId: 'default',
    nodeIds: [],
    nodePositions: {},
    nodes: [],
    edges: [],
    canvases: [
      {
        canvas: { id: 'default', kind: 'canvas', title: 'Canvas', environmentId },
        nodeIds: [],
        nodePositions: {},
        nodes: [],
        edges: [],
      },
    ],
  };
}

function toStableSourceNodeId(sourceObject: ConnectedRelationalSourceObject): string {
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

function toCollisionResistantSourceNodeId(sourceObject: ConnectedRelationalSourceObject): string {
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
