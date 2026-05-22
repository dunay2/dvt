/**
 * Owned concern: execute the ListWorkspaceDiffChanges query against the
 * workspace diff-change repository port.
 */
import type {
  IWorkspaceDiffChangesRepository,
  WorkspaceDiffChange,
} from '../ports/workspaceDiffChanges.js';

export class ListWorkspaceDiffChangesUseCase {
  public constructor(private readonly repository: IWorkspaceDiffChangesRepository) {}

  public async execute(): Promise<readonly WorkspaceDiffChange[]> {
    return this.repository.listDiffChanges();
  }
}
