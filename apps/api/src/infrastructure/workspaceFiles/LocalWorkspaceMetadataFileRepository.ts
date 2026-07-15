/** Owned concern: isolate server-managed workspace metadata from project-authoritative files. */
import path from 'node:path';

import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type IWorkspaceMetadataFileRepository,
  type SaveWorkspaceFileContentInput,
  type WorkspaceFileContent,
  type WorkspaceFileSaveResult,
  type WorkspaceStorageScope,
} from '../../application/ports/workspaceFiles.js';

import { LocalWorkspaceFileRepository } from './LocalWorkspaceFileRepository.js';

const WORKSPACE_METADATA_PATH_PREFIX = '.dvt/';
const MAX_WORKSPACE_METADATA_FILE_BYTES = 32_000_000;

export class LocalWorkspaceMetadataFileRepository implements IWorkspaceMetadataFileRepository {
  private readonly repository: LocalWorkspaceFileRepository;
  private readonly previousLayoutRepository: LocalWorkspaceFileRepository;

  public constructor(options: { readonly root: string }) {
    this.previousLayoutRepository = new LocalWorkspaceFileRepository({
      root: path.resolve(options.root),
      maxFileBytes: MAX_WORKSPACE_METADATA_FILE_BYTES,
    });
    this.repository = new LocalWorkspaceFileRepository({
      root: path.join(path.resolve(options.root), '.dvt'),
      maxFileBytes: MAX_WORKSPACE_METADATA_FILE_BYTES,
    });
  }

  public async getFileContent(
    scope: WorkspaceStorageScope,
    requestPath: string
  ): Promise<WorkspaceFileContent> {
    const metadataPath = resolveMetadataPath(requestPath);
    const file = await this.readCanonicalOrMigrate(scope, requestPath, metadataPath);
    if (!file) throw new WorkspaceFileNotFoundError(requestPath);
    return { ...file, path: requestPath, name: path.basename(requestPath) };
  }

  public async saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult> {
    const metadataPath = resolveMetadataPath(input.path);
    await this.readCanonicalOrMigrate(scope, input.path, metadataPath);
    const result = await this.repository.saveFileContent(scope, {
      ...input,
      path: metadataPath,
    });
    return result.kind === 'conflict' ? result : { ...result, path: input.path };
  }

  private async readCanonicalOrMigrate(
    scope: WorkspaceStorageScope,
    requestPath: string,
    metadataPath: string
  ): Promise<WorkspaceFileContent | null> {
    try {
      return await this.repository.getFileContent(scope, metadataPath);
    } catch (error) {
      if (!(error instanceof WorkspaceFileNotFoundError)) throw error;
    }

    let previousFile: WorkspaceFileContent;
    try {
      previousFile = await this.previousLayoutRepository.getFileContent(scope, requestPath);
    } catch (error) {
      if (error instanceof WorkspaceFileNotFoundError) return null;
      throw error;
    }

    const saved = await this.repository.saveFileContent(scope, {
      path: metadataPath,
      content: previousFile.content,
      expectedRevision: { kind: 'absent' },
    });
    if (saved.kind === 'conflict') {
      return this.repository.getFileContent(scope, metadataPath);
    }

    const deletion = await this.previousLayoutRepository.deleteFileContent(scope, {
      path: requestPath,
      expectedRevision: { kind: 'content_sha256', value: previousFile.contentSha256 },
    });
    if (deletion.kind === 'conflict') {
      const rollback = await this.repository.deleteFileContent(scope, {
        path: metadataPath,
        expectedRevision: { kind: 'content_sha256', value: saved.contentSha256 },
      });
      if (rollback.kind === 'deleted') {
        return this.readCanonicalOrMigrate(scope, requestPath, metadataPath);
      }
      throw new Error(`Workspace metadata migration conflicted for ${requestPath}.`);
    }

    return this.repository.getFileContent(scope, metadataPath);
  }
}

function resolveMetadataPath(requestPath: string): string {
  if (!requestPath.startsWith(WORKSPACE_METADATA_PATH_PREFIX)) {
    throw new InvalidWorkspacePathError(requestPath);
  }

  const metadataPath = requestPath.slice(WORKSPACE_METADATA_PATH_PREFIX.length);
  if (metadataPath.length === 0) {
    throw new InvalidWorkspacePathError(requestPath);
  }
  return metadataPath;
}
