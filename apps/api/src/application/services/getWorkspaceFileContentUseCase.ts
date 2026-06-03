/**
 * Owned concern: execute the GetWorkspaceFileContent query against the
 * workspace file repository port.
 */
import type { IWorkspaceFileRepository, WorkspaceFileContent } from '../ports/workspaceFiles.js';

export class GetWorkspaceFileContentUseCase {
  public constructor(private readonly repository: IWorkspaceFileRepository) {}

  public async execute(path: string): Promise<WorkspaceFileContent> {
    return this.repository.getFileContent(path);
  }
}
