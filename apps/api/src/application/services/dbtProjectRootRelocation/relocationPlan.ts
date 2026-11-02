/** Owned concern: inspect one root-relocation proposal without mutation or SQL regeneration. */
import {
  DBT_PROJECT_ROOT_RELOCATION_MAX_FILES,
  createDbtProjectRootRelocationPlan,
  type DbtProjectRootRelocationPreview,
} from '@dvt/contracts';

import type { IDbtProjectImportInspectorPort } from '../../ports/dbtProjectImport.js';
import {
  RootRelocationRefusedError,
  type IDbtProjectRootAuthorityPort,
  type IDbtProjectRootInventoryPort,
  type RootRelocationInspection,
  type RootRelocationRefusal,
} from '../../ports/dbtProjectRootRelocation.js';
import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
  type WorkspaceStorageScope,
} from '../../ports/workspaceFiles.js';
import {
  CanvasAuthoringAuthorityMixedError,
  CanvasAuthoringAuthorityMissingError,
  type CanvasAuthoringAuthorityPolicy,
} from '../canvasAuthoringAuthorityPolicy.js';

export type RootRelocationPlanningDependencies = Readonly<{
  authorities: IDbtProjectRootAuthorityPort;
  authorityPolicy: Pick<CanvasAuthoringAuthorityPolicy, 'resolve'>;
  workspaceFiles: Pick<IWorkspaceFileRepository, 'getFileContent'>;
  inventory: IDbtProjectRootInventoryPort;
  inspector: IDbtProjectImportInspectorPort;
  maxBytes: number;
}>;

export async function readOptionalRelocationFile(
  repository: Pick<IWorkspaceFileRepository, 'getFileContent'>,
  scope: WorkspaceStorageScope,
  file: string
): Promise<WorkspaceFileContent | null> {
  try {
    return await repository.getFileContent(scope, file);
  } catch (error) {
    if (error instanceof WorkspaceFileNotFoundError) return null;
    throw error;
  }
}

export function relocationRefusal(error: unknown): RootRelocationRefusal | undefined {
  if (error instanceof RootRelocationRefusedError)
    return {
      kind: 'refused',
      reason: error.reason,
      ...(error.paths.length ? { paths: [...error.paths] } : {}),
    };
  if (error instanceof CanvasAuthoringAuthorityMixedError)
    return { kind: 'refused', reason: 'mixed_authority' };
  if (error instanceof CanvasAuthoringAuthorityMissingError)
    return { kind: 'refused', reason: 'authority_unavailable' };
  if (error instanceof InvalidWorkspacePathError || error instanceof WorkspaceFileNotFoundError) {
    return { kind: 'refused', reason: 'unsafe_project' };
  }
  return undefined;
}

export async function inspectDbtProjectRootRelocation(
  deps: RootRelocationPlanningDependencies,
  input: Readonly<{ scope: WorkspaceStorageScope; canvasId: string }>
): Promise<RootRelocationInspection> {
  try {
    const binding = await deps.authorityPolicy.resolve({
      ...input.scope,
      canvasId: input.canvasId,
    });
    if (binding.authority.kind !== 'dbt-project-files')
      throw new RootRelocationRefusedError('authority_unavailable');
    const owners = await deps.authorities.readProjectFileAuthorities(input.scope);
    if (owners.length !== 1) throw new RootRelocationRefusedError('multiple_projects');
    const owner = owners[0]!;
    if (
      owner.key.canvasId !== input.canvasId ||
      owner.binding.authority.kind !== 'dbt-project-files' ||
      owner.binding.authority.projectRoot !== binding.authority.projectRoot
    ) {
      throw new RootRelocationRefusedError('stale_authority');
    }
    const sourceRoot = binding.authority.projectRoot;
    if (sourceRoot === '.')
      return {
        files: [],
        preview: {
          kind: 'already_normalized',
          canvasId: input.canvasId,
          authorityRevision: owner.revision,
          projectRoot: '.',
        },
      };
    const inspection = await deps.inspector.inspect({
      scope: input.scope,
      projectRoot: sourceRoot,
    });
    if (inspection.diagnostics.some((item) => item.code === 'dbt_project_secret_material'))
      throw new RootRelocationRefusedError('private_file');
    if (inspection.diagnostics.some((item) => item.severity === 'error'))
      throw new RootRelocationRefusedError('unsafe_project');
    const paths = [...(await deps.inventory.listFiles(input.scope, sourceRoot))].sort();
    if (paths.length === 0 || paths.length > DBT_PROJECT_ROOT_RELOCATION_MAX_FILES)
      throw new RootRelocationRefusedError('limit_exceeded');
    if (!paths.includes(`${sourceRoot}/dbt_project.yml`))
      throw new RootRelocationRefusedError('unsafe_project');
    const files = [];
    const snapshotFiles = [];
    let bytes = 0;
    for (const sourcePath of paths) {
      const targetPath = sourcePath.slice(sourceRoot.length + 1);
      if (paths.includes(targetPath))
        throw new RootRelocationRefusedError('unsafe_project', [targetPath]);
      const source = await deps.workspaceFiles.getFileContent(input.scope, sourcePath);
      bytes += Buffer.byteLength(source.content, 'utf8');
      if (bytes > deps.maxBytes) throw new RootRelocationRefusedError('limit_exceeded');
      const target = await readOptionalRelocationFile(deps.workspaceFiles, input.scope, targetPath);
      if (target !== null && target.contentSha256 !== source.contentSha256)
        throw new RootRelocationRefusedError('destination_conflict', [targetPath]);
      files.push({
        sourcePath,
        targetPath,
        contentSha256: source.contentSha256,
        targetContentSha256: target?.contentSha256 ?? null,
      });
      snapshotFiles.push({ path: sourcePath, content: source.content });
    }
    const plan = createDbtProjectRootRelocationPlan({
      schemaVersion: 'dbt-project-root-relocation-plan.v1',
      scope: input.scope,
      canvasId: input.canvasId,
      sourceRoot,
      targetRoot: '.',
      authorityRevision: owner.revision,
      files,
    });
    return { files: snapshotFiles, preview: { kind: 'ready', plan } };
  } catch (error) {
    const preview: DbtProjectRootRelocationPreview | undefined = relocationRefusal(error);
    if (preview === undefined) throw error;
    return { preview, files: [] };
  }
}
