/** Owned concern: execute ImportWarehouseSources against the authoritative draft aggregate. */
import { createHash, randomUUID } from 'node:crypto';

import {
  WORKSPACE_GRAPH_AUTHORING_NODE_ROLE,
  WORKSPACE_GRAPH_AUTHORING_NODE_STATUS,
  WorkspaceGraphAuthoringDraftSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type {
  IWarehouseConnectionCatalog,
  ImportWarehouseSourcesInput,
  ImportWarehouseSourcesResult,
  SourceImportGrouping,
  WarehouseConnection,
  WarehouseTable,
} from '../ports/warehouseSourceImport.js';
import {
  InvalidWarehouseSourceImportRequestError,
  WarehouseSourceImportDraftConflictError,
  WarehouseTableNotFoundError,
} from '../ports/warehouseSourceImport.js';
import type { IWorkspaceFileRepository } from '../ports/workspaceFiles.js';
import { WorkspaceFileNotFoundError } from '../ports/workspaceFiles.js';
import type { IWorkspaceGraphDraftStore } from '../ports/workspaceGraphDraft.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
  WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
} from '../ports/workspaceGraphDraft.js';

import {
  InvalidWarehouseSourceYamlError,
  buildWarehouseSourceYamlBindings,
  buildWarehouseSourceYamlPath,
  buildWarehouseSourceYamlUpdates,
  groupTablesForYaml,
  toCollisionResistantYamlIdentifierPart,
  toStableYamlIdentifierPart,
  type WarehouseSourceYamlBinding,
  type WarehouseSourceYamlUpdate,
} from './warehouseSourceYaml.js';

export class ImportWarehouseSourcesUseCase {
  public constructor(
    private readonly catalog: IWarehouseConnectionCatalog,
    private readonly draftStore: IWorkspaceGraphDraftStore,
    private readonly workspaceFiles: IWorkspaceFileRepository,
    private readonly clock: () => Date
  ) {}

