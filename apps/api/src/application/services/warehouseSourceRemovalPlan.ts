/** Owned concern: reconcile removed graph-draft warehouse sources with their generated dbt YAML. */
import {
  ConnectedSourceRefSchema,
  type WorkspaceGraphAuthoringDraft,
  type WorkspaceGraphAuthoringNode,
} from '@dvt/contracts';

import type {
  IWorkspaceFileBatchMutationPort,
  IWorkspaceFileRepository,
  WorkspaceFileBatchWrite,
  WorkspaceFileBatchReceipt,
  WorkspaceFileContent,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';
import {
  WorkspaceFileNotFoundError,
  WorkspaceFileRevisionConflictError,
} from '../ports/workspaceFiles.js';

import { readExistingSourceDocument, serializeSourceDocument } from './warehouseSourceYaml.js';
import type { SourceYamlDocument, SourceYamlSource } from './warehouseSourceYamlTypes.js';

type WarehouseSourceYamlRemovalBinding = Readonly<{
  path: string;
  sourceName: string;
  tableName: string;
}>;

export type WarehouseSourceRemovalFilePlan = Readonly<{
  writes: readonly WorkspaceFileBatchWrite[];
  deletes: readonly string[];
  previousFiles: ReadonlyMap<string, WorkspaceFileContent>;
}>;

export async function buildWarehouseSourceRemovalFilePlan(input: {
  readonly scope: WorkspaceStorageScope;
  readonly previousDraft: WorkspaceGraphAuthoringDraft;
  readonly nextDraft: WorkspaceGraphAuthoringDraft;
  readonly workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
}): Promise<WarehouseSourceRemovalFilePlan> {
  const previousBindings = collectWarehouseSourceYamlBindings(input.previousDraft);
  const nextBindingKeys = new Set(
    collectWarehouseSourceYamlBindings(input.nextDraft).map(bindingIdentity)
  );
  const removedBindings = previousBindings.filter(
    (binding) => !nextBindingKeys.has(bindingIdentity(binding))
  );
  const removalsByPath = groupBindingsByPath(removedBindings);
  const writes: WorkspaceFileBatchWrite[] = [];
  const deletes: string[] = [];
  const previousFiles = new Map<string, WorkspaceFileContent>();

  for (const [path, removals] of [...removalsByPath.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const previousFile = await readOptionalWorkspaceFile(input.workspaceFiles, input.scope, path);
    if (!previousFile) continue;

    const previousDocument = readExistingSourceDocument(previousFile.content);
    const nextDocument = removeBoundTables(previousDocument, removals);
    if (nextDocument === previousDocument) continue;

    previousFiles.set(path, previousFile);
    if (isDisposableEmptyDocument(nextDocument)) {
      deletes.push(path);
    } else {
      writes.push({ path, content: serializeSourceDocument(nextDocument) });
    }
  }

  return { writes, deletes, previousFiles };
}

export async function applyWarehouseSourceRemovalFilePlan(input: {
  readonly scope: WorkspaceStorageScope;
  readonly idempotencyKey: string;
  readonly plan: WarehouseSourceRemovalFilePlan;
  readonly batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<WorkspaceFileBatchReceipt> {
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-removal:apply`,
    expectedFiles: plannedPaths(input.plan).map((path) => ({
      path,
      expectedContentSha256: requirePreviousFile(input.plan, path).contentSha256,
    })),
    writes: input.plan.writes,
    deletes: input.plan.deletes,
  });
  if (result.kind === 'conflict') {
    const first = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      first?.path ?? plannedPaths(input.plan)[0] ?? 'unknown',
      first?.currentContentSha256 ?? null
    );
  }
  return result;
}

export async function rollbackWarehouseSourceRemovalFilePlan(input: {
  readonly scope: WorkspaceStorageScope;
  readonly idempotencyKey: string;
  readonly plan: WarehouseSourceRemovalFilePlan;
  readonly appliedReceipt: WorkspaceFileBatchReceipt;
  readonly batchMutation: IWorkspaceFileBatchMutationPort;
}): Promise<void> {
  const appliedWriteShaByPath = new Map(
    input.appliedReceipt.writes.map((write) => [write.path, write.contentSha256])
  );
  const appliedDeletePaths = new Set(input.appliedReceipt.deletes);
  const expectedFiles = plannedPaths(input.plan).map((path) => {
    const appliedWriteSha = appliedWriteShaByPath.get(path);
    if (appliedWriteSha) return { path, expectedContentSha256: appliedWriteSha };
    if (appliedDeletePaths.has(path)) return { path };
    throw new Error(`Warehouse source removal receipt is missing the applied file: ${path}`);
  });
  const result = await input.batchMutation.apply(input.scope, {
    idempotencyKey: `${input.idempotencyKey}:source-removal:rollback`,
    expectedFiles,
    writes: plannedPaths(input.plan).map((path) => ({
      path,
      content: requirePreviousFile(input.plan, path).content,
    })),
    deletes: [],
  });
  if (result.kind === 'conflict') {
    const first = result.conflicts[0];
    throw new WorkspaceFileRevisionConflictError(
      first?.path ?? plannedPaths(input.plan)[0] ?? 'unknown',
      first?.currentContentSha256 ?? null
    );
  }
}

function collectWarehouseSourceYamlBindings(
  draft: WorkspaceGraphAuthoringDraft
): readonly WarehouseSourceYamlRemovalBinding[] {
  const bindings = new Map<string, WarehouseSourceYamlRemovalBinding>();
  for (const node of collectDraftNodes(draft)) {
    const binding = readWarehouseSourceYamlBinding(node);
    if (binding) bindings.set(bindingIdentity(binding), binding);
  }
  return [...bindings.values()];
}

function collectDraftNodes(
  draft: WorkspaceGraphAuthoringDraft
): readonly WorkspaceGraphAuthoringNode[] {
  return [...draft.nodes, ...(draft.canvases?.flatMap((canvas) => canvas.nodes) ?? [])];
}

function readWarehouseSourceYamlBinding(
  node: WorkspaceGraphAuthoringNode
): WarehouseSourceYamlRemovalBinding | null {
  if (node.pluginId !== 'dvt.warehouse-source' || node.kind !== 'dvt:source') return null;
  if (!ConnectedSourceRefSchema.safeParse(node.metadata?.connectedSourceRef).success) return null;

  const path = node.path;
  const sourceName = node.metadata?.sourceName;
  const tableName = node.metadata?.tableName;
  if (
    typeof path !== 'string' ||
    path.trim().length === 0 ||
    typeof sourceName !== 'string' ||
    sourceName.trim().length === 0 ||
    typeof tableName !== 'string' ||
    tableName.trim().length === 0
  ) {
    return null;
  }
  return { path, sourceName, tableName };
}

function bindingIdentity(binding: WarehouseSourceYamlRemovalBinding): string {
  return JSON.stringify([binding.path, binding.sourceName, binding.tableName]);
}

function groupBindingsByPath(
  bindings: readonly WarehouseSourceYamlRemovalBinding[]
): ReadonlyMap<string, readonly WarehouseSourceYamlRemovalBinding[]> {
  const grouped = new Map<string, WarehouseSourceYamlRemovalBinding[]>();
  for (const binding of bindings) {
    const pathBindings = grouped.get(binding.path) ?? [];
    pathBindings.push(binding);
    grouped.set(binding.path, pathBindings);
  }
  return grouped;
}

async function readOptionalWorkspaceFile(
  workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>,
  scope: WorkspaceStorageScope,
  path: string
): Promise<WorkspaceFileContent | null> {
  try {
    return await workspaceFiles.getFileContent(scope, path);
  } catch (error) {
    if (error instanceof WorkspaceFileNotFoundError) return null;
    throw error;
  }
}

function removeBoundTables(
  document: SourceYamlDocument,
  removals: readonly WarehouseSourceYamlRemovalBinding[]
): SourceYamlDocument {
  const tableNamesBySource = new Map<string, Set<string>>();
  for (const removal of removals) {
    const tableNames = tableNamesBySource.get(removal.sourceName) ?? new Set<string>();
    tableNames.add(removal.tableName);
    tableNamesBySource.set(removal.sourceName, tableNames);
  }

  let changed = false;
  const sources = document.sources.flatMap((source): readonly SourceYamlSource[] => {
    const removedTableNames = tableNamesBySource.get(source.name);
    if (!removedTableNames) return [source];

    const tables = source.tables.filter((table) => !removedTableNames.has(table.name));
    if (tables.length === source.tables.length) return [source];
    changed = true;
    return tables.length === 0 ? [] : [{ ...source, tables }];
  });

  return changed ? { ...document, sources } : document;
}

function isDisposableEmptyDocument(document: SourceYamlDocument): boolean {
  return (
    document.sources.length === 0 &&
    Object.keys(document.metadata).every((key) => key === 'version')
  );
}

function plannedPaths(plan: WarehouseSourceRemovalFilePlan): readonly string[] {
  return [...plan.writes.map((write) => write.path), ...plan.deletes].sort((left, right) =>
    left.localeCompare(right)
  );
}

function requirePreviousFile(
  plan: WarehouseSourceRemovalFilePlan,
  path: string
): WorkspaceFileContent {
  const previousFile = plan.previousFiles.get(path);
  if (!previousFile) {
    throw new Error(`Warehouse source removal plan is missing the previous file: ${path}`);
  }
  return previousFile;
}
