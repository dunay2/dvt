/**
 * Owned concern: execute the GetWorkspaceFileHistory query against the
 * workspace file-history repository port.
 */
import type {
  IWorkspaceFileHistoryRepository,
  WorkspaceFileHistoryEntry,
} from '../ports/workspaceFileHistory.js';

export class ListWorkspaceFileHistoryUseCase {
  public constructor(private readonly repository: IWorkspaceFileHistoryRepository) {}

  public async execute(path: string): Promise<readonly WorkspaceFileHistoryEntry[]> {
    return this.repository.listFileHistory(path);
  }
}
