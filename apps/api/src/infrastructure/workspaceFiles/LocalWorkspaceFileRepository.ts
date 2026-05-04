/**
 * Owned concern: provide a bounded read-only local filesystem adapter for
 * workspace file queries.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type IWorkspaceFileRepository,
  type WorkspaceFileContent,
  type WorkspaceFileEntry,
} from '../../application/ports/workspaceFiles.js';

const EXCLUDED_NAMES = new Set([
  '.git',
  '.next',
  '.turbo',
  '.vite',
  'coverage',
  'dist',
  'node_modules',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const MAX_LISTED_FILES = 500;
const MAX_FILE_BYTES = 1_000_000;

export type LocalWorkspaceFileRepositoryOptions = Readonly<{
  root: string;
  maxListedFiles?: number;
  maxFileBytes?: number;
}>;

export class LocalWorkspaceFileRepository implements IWorkspaceFileRepository {
  private readonly root: string;
  private readonly maxListedFiles: number;
  private readonly maxFileBytes: number;

  public constructor(options: LocalWorkspaceFileRepositoryOptions) {
    this.root = path.resolve(options.root);
    this.maxListedFiles = options.maxListedFiles ?? MAX_LISTED_FILES;
    this.maxFileBytes = options.maxFileBytes ?? MAX_FILE_BYTES;
  }

  public async listFiles(): Promise<readonly WorkspaceFileEntry[]> {
    return this.listDirectory(this.root, '', { value: 0 });
  }

  public async getFileContent(requestPath: string): Promise<WorkspaceFileContent> {
    const resolved = this.resolveWorkspacePath(requestPath);
    const fileStat = await this.readFileStat(resolved.absolutePath, requestPath);
    if (!fileStat.isFile()) {
      throw new WorkspaceFileNotFoundError(requestPath);
    }
    if (fileStat.size > this.maxFileBytes) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    return {
      path: resolved.workspacePath,
      name: path.basename(resolved.workspacePath),
      language: inferLanguage(resolved.workspacePath),
      content: await readFile(resolved.absolutePath, 'utf8'),
      lastModified: fileStat.mtime.toISOString(),
    };
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

      if (!entry.isFile() || !isAllowedFileName(entry.name)) {
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

  private resolveWorkspacePath(requestPath: string): {
    readonly absolutePath: string;
    readonly workspacePath: string;
  } {
    const workspacePath = decodeURIComponent(requestPath).replaceAll('\\', '/').trim();
    const segments = workspacePath.split('/');
    if (
      workspacePath.length === 0 ||
      workspacePath.startsWith('/') ||
      segments.some((segment) => segment.length === 0 || segment === '..') ||
      !isAllowedFileName(path.basename(workspacePath))
    ) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    const absolutePath = path.resolve(this.root, workspacePath);
    const relativePath = path.relative(this.root, absolutePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    return { absolutePath, workspacePath };
  }

  private async readFileStat(absolutePath: string, requestPath: string) {
    try {
      return await stat(absolutePath);
    } catch {
      throw new WorkspaceFileNotFoundError(requestPath);
    }
  }
}

function joinWorkspacePath(directoryPath: string, name: string): string {
  return directoryPath.length === 0 ? name : `${directoryPath}/${name}`;
}

function isAllowedFileName(fileName: string): boolean {
  return ALLOWED_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

function inferLanguage(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
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
