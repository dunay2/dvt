import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  DbtProjectImportInventorySchema,
  type DbtProjectImportDiagnostic,
  type DbtProjectImportFile,
} from '@dvt/contracts';
import { load as loadYaml } from 'js-yaml';

import type {
  DbtProjectImportInspection,
  IDbtProjectImportInspectorPort,
  InspectDbtProjectImportInput,
} from '../../application/ports/dbtProjectImport.js';

import {
  evaluateDbtProjectPathPolicy,
  resolveDbtProjectDirectoryPartition,
} from './dbtProjectPathPolicy.js';
import {
  DbtProjectBoundaryError,
  resolveDbtProjectDirectory,
} from './dbtProjectWorkspaceBoundary.js';

const SECRET_FILE_NAMES = new Set(['profiles.yml', 'profiles.yaml', '.env']);
const DEPENDENCY_FILE_NAMES = new Set([
  'packages.yml',
  'packages.yaml',
  'dependencies.yml',
  'dependencies.yaml',
  'package-lock.yml',
]);

type Options = Readonly<{
  workspaceFilesRoot: string;
  maxProjectFiles?: number;
  maxInspectedFiles?: number;
  maxProjectBytes?: number;
  maxProjectDirectories?: number;
  maxProjectDepth?: number;
}>;

type ScanState = {
  readonly files: DbtProjectImportFile[];
  readonly diagnostics: DbtProjectImportDiagnostic[];
  sourceFiles: number;
  inspectedFiles: number;
  bytes: number;
  directories: number;
};

type DirectoryRole = 'project-source' | 'generated-artifact' | 'installed-dependency';

class ProjectLimitError extends Error {}

export class LocalDbtProjectImportInspector implements IDbtProjectImportInspectorPort {
  private readonly workspaceFilesRoot: string;
  private readonly maxProjectFiles: number;
  private readonly maxInspectedFiles: number;
  private readonly maxProjectBytes: number;
  private readonly maxProjectDirectories: number;
  private readonly maxProjectDepth: number;

  public constructor(options: Options) {
    this.workspaceFilesRoot = path.resolve(options.workspaceFilesRoot);
    this.maxProjectFiles = options.maxProjectFiles ?? 10_000;
    this.maxInspectedFiles = options.maxInspectedFiles ?? 100_000;
    this.maxProjectBytes = options.maxProjectBytes ?? 50_000_000;
    this.maxProjectDirectories = options.maxProjectDirectories ?? 5_000;
    this.maxProjectDepth = options.maxProjectDepth ?? 64;
  }

  public async inspect(input: InspectDbtProjectImportInput): Promise<DbtProjectImportInspection> {
    let projectDirectory: string;
    try {
      projectDirectory = await resolveDbtProjectDirectory({
        workspaceFilesRoot: this.workspaceFilesRoot,
        ...input,
      });
    } catch (error) {
      const diagnostic = boundaryDiagnostic(input.projectRoot, error);
      return {
        projectRoot: input.projectRoot,
        inventory: emptyInventory(),
        diagnostics: [diagnostic],
      };
    }

    const configContent = await readFile(path.join(projectDirectory, 'dbt_project.yml'), 'utf8');
    const directoryPartition = resolveDbtProjectDirectoryPartition(configContent);
    const generatedArtifactDirectories = new Set(directoryPartition.generatedArtifactDirectories);
    const installedDependencyDirectories = new Set(
      directoryPartition.installedDependencyDirectories
    );
    const state: ScanState = {
      files: [],
      diagnostics: [],
      sourceFiles: 0,
      inspectedFiles: 0,
      bytes: 0,
      directories: 1,
    };
    try {
      await this.scanDirectory(
        input.projectRoot,
        projectDirectory,
        '',
        'project-source',
        generatedArtifactDirectories,
        installedDependencyDirectories,
        0,
        state
      );
    } catch (error) {
      if (!(error instanceof ProjectLimitError)) throw error;
      state.diagnostics.push({
        code: 'dbt_project_limits_exceeded',
        severity: 'error',
        message: 'The dbt project exceeds the configured file-system inspection limits.',
      });
    }

    const configPath = workspacePath(input.projectRoot, 'dbt_project.yml');
    const configEntry = state.files.find((file) => file.path === configPath);
    let projectName: string | undefined;
    if (configEntry?.decision === 'included') {
      const pathPolicy = evaluateDbtProjectPathPolicy(configContent);
      if (!pathPolicy.ok) {
        state.diagnostics.push({
          code: 'dbt_project_path_unsafe',
          severity: 'error',
          message: 'dbt_project.yml contains a path that cannot be proven project-contained.',
          path: configPath,
        });
      }
      projectName = readProjectName(configContent);
      if (projectName === undefined) {
        state.diagnostics.push({
          code: 'dbt_project_invalid',
          severity: 'error',
          message: 'dbt_project.yml must define a non-empty project name.',
          path: configPath,
        });
      }
    }

    state.files.sort((left, right) => left.path.localeCompare(right.path));
    state.diagnostics.sort((left, right) =>
      `${left.path ?? ''}:${left.code}`.localeCompare(`${right.path ?? ''}:${right.code}`)
    );
    return {
      projectRoot: input.projectRoot,
      ...(projectName === undefined ? {} : { projectName }),
      inventory: DbtProjectImportInventorySchema.parse(buildInventory(state.files)),
      diagnostics: state.diagnostics,
    };
  }

