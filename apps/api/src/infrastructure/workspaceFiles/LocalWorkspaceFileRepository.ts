/**
 * Owned concern: provide a bounded local filesystem adapter for workspace file
 * reads and command-side file writes.
 *
 * @baseline ADR-0060: dbt Project Authoring Authority
 * @decision Enforce scoped compare-and-swap before atomically replacing authoritative workspace files.
 * @consequence Local development preserves the same stale-write rejection required by file-backed Canvas authoring.
 * @version 1.0.0
 */
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type DeleteWorkspaceFileContentInput,
  type IWorkspaceFileRepository,
  type SaveWorkspaceFileContentInput,
  type WorkspaceFileContent,
  type WorkspaceFileDeleteResult,
  type WorkspaceFileEntry,
  type WorkspaceFileSaveResult,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import {
  type LocalWorkspaceFileMutationCoordinator,
  sharedLocalWorkspaceFileMutationCoordinator,
} from './LocalWorkspaceFileMutationCoordinator.js';
import {
  isAllowedWorkspaceFileName,
  resolveWorkspaceFileStoragePath,
  resolveWorkspaceScopeStorageRoot,
} from './workspaceScopeStoragePath.js';

const EXCLUDED_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
]);

const MAX_LISTED_FILES = 500;
const MAX_FILE_BYTES = 1_000_000;

export type LocalWorkspaceFileRepositoryOptions = Readonly<{
  root: string;
  maxListedFiles?: number;
  maxFileBytes?: number;
  mutationCoordinator?: LocalWorkspaceFileMutationCoordinator;
}>;

export class LocalWorkspaceFileRepository implements IWorkspaceFileRepository {
  private readonly root: string;
  private readonly maxListedFiles: number;
  private readonly maxFileBytes: number;
  private readonly mutationCoordinator: LocalWorkspaceFileMutationCoordinator;

  public constructor(options: LocalWorkspaceFileRepositoryOptions) {
    this.root = path.resolve(options.root);
    this.maxListedFiles = options.maxListedFiles ?? MAX_LISTED_FILES;
    this.maxFileBytes = options.maxFileBytes ?? MAX_FILE_BYTES;
    this.mutationCoordinator =
      options.mutationCoordinator ?? sharedLocalWorkspaceFileMutationCoordinator;
  }

  public async listFiles(scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]> {
    return this.listDirectory(this.resolveScopeRoot(scope), '', { value: 0 });
  }

  public async getFileContent(
    scope: WorkspaceStorageScope,
    requestPath: string
  ): Promise<WorkspaceFileContent> {
    const resolved = this.resolveWorkspacePath(scope, requestPath);
    const fileStat = await this.readFileStat(resolved.absolutePath, requestPath);
    if (!fileStat.isFile()) {
      throw new WorkspaceFileNotFoundError(requestPath);
    }
    if (fileStat.size > this.maxFileBytes) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    const content = await readFile(resolved.absolutePath, 'utf8');
    return {
      path: resolved.workspacePath,
      name: path.basename(resolved.workspacePath),
      language: inferLanguage(resolved.workspacePath),
      content,
      contentSha256: createHash('sha256').update(content, 'utf8').digest('hex'),
      lastModified: fileStat.mtime.toISOString(),
    };
  }

  public async saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult> {
    const resolved = this.resolveWorkspacePath(scope, input.path);
    if (Buffer.byteLength(input.content, 'utf8') > this.maxFileBytes) {
      throw new InvalidWorkspacePathError(input.path);
    }

    await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
    return this.mutationCoordinator.runExclusive(resolved.absolutePath, async () => {
      const current = await this.readOptionalFileContent(scope, resolved.workspacePath);
      const requestedContentSha256 = contentSha256(input.content);
      if (!matchesExpectedRevision(input.expectedRevision, current?.contentSha256 ?? null)) {
        return {
          kind: 'conflict',
          currentContentSha256: current?.contentSha256 ?? null,
        };
      }
      if (current?.contentSha256 === requestedContentSha256) {
        return {
          kind: 'unchanged',
          disposition: null,
          path: current.path,
          contentSha256: current.contentSha256,
          lastModified: current.lastModified,
        };
      }

      await this.mutationCoordinator.replaceFileAtomically(resolved.absolutePath, input.content);
      const saved = await this.getFileContent(scope, resolved.workspacePath);
      return {
        kind: 'saved',
        disposition: current ? 'updated' : 'created',
        path: saved.path,
        contentSha256: saved.contentSha256,
        lastModified: saved.lastModified,
      };
    });
  }

