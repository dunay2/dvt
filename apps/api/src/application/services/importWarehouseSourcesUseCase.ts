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
  buildWarehouseSourceYamlPath,
  buildWarehouseSourceYamlUpdates,
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

    const catalogTables = await this.catalog.listTables(input.connectionId);
    const authoritativeTables: WarehouseTable[] = [];
    for (const selectedTable of input.tables) {
      const authoritativeTable = catalogTables.find((catalogTable) =>
        sameTable(catalogTable, selectedTable)
      );
      if (!authoritativeTable) {
        throw new WarehouseTableNotFoundError(selectedTable);
      }
      authoritativeTables.push(authoritativeTable);
    }

    const stored = await this.draftStore.read(input.scope);
    const draft =
      stored === null
        ? createInitialDraft(input.scope.environmentId)
        : WorkspaceGraphAuthoringDraftSchema.parse(stored.draftPayload);
    const mutation = appendImportedSourceNodes(draft, {
      ...input,
      tables: authoritativeTables,
    });
    const existingSourceFiles = await this.readExistingSourceFiles(mutation.yamlFiles);
    let sourceYamlUpdates: readonly WarehouseSourceYamlUpdate[];
    try {
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

    for (const update of sourceYamlUpdates) {
      await this.workspaceFiles.saveFileContent(update.path, update.content);
    }

    return {
      success: true,
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
  input: ImportWarehouseSourcesInput
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
    yamlFiles.add(buildWarehouseSourceYamlPath(table, input.groupingStrategy));
    if (existingIds.has(nodeId)) {
      continue;
    }

    existingIds.add(nodeId);
    importedNodeIds.push(nodeId);
    importedNodes.push(toSourceNode(table, input.groupingStrategy, input.includeColumns));
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
  groupingStrategy: SourceImportGrouping,
  includeColumns: boolean
): WorkspaceGraphAuthoringNode {
  const schema = table.schema.toLowerCase();
  const tableName = table.table.toLowerCase();

  return {
    id: toSourceNodeId(table),
    name: toSourceNodeId(table),
    pluginId: 'dvt.warehouse-source',
    kind: 'dvt:source',
    role: WORKSPACE_GRAPH_AUTHORING_NODE_ROLE.input,
    status: WORKSPACE_GRAPH_AUTHORING_NODE_STATUS.idle,
    tags: ['source', schema],
    path: buildWarehouseSourceYamlPath(table, groupingStrategy),
    description: `Imported source for ${table.database}.${table.schema}.${table.table}`,
    metadata: {
      sourceName: schema,
      tableName,
      database: table.database,
      schema: table.schema,
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
    table.database.toLowerCase(),
    table.schema.toLowerCase(),
    table.table.toLowerCase(),
  ].join('_');
}