  private async scanDirectory(
    projectRoot: string,
    absoluteDirectory: string,
    relativeDirectory: string,
    directoryRole: DirectoryRole,
    generatedArtifactDirectories: ReadonlySet<string>,
    installedDependencyDirectories: ReadonlySet<string>,
    depth: number,
    state: ScanState
  ): Promise<void> {
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(absoluteDirectory, entry.name);
      const entryState = await lstat(absolutePath);

      if (entryState.isSymbolicLink()) {
        this.consumeInspectedFileBudget(state);
        if (directoryRole === 'project-source') {
          this.consumeSourceFileBudget(state);
          this.consumeByteBudget(entryState.size, state);
        }
        this.addRejected(
          projectRoot,
          relativePath,
          'unsupported',
          entryState.size,
          'dbt_project_symlink_unsupported',
          'Symbolic links are not accepted in imported dbt projects.',
          state
        );
        continue;
      }
      if (entry.isDirectory()) {
        const nextDepth = depth + 1;
        state.directories += 1;
        if (state.directories > this.maxProjectDirectories || nextDepth > this.maxProjectDepth) {
          throw new ProjectLimitError();
        }
        const nextDirectoryRole = resolveDirectoryRole(
          directoryRole,
          relativePath,
          generatedArtifactDirectories,
          installedDependencyDirectories
        );
        await this.scanDirectory(
          projectRoot,
          absolutePath,
          relativePath,
          nextDirectoryRole,
          generatedArtifactDirectories,
          installedDependencyDirectories,
          nextDepth,
          state
        );
        continue;
      }
      if (!entry.isFile()) {
        this.consumeInspectedFileBudget(state);
        if (directoryRole === 'project-source') {
          this.consumeSourceFileBudget(state);
          this.consumeByteBudget(entryState.size, state);
        }
        this.addRejected(
          projectRoot,
          relativePath,
          'unsupported',
          entryState.size,
          'dbt_project_file_unsupported',
          'Unsupported file-system entries are not accepted in dbt projects.',
          state
        );
        continue;
      }

      this.consumeInspectedFileBudget(state);

      const objectPath = workspacePath(projectRoot, relativePath);
      if (directoryRole !== 'project-source') {
        state.files.push({
          path: objectPath,
          classification: 'runtime-artifact',
          byteSize: entryState.size,
          decision: 'excluded-runtime-artifact',
          reason: excludedDirectoryReason(directoryRole),
        });
        continue;
      }

      this.consumeSourceFileBudget(state);
      this.consumeByteBudget(entryState.size, state);

      const content = await readFile(absolutePath);
      const fileName = entry.name.toLowerCase();
      if (isSecretFile(fileName)) {
        this.addRejected(
          projectRoot,
          relativePath,
          'secret-material',
          entryState.size,
          'dbt_project_secret_material',
          'Secret material must remain outside the imported project.',
          state
        );
        continue;
      }
      if (content.includes(0)) {
        this.addRejected(
          projectRoot,
          relativePath,
          'binary',
          entryState.size,
          'dbt_project_binary_file',
          'Binary files are not accepted in imported dbt projects.',
          state
        );
        continue;
      }

      const classification = classifyFile(relativePath, fileName);
      if (classification === 'unsupported') {
        this.addRejected(
          projectRoot,
          relativePath,
          classification,
          entryState.size,
          'dbt_project_file_unsupported',
          'The project contains a file type that is not approved for dbt import.',
          state
        );
        continue;
      }
      state.files.push({
        path: objectPath,
        classification,
        byteSize: entryState.size,
        decision: 'included',
      });
    }
  }

  private addRejected(
    projectRoot: string,
    relativePath: string,
    classification: 'unsupported' | 'binary' | 'secret-material',
    byteSize: number,
    code: DbtProjectImportDiagnostic['code'],
    message: string,
    state: ScanState
  ): void {
    const objectPath = workspacePath(projectRoot, relativePath);
    state.files.push({
      path: objectPath,
      classification,
      byteSize,
      decision: 'rejected',
      reason: message,
    });
    state.diagnostics.push({ code, severity: 'error', message, path: objectPath });
  }

  private consumeSourceFileBudget(state: ScanState): void {
    state.sourceFiles += 1;
    if (state.sourceFiles > this.maxProjectFiles) throw new ProjectLimitError();
  }

  private consumeInspectedFileBudget(state: ScanState): void {
    state.inspectedFiles += 1;
    if (state.inspectedFiles > this.maxInspectedFiles) throw new ProjectLimitError();
  }

  private consumeByteBudget(byteSize: number, state: ScanState): void {
    state.bytes += byteSize;
    if (state.bytes > this.maxProjectBytes) throw new ProjectLimitError();
  }
}