  public async execute(input: ImportWarehouseSourcesInput): Promise<ImportWarehouseSourcesResult> {
    if (input.tables.length === 0) {
      throw new InvalidWarehouseSourceImportRequestError(
        'At least one warehouse table is required.'
      );
    }

    const connection = await this.catalog.getConnection(input.connectionId);
    const catalogTables = await this.catalog.listTables(input.connectionId);
    const authoritativeTables: WarehouseTable[] = [];
    for (const selectedTable of input.tables) {
      const authoritativeTable = catalogTables.find((catalogTable) =>
        sameTable(catalogTable, selectedTable)
      );
      if (!authoritativeTable) {
        throw new WarehouseTableNotFoundError(selectedTable);
      }
      authoritativeTables.push({ ...authoritativeTable, connectionId: input.connectionId });
    }

    const stored = await this.draftStore.read(input.scope);
    const draft =
      stored === null
        ? createInitialDraft(input.scope.environmentId)
        : WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
    const yamlFiles = Array.from(
      groupTablesForYaml(authoritativeTables, input.groupingStrategy).keys()
    );
    const existingSourceFiles = await this.readExistingSourceFiles(yamlFiles);
    let sourceYamlBindings: ReadonlyMap<string, WarehouseSourceYamlBinding>;
    let sourceYamlUpdates: readonly WarehouseSourceYamlUpdate[];
    try {
      sourceYamlBindings = buildWarehouseSourceYamlBindings({
        tables: authoritativeTables,
        groupingStrategy: input.groupingStrategy,
        existingFiles: existingSourceFiles,
      });
      sourceYamlUpdates = buildWarehouseSourceYamlUpdates({
        tables: authoritativeTables,
        groupingStrategy: input.groupingStrategy,
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
        existingFiles: existingSourceFiles,
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

    for (const update of sourceYamlUpdates) {
      await this.workspaceFiles.saveFileContent(update.path, update.content);
    }

    const mutation = appendImportedSourceNodes(
      draft,
      {
        ...input,
        tables: authoritativeTables,
      },
      connection,
      sourceYamlBindings
    );
    const requestHash = createHash('sha256')
      .update(JSON.stringify({ scope: input.scope, importedNodeIds: mutation.importedNodeIds }))
      .digest('hex');

    const saveResult = await this.draftStore.save({
      scope: input.scope,
      schemaVersion: WORKSPACE_GRAPH_DRAFT_ACTIVE_SCHEMA_VERSION,
      expectedRevision: stored?.revision ?? WORKSPACE_GRAPH_DRAFT_INITIAL_REVISION,
      idempotencyKey: randomUUID(),
      draft: mutation.draft,
      requestHash,
      revision: randomUUID(),
      nowIso: this.clock().toISOString(),
    });
    if (saveResult.kind !== 'saved') {
      throw new WarehouseSourceImportDraftConflictError();
    }

    return {
      success: true,
      draftRevision: saveResult.revision,
      sourcesCreated: mutation.importedNodeIds.length,
      tablesImported: input.tables.length,
      yamlFiles: sourceYamlUpdates.map((update) => update.path),
      importedNodeIds: mutation.importedNodeIds,
      grouping: input.groupingStrategy,
      options: {
        includeColumns: input.includeColumns,
        addTests: input.addTests,
        addFreshness: input.addFreshness,
      },
    };
  }

  private async readExistingSourceFiles(
    paths: readonly string[]
  ): Promise<ReadonlyMap<string, string>> {
    const files = new Map<string, string>();
    for (const filePath of paths) {
      try {
        files.set(filePath, (await this.workspaceFiles.getFileContent(filePath)).content);
      } catch (error) {
        if (error instanceof WorkspaceFileNotFoundError) {
          continue;
        }
        throw error;
      }
    }
    return files;
  }
}

function appendImportedSourceNodes(
  draft: WorkspaceGraphAuthoringDraft,
  input: ImportWarehouseSourcesInput,
  connection: WarehouseConnection,
  sourceYamlBindings: ReadonlyMap<string, WarehouseSourceYamlBinding>
): {
  readonly draft: WorkspaceGraphAuthoringDraft;
  readonly importedNodeIds: readonly string[];
  readonly yamlFiles: readonly string[];
} {
  const existingIds = new Set(draft.nodeIds);
  const importedNodes: WorkspaceGraphAuthoringNode[] = [];
  const importedNodeIds: string[] = [];
  const yamlFiles = new Set<string>();
  const nextPositions = { ...draft.nodePositions };

  for (const table of input.tables) {
    const nodeId = toSourceNodeId(table);
    const candidateNodeIds = toSourceNodeIdCandidates(table);
    yamlFiles.add(
      sourceYamlBindings.get(toSourceTableKey(table))?.path ??
        buildWarehouseSourceYamlPath(table, input.groupingStrategy)
    );
    if (candidateNodeIds.some((candidateNodeId) => existingIds.has(candidateNodeId))) {
      existingIds.add(nodeId);
      continue;
    }

    existingIds.add(nodeId);
    importedNodeIds.push(nodeId);
    importedNodes.push(
      toSourceNode(
        table,
        connection,
        input.groupingStrategy,
        input.includeColumns,
        sourceYamlBindings.get(toSourceTableKey(table))
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
  table: WarehouseTable,
  connection: WarehouseConnection,
  groupingStrategy: SourceImportGrouping,
  includeColumns: boolean,
  sourceYamlBinding: WarehouseSourceYamlBinding | undefined
): WorkspaceGraphAuthoringNode {
  const schema = table.schema.toLowerCase();
  const tableName = sourceYamlBinding?.tableName ?? table.table.toLowerCase();

  return {
    id: toSourceNodeId(table),
    name: toSourceNodeId(table),
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.input,
    status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
    tags: ['source', schema],
    path: sourceYamlBinding?.path ?? buildWarehouseSourceYamlPath(table, groupingStrategy),
    description: `Imported source for ${table.database}.${table.schema}.${table.table}`,
    metadata: {
      sourceName: sourceYamlBinding?.sourceName ?? schema,
      tableName,
      connectionName: connection.name,
      connectionType: connection.type,
      database: table.database,
      schema: table.schema,
      ...(table.rowCount !== undefined ? { rowCount: table.rowCount } : {}),
      ...(table.byteSize !== undefined ? { byteSize: table.byteSize } : {}),
      columns: includeColumns ? table.columns : undefined,
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

function sameTable(left: WarehouseTable, right: WarehouseTable): boolean {
  return (
    left.database === right.database && left.schema === right.schema && left.table === right.table
  );
}

function toSourceNodeId(table: WarehouseTable): string {
  return [
    'src',
    table.connectionId ? toStableYamlIdentifierPart(table.connectionId) : undefined,
    toCollisionResistantYamlIdentifierPart(table.database),
    toCollisionResistantYamlIdentifierPart(table.schema),
    toCollisionResistantYamlIdentifierPart(table.table),
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('_');
}

function toSourceNodeIdCandidates(table: WarehouseTable): readonly string[] {
  return Array.from(
    new Set([
      toSourceNodeId(table),
      toRetiredStableSourceNodeId(table),
      toRetiredRawSourceNodeId(table),
    ])
  );
}

function toRetiredStableSourceNodeId(table: WarehouseTable): string {
  return [
    'src',
    table.connectionId ? toStableYamlIdentifierPart(table.connectionId) : undefined,
    toStableYamlIdentifierPart(table.database),
    toStableYamlIdentifierPart(table.schema),
    toStableYamlIdentifierPart(table.table),
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('_');
}

function toRetiredRawSourceNodeId(table: WarehouseTable): string {
  return [
    'src',
    table.connectionId ? toStableYamlIdentifierPart(table.connectionId) : undefined,
    table.database.toLowerCase(),
    table.schema.toLowerCase(),
    table.table.toLowerCase(),
  ]
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('_');
}

function toSourceTableKey(table: WarehouseTable): string {
  return JSON.stringify([
    table.connectionId?.toLowerCase() ?? '',
    table.database.toLowerCase(),
    table.schema.toLowerCase(),
    table.table.toLowerCase(),
  ]);
}
