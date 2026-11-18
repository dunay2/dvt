/**
 * Owned concern: execute the ListWorkspaceFiles query against the workspace
 * file repository port.
 */
import type { WorkspaceDirectoryPage, WorkspaceDirectoryRequest } from '@dvt/contracts';

import type {
  IWorkspaceFileListingPort,
  WorkspaceFileEntry,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

export class ListWorkspaceFilesUseCase {
  public constructor(private readonly repository: IWorkspaceFileListingPort) {}

  public async execute(scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]> {
    return this.repository.listFiles(scope);
  }

  public directoryPage(
    scope: WorkspaceStorageScope,
    request: WorkspaceDirectoryRequest
  ): Promise<WorkspaceDirectoryPage> {
    return this.repository.listDirectoryPage(scope, request);
  }
}
