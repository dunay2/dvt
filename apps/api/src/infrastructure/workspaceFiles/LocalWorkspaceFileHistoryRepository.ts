/** Owned concern: persist and project version history for one scoped workspace file. */
import { createHash } from 'node:crypto';
import path from 'node:path';

import type {
  CommitWorkspaceFileVersionInput,
  IWorkspaceFileHistoryRepository,
  IWorkspaceFileVersionCommandPort,
  WorkspaceFileHistoryEntry,
  WorkspaceFileVersionCommitResult,
} from '../../application/ports/workspaceFileHistory.js';
import {
  InvalidWorkspacePathError,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import { sharedLocalWorkspaceFileMutationCoordinator } from './LocalWorkspaceFileMutationCoordinator.js';
import { LocalWorkspaceFileRepository } from './LocalWorkspaceFileRepository.js';
import { LocalWorkspaceFileVersionGit } from './LocalWorkspaceFileVersionGit.js';
import {
  buildWorkspaceScopeStorageKey,
  resolveWorkspaceFileStoragePath,
  resolveWorkspaceScopeMutationLockKey,
} from './workspaceScopeStoragePath.js';

const FIELD_SEPARATOR = '\u001f';
const HISTORY_FORMAT = `%H${FIELD_SEPARATOR}%h${FIELD_SEPARATOR}%an${FIELD_SEPARATOR}%aI${FIELD_SEPARATOR}%s`;
const COMMIT_ID = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

export class LocalWorkspaceFileHistoryRepository
  implements IWorkspaceFileHistoryRepository, IWorkspaceFileVersionCommandPort
{
  private readonly files: LocalWorkspaceFileRepository;

  public constructor(private readonly options: Readonly<{ root: string; maxEntries?: number }>) {
    this.files = new LocalWorkspaceFileRepository({ root: options.root });
  }

  public async listFileHistory(
    scope: WorkspaceStorageScope,
    requestPath: string,
    before?: string
  ): Promise<readonly WorkspaceFileHistoryEntry[]> {
    const { git, ref, workspacePath } = this.address(scope, requestPath);
    const tip = (await git.exists()) ? await git.readRef(ref) : null;
    if (!tip) return [];
    await this.validateHistoryCursor({ git, tip, before, requestPath });
    const stdout = await git.run([
      'log',
      `--max-count=${this.options.maxEntries ?? 20}`,
      `--format=${HISTORY_FORMAT}`,
      ...(before === undefined ? [tip] : ['--skip=1', before]),
    ]);
    return stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [commitSha = '', shortSha = '', authorName = '', authoredAt = '', ...subject] =
          line.split(FIELD_SEPARATOR);
        return {
          commitSha,
          shortSha,
          authorName,
          authoredAt,
          subject: subject.join(FIELD_SEPARATOR),
          path: workspacePath,
        };
      });
  }

  public async getFileVersionContent(
    scope: WorkspaceStorageScope,
    requestPath: string,
    revision: string
  ): Promise<string | null> {
    const { git, ref } = this.address(scope, requestPath);
    if (!COMMIT_ID.test(revision)) throw new InvalidWorkspacePathError(requestPath);
    const tip = (await git.exists()) ? await git.readRef(ref) : null;
    if (!tip || !(await git.contains(tip, revision))) return null;
    return git.run(['cat-file', 'blob', `${revision}:content`]);
  }

  public commitFileVersion(
    scope: WorkspaceStorageScope,
    input: CommitWorkspaceFileVersionInput
  ): Promise<WorkspaceFileVersionCommitResult> {
    const { git, ref, workspacePath } = this.address(scope, input.path);
    if (
      !workspacePath.startsWith('operations/') ||
      path.extname(workspacePath).toLowerCase() !== '.sql'
    ) {
      throw new InvalidWorkspacePathError(input.path);
    }
    return sharedLocalWorkspaceFileMutationCoordinator.runExclusive(
      resolveWorkspaceScopeMutationLockKey(this.options.root, scope),
      () => this.commitLockedFileVersion(scope, input, { git, ref, workspacePath })
    );
  }

  private async commitLockedFileVersion(
    scope: WorkspaceStorageScope,
    input: CommitWorkspaceFileVersionInput,
    {
      git,
      ref,
      workspacePath,
    }: { git: LocalWorkspaceFileVersionGit; ref: string; workspacePath: string }
  ): Promise<WorkspaceFileVersionCommitResult> {
    const file = await this.files.getFileContent(scope, input.path);
    if (file.contentSha256 !== input.expectedContentSha256) return { kind: 'conflict' };

    await git.initialize();
    const tip = await git.readRef(ref);
    const blob = (await git.run(['hash-object', '-w', '--stdin'], file.content)).trim();
    if (tip && (await git.readRef(`${tip}:content`)) === blob) {
      return { kind: 'committed', commitSha: tip };
    }

    const tree = (await git.run(['mktree'], `100644 blob ${blob}\tcontent\n`)).trim();
    const subject = `Save ${path.posix.basename(workspacePath)}`;
    const commitSha = (
      await git.run(
        ['commit-tree', tree, ...(tip ? ['-p', tip] : []), '-m', subject],
        undefined,
        input.author
      )
    ).trim();
    try {
      await git.run(['update-ref', ref, commitSha, tip ?? '0'.repeat(commitSha.length)]);
    } catch (error) {
      if ((await git.readRef(ref)) !== tip) return { kind: 'conflict' };
      throw error;
    }
    return { kind: 'committed', commitSha };
  }

  private address(scope: WorkspaceStorageScope, requestPath: string) {
    const { workspacePath } = resolveWorkspaceFileStoragePath(
      this.options.root,
      scope,
      requestPath
    );
    const git = new LocalWorkspaceFileVersionGit(
      path.resolve(this.options.root, 'versions', `${buildWorkspaceScopeStorageKey(scope)}.git`)
    );
    const pathDigest = createHash('sha256').update(workspacePath, 'utf8').digest('hex');
    return { git, ref: `refs/heads/files/${pathDigest}`, workspacePath };
  }

  private async validateHistoryCursor({
    git,
    tip,
    before,
    requestPath,
  }: {
    git: LocalWorkspaceFileVersionGit;
    tip: string;
    before: string | undefined;
    requestPath: string;
  }): Promise<void> {
    if (before === undefined) return;
    if (!COMMIT_ID.test(before)) throw new InvalidWorkspacePathError(requestPath);
    if (!(await git.contains(tip, before))) throw new InvalidWorkspacePathError(requestPath);
  }
}
