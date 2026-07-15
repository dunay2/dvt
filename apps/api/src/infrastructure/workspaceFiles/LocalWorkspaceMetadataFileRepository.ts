/** Owned concern: isolate server-managed workspace metadata from project-authoritative files. */
import path from 'node:path';

import {
  InvalidWorkspacePathError,
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

  public constructor(options: { readonly root: string }) {
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
    const file = await this.repository.getFileContent(scope, metadataPath);
    return { ...file, path: requestPath, name: path.basename(requestPath) };
  }

  public async saveFileContent(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult> {
    const metadataPath = resolveMetadataPath(input.path);
    const result = await this.repository.saveFileContent(scope, {
      ...input,
      path: metadataPath,
    });
    return result.kind === 'conflict' ? result : { ...result, path: input.path };
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
