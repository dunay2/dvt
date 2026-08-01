/** Owned concern: publish one validated DBT dependency patch and its semantic receipt atomically. */
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  DbtDependencyEditAppliedReceiptSchema,
  type DbtDependencyEditAppliedReceipt,
} from '@dvt/contracts';

import {
  DbtDependencyEditReceiptInvalidError,
  type DbtDependencyEditPublication,
  type DbtDependencyEditPublicationResult,
  type IDbtDependencyEditPublicationPort,
} from '../../application/ports/dbtDependencyEdit.js';
import type { WorkspaceStorageScope } from '../../application/ports/workspaceFiles.js';
import {
  DEFAULT_DBT_PROJECT_SOURCE_LIMITS,
  hashDbtProjectSource,
} from '../dbt/dbtProjectSourceSnapshot.js';
import { resolveDbtProjectDirectory } from '../dbt/dbtProjectWorkspaceBoundary.js';
import {
  type LocalWorkspaceFileMutationCoordinator,
  sharedLocalWorkspaceFileMutationCoordinator,
} from '../workspaceFiles/LocalWorkspaceFileMutationCoordinator.js';
import {
  buildWorkspaceScopeStorageKey,
  resolveWorkspaceFileStoragePath,
  resolveWorkspaceScopeMutationLockKey,
  resolveWorkspaceScopeStorageRoot,
} from '../workspaceFiles/workspaceScopeStoragePath.js';

const RECEIPT_ROOT = 'dbt-dependency-edit-receipts/applied';

export type LocalDbtDependencyEditPublicationGatewayOptions = Readonly<{
  root: string;
  maxProjectFiles?: number;
  maxProjectBytes?: number;
  maxProjectDirectories?: number;
  maxProjectDepth?: number;
  mutationCoordinator?: LocalWorkspaceFileMutationCoordinator;
}>;

export class LocalDbtDependencyEditPublicationGateway implements IDbtDependencyEditPublicationPort {
  private readonly root: string;
  private readonly mutationCoordinator: LocalWorkspaceFileMutationCoordinator;
  private readonly limits: typeof DEFAULT_DBT_PROJECT_SOURCE_LIMITS;

  public constructor(options: LocalDbtDependencyEditPublicationGatewayOptions) {
    this.root = path.resolve(options.root);
    this.mutationCoordinator =
      options.mutationCoordinator ?? sharedLocalWorkspaceFileMutationCoordinator;
    this.limits = {
      maxFiles: options.maxProjectFiles ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxFiles,
      maxBytes: options.maxProjectBytes ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxBytes,
      maxDirectories:
        options.maxProjectDirectories ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDirectories,
      maxDepth: options.maxProjectDepth ?? DEFAULT_DBT_PROJECT_SOURCE_LIMITS.maxDepth,
    };
  }

  public async findApplied(
    scope: WorkspaceStorageScope,
    receiptId: string
  ): Promise<DbtDependencyEditAppliedReceipt | null> {
    const receiptPath = this.resolveReceiptPath(scope, receiptId);
    return this.mutationCoordinator.runExclusiveMany(
      [resolveWorkspaceScopeMutationLockKey(this.root, scope), receiptPath],
      async () => {
        const receipt = await this.readReceipt(receiptPath, receiptId);
        if (receipt === null) return null;
        const target = resolveWorkspaceFileStoragePath(this.root, scope, receipt.path);
        if ((await this.readOptionalSha256(target.absolutePath)) !== receipt.appliedContentSha256) {
          throw new DbtDependencyEditReceiptInvalidError(receiptId);
        }
        return receipt;
      }
    );
  }

  public async publish(
    scope: WorkspaceStorageScope,
    publication: DbtDependencyEditPublication
  ): Promise<DbtDependencyEditPublicationResult> {
    const receipt = DbtDependencyEditAppliedReceiptSchema.parse(publication.receipt);
    this.assertPublicationMatchesReceipt(publication, receipt);
    const target = resolveWorkspaceFileStoragePath(this.root, scope, publication.write.path);
    const receiptPath = this.resolveReceiptPath(scope, receipt.receiptId);
    const scopeLock = resolveWorkspaceScopeMutationLockKey(this.root, scope);

    return this.mutationCoordinator.runExclusiveMany(
      [scopeLock, target.absolutePath, receiptPath],
      async () => {
        const existing = await this.readReceipt(receiptPath, receipt.receiptId);
        if (existing !== null) {
          this.assertSameReceipt(receipt, existing);
          const currentContentSha256 = await this.readOptionalSha256(target.absolutePath);
          if (currentContentSha256 !== existing.appliedContentSha256) {
            throw new DbtDependencyEditReceiptInvalidError(receipt.receiptId);
          }
          return { kind: 'applied', receipt: { ...existing, deduplicated: true } };
        }

        const projectDirectory = await resolveDbtProjectDirectory({
          workspaceFilesRoot: this.root,
          scope,
          projectRoot: publication.projectRoot,
        });
        const currentRevision = await hashDbtProjectSource({
          projectDirectory,
          limits: this.limits,
        });
        const conflicts = this.findProjectConflicts(publication, currentRevision.entries);
        if (
          currentRevision.sha256 !== publication.expectedProjectContentSetSha256 ||
          conflicts.length > 0
        ) {
          return {
            kind: 'conflict',
            conflicts:
              conflicts.length > 0
                ? conflicts
                : [{ path: publication.projectRoot, currentContentSha256: null }],
          };
        }

        await Promise.all([
          mkdir(path.dirname(target.absolutePath), { recursive: true }),
          mkdir(path.dirname(receiptPath), { recursive: true }),
        ]);
        await this.mutationCoordinator.replaceFilesAtomically({
          transactionDirectory: path.join(
            this.root,
            '.dvt-state',
            'dbt-dependency-edit-transactions',
            buildWorkspaceScopeStorageKey(scope),
            randomUUID()
          ),
          entries: [
            {
              absolutePath: target.absolutePath,
              originalExists: true,
              content: publication.write.content,
            },
            {
              absolutePath: receiptPath,
              originalExists: false,
              content: `${JSON.stringify(receipt, null, 2)}\n`,
            },
          ],
        });

        return { kind: 'applied', receipt };
      }
    );
  }

