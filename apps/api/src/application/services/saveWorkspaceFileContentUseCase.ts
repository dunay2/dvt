/**
 * Owned concern: persist workspace file content through the governed workspace
 * file command port.
 */
import type {
  IWorkspaceFileRepository,
  SaveWorkspaceFileContentInput,
  WorkspaceFileSaveResult,
  WorkspaceStorageScope,
} from '../ports/workspaceFiles.js';

export class SaveWorkspaceFileContentUseCase {
  public constructor(private readonly repository: IWorkspaceFileRepository) {}

  public async execute(
    scope: WorkspaceStorageScope,
    input: SaveWorkspaceFileContentInput
  ): Promise<WorkspaceFileSaveResult> {
    return this.repository.saveFileContent(scope, input);
  }
}