  public async deleteFileContent(
    scope: WorkspaceStorageScope,
    input: DeleteWorkspaceFileContentInput
  ): Promise<WorkspaceFileDeleteResult> {
    const resolved = this.resolveWorkspacePath(scope, input.path);
    return this.mutationCoordinator.runExclusive(resolved.absolutePath, async () => {
      const current = await this.readOptionalFileContent(scope, resolved.workspacePath);
      if (!current) {
        return { kind: 'unchanged' };
      }
      if (current.contentSha256 !== input.expectedRevision.value) {
        return { kind: 'conflict', currentContentSha256: current.contentSha256 };
      }

      await this.mutationCoordinator.deleteFile(resolved.absolutePath);
      return { kind: 'deleted' };
    });
  }

  private async listDirectory(
    absoluteDirectoryPath: string,
    workspaceDirectoryPath: string,
    counter: { value: number }
  ): Promise<readonly WorkspaceFileEntry[]> {
    if (counter.value >= this.maxListedFiles) {
      return [];
    }

    const entries = await readdir(absoluteDirectoryPath, { withFileTypes: true }).catch(() => []);
    const result: WorkspaceFileEntry[] = [];

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (counter.value >= this.maxListedFiles || EXCLUDED_NAMES.has(entry.name)) {
        continue;
      }

      const workspacePath = joinWorkspacePath(workspaceDirectoryPath, entry.name);
      const absolutePath = path.join(absoluteDirectoryPath, entry.name);

      if (entry.isDirectory()) {
        const children = await this.listDirectory(absolutePath, workspacePath, counter);
        if (children.length > 0) {
          result.push({
            path: workspacePath,
            name: entry.name,
            kind: 'directory',
            children,
          });
        }
        continue;
      }

      if (!entry.isFile() || !isAllowedWorkspaceFileName(entry.name)) {
        continue;
      }

      counter.value += 1;
      result.push({
        path: workspacePath,
        name: entry.name,
        kind: 'file',
      });
    }

    return result;
  }

  private resolveWorkspacePath(
    scope: WorkspaceStorageScope,
    requestPath: string
  ): {
    readonly absolutePath: string;
    readonly workspacePath: string;
  } {
    return resolveWorkspaceFileStoragePath(this.root, scope, requestPath);
  }

  private resolveScopeRoot(scope: WorkspaceStorageScope): string {
    return resolveWorkspaceScopeStorageRoot(this.root, scope);
  }

  private async readOptionalFileContent(
    scope: WorkspaceStorageScope,
    requestPath: string
  ): Promise<WorkspaceFileContent | null> {
    try {
      return await this.getFileContent(scope, requestPath);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) {
        return null;
      }
      throw error;
    }
  }

  private async readFileStat(absolutePath: string, requestPath: string) {
    try {
      return await stat(absolutePath);
    } catch {
      throw new WorkspaceFileNotFoundError(requestPath);
    }
  }
}

function contentSha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

function matchesExpectedRevision(
  expected: SaveWorkspaceFileContentInput['expectedRevision'],
  currentContentSha256: string | null
): boolean {
  return expected.kind === 'absent'
    ? currentContentSha256 === null
    : currentContentSha256 === expected.value;
}

function joinWorkspacePath(directoryPath: string, name: string): string {
  return directoryPath.length === 0 ? name : `${directoryPath}/${name}`;
}

function inferLanguage(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.csv') return 'csv';
  if (extension === '.sql') return 'sql';
  if (extension === '.md') return 'markdown';
  if (extension === '.json') return 'json';
  if (extension === '.yaml' || extension === '.yml') return 'yaml';
  if (extension === '.tsx' || extension === '.ts') return 'typescript';
  if (extension === '.js' || extension === '.mjs' || extension === '.cjs') return 'javascript';
  if (extension === '.css') return 'css';
  if (extension === '.html') return 'html';
  return 'text';
}
