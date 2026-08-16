import type { ExistingDbtSourceTarget, ImportSourceObjectsResultV2 } from '@dvt/contracts';

import {
  InvalidWarehouseSourceImportRequestError,
  type SourceImportGrouping,
  type WarehouseConnection,
} from '../ports/warehouseSourceImport.js';
import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchReceipt,
  WorkspaceFileContent,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../ports/workspaceFiles.js';

import {
  buildWarehouseSourceYamlBindings,
  buildWarehouseSourceYamlUpdates,
  groupSourceObjectsForYaml,
  readExistingSourceDocument,
  serializeSourceDocument,
  sourceObjectIdentity,
  upsertSourceTable,
  type ConnectedRelationalSourceObject,
  type WarehouseSourceYamlBinding,
} from './warehouseSourceYaml.js';

export type WarehouseSourceImportCommandContext = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  idempotencyKey: string;
  connection: WarehouseConnection;
  databaseUser?: string;
  sourceObjects: readonly ConnectedRelationalSourceObject[];
  catalogSourceObjects: readonly ConnectedRelationalSourceObject[];
  groupingStrategy: SourceImportGrouping;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
  existingDbtSourceTargets?: readonly ExistingDbtSourceTarget[];
}>;

export type WarehouseSourceImportFilePlan = Readonly<{
  authorityProjectRoot: string | null;
  bindings: ReadonlyMap<string, WarehouseSourceYamlBinding>;
  updates: readonly Readonly<{ path: string; content: string }>[];
  previousFiles: ReadonlyMap<string, WorkspaceFileContent>;
}>;

export type WarehouseSourceImportStrategyResult = Readonly<{
  sourcesCreated: number;
  yamlFiles: readonly string[];
  outcome: ImportSourceObjectsResultV2['outcome'];
}>;

export async function buildWarehouseSourceImportFilePlan(input: {
  readonly context: WarehouseSourceImportCommandContext;
  readonly workspaceFiles: IWorkspaceFileRepository;
  readonly authorityProjectRoot: string | null;
}): Promise<WarehouseSourceImportFilePlan> {
  if (input.context.existingDbtSourceTargets !== undefined) {
    return buildExistingDbtSourceFilePlan(input);
  }
  const relativePaths = Array.from(
    groupSourceObjectsForYaml(input.context.sourceObjects, input.context.groupingStrategy).keys()
  );
  const previousFiles = new Map<string, WorkspaceFileContent>();
  const previousContentByRelativePath = new Map<string, string>();

  for (const relativePath of relativePaths) {
    const authorityPath = toAuthorityPath(input.authorityProjectRoot, relativePath);
    try {
      const file = await input.workspaceFiles.getFileContent(input.context.scope, authorityPath);
      previousFiles.set(authorityPath, file);
      previousContentByRelativePath.set(relativePath, file.content);
    } catch (error) {
      if (!(error instanceof WorkspaceFileNotFoundError)) throw error;
    }
  }

  const bindings = buildWarehouseSourceYamlBindings({
    sourceObjects: input.context.sourceObjects,
    groupingStrategy: input.context.groupingStrategy,
    existingFiles: previousContentByRelativePath,
  });
  const relativeUpdates = buildWarehouseSourceYamlUpdates({
    sourceObjects: input.context.sourceObjects,
    ...(input.context.databaseUser === undefined
      ? {}
      : { databaseUser: input.context.databaseUser }),
    groupingStrategy: input.context.groupingStrategy,
    includeColumns: input.context.includeColumns,
    addTests: input.context.addTests,
    addFreshness: input.context.addFreshness,
    existingFiles: previousContentByRelativePath,
  });

  return {
    authorityProjectRoot: input.authorityProjectRoot,
    bindings,
    updates: relativeUpdates.map((update) => ({
      path: toAuthorityPath(input.authorityProjectRoot, update.path),
      content: update.content,
    })),
    previousFiles,
  };
}

