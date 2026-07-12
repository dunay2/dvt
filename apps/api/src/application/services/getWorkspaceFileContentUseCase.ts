/**
 * Owned concern: execute the GetWorkspaceFileContent query against the
 * workspace file repository port.
 */
import type {
  IWorkspaceFileRepository,
  WorkspaceFileContent,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

export class GetWorkspaceFileContentUseCase {
  public constructor(private readonly repository: IWorkspaceFileRepository) {}

  public async execute(scope: WorkspaceStorageScope, path: string): Promise<WorkspaceFileContent> {
    return this.repository.getFileContent(scope, path);
  }
}
