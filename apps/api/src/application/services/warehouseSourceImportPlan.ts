import type { ImportSourceObjectsResultV2 } from '@dvt/contracts';

import type { SourceImportGrouping, WarehouseConnection } from '../ports/warehouseSourceImport.js';
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
  type ConnectedRelationalSourceObject,
  type WarehouseSourceYamlBinding,
} from './warehouseSourceYaml.js';

export type WarehouseSourceImportCommandContext = Readonly<{
  scope: WorkspaceStorageScope;
  canvasId: string;
  idempotencyKey: string;
  connection: WarehouseConnection;
  sourceObjects: readonly ConnectedRelationalSourceObject[];
  groupingStrategy: SourceImportGrouping;
  includeColumns: boolean;
  addTests: boolean;
  addFreshness: boolean;
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
