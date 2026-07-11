/**
 * Owned concern: execute the ListWorkspaceFiles query against the workspace
 * file repository port.
 */
import type {
  IWorkspaceFileRepository,
  WorkspaceFileEntry,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

export class ListWorkspaceFilesUseCase {
  public constructor(private readonly repository: IWorkspaceFileRepository) {}

  public async execute(scope: WorkspaceStorageScope): Promise<readonly WorkspaceFileEntry[]> {
    return this.repository.listFiles(scope);
  }
}