  private resolveReceiptPath(scope: WorkspaceStorageScope, receiptId: string): string {
    if (!/^[a-f0-9]{64}$/u.test(receiptId)) {
      throw new DbtDependencyEditReceiptInvalidError(receiptId);
    }
    return path.join(
      resolveWorkspaceScopeStorageRoot(path.join(this.root, '.dvt'), scope),
      RECEIPT_ROOT,
      `${receiptId}.json`
    );
  }

  private async readReceipt(
    receiptPath: string,
    receiptId: string
  ): Promise<DbtDependencyEditAppliedReceipt | null> {
    try {
      return DbtDependencyEditAppliedReceiptSchema.parse(
        JSON.parse(await readFile(receiptPath, 'utf8')) as unknown
      );
    } catch (error) {
      if (this.isFileNotFound(error)) return null;
      if (error instanceof DbtDependencyEditReceiptInvalidError) throw error;
      throw new DbtDependencyEditReceiptInvalidError(receiptId);
    }
  }

  private assertPublicationMatchesReceipt(
    publication: DbtDependencyEditPublication,
    receipt: DbtDependencyEditAppliedReceipt
  ): void {
    const appliedContentSha256 = createHash('sha256')
      .update(publication.write.content, 'utf8')
      .digest('hex');
    if (
      receipt.path !== publication.write.path ||
      receipt.expectedContentSha256 !== publication.write.expectedContentSha256 ||
      receipt.appliedContentSha256 !== appliedContentSha256 ||
      receipt.previousProjectContentSetSha256 !== publication.expectedProjectContentSetSha256 ||
      receipt.deduplicated
    ) {
      throw new DbtDependencyEditReceiptInvalidError(receipt.receiptId);
    }
  }

  private assertSameReceipt(
    expected: DbtDependencyEditAppliedReceipt,
    actual: DbtDependencyEditAppliedReceipt
  ): void {
    if (JSON.stringify({ ...actual, deduplicated: false }) !== JSON.stringify(expected)) {
      throw new DbtDependencyEditReceiptInvalidError(expected.receiptId);
    }
  }

  private findProjectConflicts(
    publication: DbtDependencyEditPublication,
    actualFiles: readonly Readonly<{ path: string; sha256: string; bytes: number }>[]
  ): readonly Readonly<{ path: string; currentContentSha256: string | null }>[] {
    const expectedByPath = new Map(publication.expectedFiles.map((file) => [file.path, file]));
    const actualByPath = new Map(actualFiles.map((file) => [file.path, file]));
    const paths = new Set([...expectedByPath.keys(), ...actualByPath.keys()]);
    return [...paths]
      .flatMap((filePath) => {
        const expected = expectedByPath.get(filePath);
        const actual = actualByPath.get(filePath);
        if (
          expected !== undefined &&
          actual !== undefined &&
          expected.revisionSha256 === actual.sha256 &&
          expected.byteLength === actual.bytes
        ) {
          return [];
        }
        return [
          {
            path: this.toWorkspacePath(publication.projectRoot, filePath),
            currentContentSha256: actual?.sha256 ?? null,
          },
        ];
      })
      .sort((left, right) => left.path.localeCompare(right.path));
  }

  private toWorkspacePath(projectRoot: string, projectPath: string): string {
    return projectRoot === '.' ? projectPath : `${projectRoot}/${projectPath}`;
  }

  private async readOptionalSha256(absolutePath: string): Promise<string | null> {
    try {
      return createHash('sha256')
        .update(await readFile(absolutePath))
        .digest('hex');
    } catch (error) {
      if (this.isFileNotFound(error)) return null;
      throw error;
    }
  }

  private isFileNotFound(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    );
  }
}
