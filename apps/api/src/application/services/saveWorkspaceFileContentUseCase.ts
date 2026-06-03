/**
 * Owned concern: persist workspace file content through the governed workspace
 * file command port.
 */
import type { IWorkspaceFileRepository, WorkspaceFileContent } from '../ports/workspaceFiles.js';

export class SaveWorkspaceFileContentUseCase {
  public constructor(private readonly repository: IWorkspaceFileRepository) {}

  public async execute(path: string, content: string): Promise<WorkspaceFileContent> {
    return this.repository.saveFileContent(path, content);
  }
}
