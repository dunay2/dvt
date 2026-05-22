/**
 * Owned concern: adapt local Git history into the protected workspace
 * file-history read model without exposing repository-management commands.
 */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import type {
  IWorkspaceFileHistoryRepository,
  WorkspaceFileHistoryEntry,
} from '../../application/ports/workspaceFileHistory.js';
import { InvalidWorkspacePathError } from '../../application/ports/workspaceFiles.js';

const execFileAsync = promisify(execFile);
const MAX_HISTORY_ENTRIES = 10;
const FIELD_SEPARATOR = '\u001f';

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

export type LocalWorkspaceFileHistoryRepositoryOptions = Readonly<{
  root: string;
  maxEntries?: number;
}>;

export class LocalWorkspaceFileHistoryRepository implements IWorkspaceFileHistoryRepository {
  private readonly root: string;
  private readonly maxEntries: number;

  public constructor(options: LocalWorkspaceFileHistoryRepositoryOptions) {
    this.root = path.resolve(options.root);
    this.maxEntries = options.maxEntries ?? MAX_HISTORY_ENTRIES;
  }

  public async listFileHistory(requestPath: string): Promise<readonly WorkspaceFileHistoryEntry[]> {
    const workspacePath = this.resolveWorkspacePath(requestPath);
    const { stdout } = await execFileAsync(
      'git',
      [
        '-C',
        this.root,
        'log',
        '--follow',
        `--max-count=${this.maxEntries}`,
        `--format=%H${FIELD_SEPARATOR}%h${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%s`,
        '--',
        workspacePath,
      ],
      { windowsHide: true }
    ).catch(() => ({ stdout: '' }));

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => projectGitLogLine(line, workspacePath));
  }

  private resolveWorkspacePath(requestPath: string): string {
    const workspacePath = decodeURIComponent(requestPath).replaceAll('\\', '/').trim();
    const segments = workspacePath.split('/');
    if (
      workspacePath.length === 0 ||
      workspacePath.startsWith('/') ||
      segments.some((segment) => segment.length === 0 || segment === '..') ||
      !ALLOWED_EXTENSIONS.has(path.extname(workspacePath).toLowerCase())
    ) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    const absolutePath = path.resolve(this.root, workspacePath);
    const relativePath = path.relative(this.root, absolutePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
      throw new InvalidWorkspacePathError(requestPath);
    }

    return workspacePath;
  }
}

function projectGitLogLine(line: string, workspacePath: string): WorkspaceFileHistoryEntry {
  const [commitSha, shortSha, authorName, authoredAt, ...subjectParts] =
    line.split(FIELD_SEPARATOR);
  return {
    commitSha: commitSha ?? '',
    shortSha: shortSha ?? '',
    authorName: authorName ?? '',
    authoredAt: authoredAt ?? '',
    subject: subjectParts.join(FIELD_SEPARATOR),
    path: workspacePath,
  };
}