async function buildExistingDbtSourceFilePlan(input: {
  readonly context: WarehouseSourceImportCommandContext;
  readonly workspaceFiles: IWorkspaceFileRepository;
  readonly authorityProjectRoot: string | null;
}): Promise<WarehouseSourceImportFilePlan> {
  if (input.context.databaseUser === undefined) {
    throw new InvalidWarehouseSourceImportRequestError(
      'The governed database user is required to bind imported dbt sources.'
    );
  }
  const previousFiles = new Map<string, WorkspaceFileContent>();
  const documentsByRelativePath = new Map<string, ReturnType<typeof readExistingSourceDocument>>();
  const targetsByObjectId = new Map(
    input.context.existingDbtSourceTargets?.map((target) => [target.objectId, target]) ?? []
  );
  const bindings = new Map<string, WarehouseSourceYamlBinding>();

  for (const sourceObject of input.context.sourceObjects) {
    const target = targetsByObjectId.get(sourceObject.objectId);
    if (target === undefined) {
      throw new InvalidWarehouseSourceImportRequestError(
        `Missing exact dbt source target for ${sourceObject.objectId}.`
      );
    }
    const authorityPath = toAuthorityPath(input.authorityProjectRoot, target.filePath);
    let previous = previousFiles.get(authorityPath);
    if (previous === undefined) {
      try {
        previous = await input.workspaceFiles.getFileContent(input.context.scope, authorityPath);
      } catch (error) {
        if (error instanceof WorkspaceFileNotFoundError) {
          throw new InvalidWarehouseSourceImportRequestError(
            `The imported dbt source file does not exist: ${target.filePath}.`
          );
        }
        throw error;
      }
      previousFiles.set(authorityPath, previous);
    }
    let document = documentsByRelativePath.get(target.filePath);
    if (document === undefined) {
      document = readExistingSourceDocument(previous.content);
      documentsByRelativePath.set(target.filePath, document);
    }
    assertTargetMatchesSourceObject(
      document,
      target,
      sourceObject,
      input.context.catalogSourceObjects
    );
    documentsByRelativePath.set(
      target.filePath,
      upsertSourceTable(document, sourceObject, {
        includeColumns: input.context.includeColumns,
        databaseUser: input.context.databaseUser,
        addTests: input.context.addTests,
        addFreshness: input.context.addFreshness,
        sourceName: target.sourceName,
        tableName: target.tableName,
      })
    );
    bindings.set(sourceObjectIdentity(sourceObject), {
      path: target.filePath,
      sourceName: target.sourceName,
      tableName: target.tableName,
    });
  }

  return {
    authorityProjectRoot: input.authorityProjectRoot,
    bindings,
    updates: [...documentsByRelativePath.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([relativePath, document]) => ({
        path: toAuthorityPath(input.authorityProjectRoot, relativePath),
        content: serializeSourceDocument(document),
      })),
    previousFiles,
  };
}

function assertTargetMatchesSourceObject(
  document: ReturnType<typeof readExistingSourceDocument>,
  target: ExistingDbtSourceTarget,
  sourceObject: ConnectedRelationalSourceObject,
  catalogSourceObjects: readonly ConnectedRelationalSourceObject[]
): void {
  const source = document.sources.find((candidate) => candidate.name === target.sourceName);
  const table = source?.tables.find((candidate) => candidate.name === target.tableName);
  const physicalTableName = table?.identifier ?? table?.name;
  const catalogMatches = catalogSourceObjects.filter(
    (candidate) =>
      physicalTableName === candidate.locator.name &&
      (source?.database === undefined || source.database === candidate.locator.catalog) &&
      (source?.schema === undefined || source.schema === candidate.locator.schema)
  );
  if (
    source === undefined ||
    table === undefined ||
    physicalTableName !== sourceObject.locator.name ||
    (source.database !== undefined && source.database !== sourceObject.locator.catalog) ||
    (source.schema !== undefined && source.schema !== sourceObject.locator.schema) ||
    catalogMatches.length !== 1 ||
    catalogMatches[0]?.objectId !== sourceObject.objectId
  ) {
    throw new InvalidWarehouseSourceImportRequestError(
      `The selected warehouse object does not match dbt source ${target.sourceUniqueId}.`
    );
  }
}

export async function applyWarehouseSourceImportFilePlan(input: {
  readonly context: WarehouseSourceImportCommandContext;
  readonly plan: WarehouseSourceImportFilePlan;
  readonly batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<WorkspaceFileBatchReceipt> {
  const result = await input.batchMutation.apply(input.context.scope, {
    idempotencyKey: `${input.context.idempotencyKey}:apply`,
    expectedFiles: input.plan.updates.map((update) => {
      const previous = input.plan.previousFiles.get(update.path);
      return {
        path: update.path,
        ...(previous ? { expectedContentSha256: previous.contentSha256 } : {}),
      };
    }),
    writes: input.plan.updates,
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const first = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      first?.path ?? input.plan.updates[0]?.path ?? 'unknown',
      first?.currentContentSha256 ?? null
    );
  }
  return result;
}

export async function rollbackWarehouseSourceImportFilePlan(input: {
  readonly context: WarehouseSourceImportCommandContext;
  readonly plan: WarehouseSourceImportFilePlan;
  readonly appliedReceipt: WorkspaceFileBatchReceipt;
  readonly batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<void> {
  const appliedShaByPath = new Map(
    input.appliedReceipt.writes.map((write) => [write.path, write.contentSha256])
  );
  const expectedFiles = input.plan.updates.map((update) => {
    const expectedContentSha256 = appliedShaByPath.get(update.path);
    if (!expectedContentSha256) {
      throw new Error(
        `Warehouse Source Import receipt is missing the applied file: ${update.path}`
      );
    }
    return { path: update.path, expectedContentSha256 };
  });
  const result = await input.batchMutation.apply(input.context.scope, {
    idempotencyKey: `${input.context.idempotencyKey}:rollback`,
    expectedFiles,
    writes: input.plan.updates.flatMap((update) => {
      const previous = input.plan.previousFiles.get(update.path);
      return previous ? [{ path: update.path, content: previous.content }] : [];
    }),
    deletes: input.plan.updates.flatMap((update) =>
      input.plan.previousFiles.has(update.path) ? [] : [update.path]
    ),
  });
  if (result.kind === 'conflict') {
    const first = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      first?.path ?? input.plan.updates[0]?.path ?? 'unknown',
      first?.currentContentSha256 ?? null
    );
  }
}

function toAuthorityPath(projectRoot: string | null, relativePath: string): string {
  return projectRoot === null || projectRoot === '.'
    ? relativePath
    : `${projectRoot}/${relativePath}`;
}