function resolveDirectoryRole(
  parentRole: DirectoryRole,
  relativePath: string,
  generatedArtifactDirectories: ReadonlySet<string>,
  installedDependencyDirectories: ReadonlySet<string>
): DirectoryRole {
  if (parentRole !== 'project-source') return parentRole;
  if (generatedArtifactDirectories.has(relativePath)) return 'generated-artifact';
  if (installedDependencyDirectories.has(relativePath)) return 'installed-dependency';
  return 'project-source';
}

function excludedDirectoryReason(directoryRole: Exclude<DirectoryRole, 'project-source'>): string {
  return directoryRole === 'generated-artifact'
    ? 'Generated dbt artifacts are regenerated and are not imported as project source.'
    : 'Installed dbt dependencies are retained for analysis and are not imported as project source.';
}

function boundaryDiagnostic(projectRoot: string, error: unknown): DbtProjectImportDiagnostic {
  const reason = error instanceof DbtProjectBoundaryError ? error.reason : 'not_found';
  if (reason === 'symlink_unsupported') {
    return {
      code: 'dbt_project_symlink_unsupported',
      severity: 'error',
      message: 'The dbt project root cannot traverse symbolic links.',
    };
  }
  if (reason === 'path_unsafe') {
    return {
      code: 'dbt_project_root_invalid',
      severity: 'error',
      message: `The dbt project root is not workspace-contained: ${projectRoot}`,
    };
  }
  return {
    code: 'dbt_project_not_found',
    severity: 'error',
    message: 'A dbt_project.yml file was not found at the requested workspace root.',
  };
}

function classifyFile(relativePath: string, fileName: string) {
  if (fileName === 'dbt_project.yml' || fileName === '.gitignore') return 'project-config' as const;
  if (DEPENDENCY_FILE_NAMES.has(fileName)) return 'dependency-config' as const;
  const extension = path.posix.extname(relativePath).toLowerCase();
  if (extension === '.sql') return 'resource-sql' as const;
  if (extension === '.yml' || extension === '.yaml') return 'resource-yaml' as const;
  if (extension === '.csv') return 'seed-data' as const;
  if (extension === '.md') return 'documentation' as const;
  return 'unsupported' as const;
}

function isSecretFile(fileName: string): boolean {
  return SECRET_FILE_NAMES.has(fileName) || fileName.startsWith('.env.');
}

function readProjectName(content: string): string | undefined {
  try {
    const document = loadYaml(content, { json: true });
    if (!document || typeof document !== 'object' || Array.isArray(document)) return undefined;
    const name = (document as Record<string, unknown>)['name'];
    return typeof name === 'string' && name.trim().length > 0 ? name.trim() : undefined;
  } catch {
    return undefined;
  }
}

function workspacePath(projectRoot: string, relativePath: string): string {
  return projectRoot === '.' ? relativePath : `${projectRoot}/${relativePath}`;
}

function buildInventory(files: readonly DbtProjectImportFile[]) {
  const includedFileCount = files.filter((file) => file.decision === 'included').length;
  return {
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.byteSize, 0),
    includedFileCount,
    excludedFileCount: files.length - includedFileCount,
    files,
  };
}

function emptyInventory() {
  return { fileCount: 0, totalBytes: 0, includedFileCount: 0, excludedFileCount: 0, files: [] };
}
