/**
 * Owned concern: define protected workspace diff-change query read models,
 * validation errors, and outbound repository port.
 */

export type WorkspaceDiffChangeType = 'added' | 'removed' | 'changed';
export type WorkspaceDiffChangeSeverity = 'breaking' | 'warning' | 'info';

export type WorkspaceDiffChange = {
  readonly id: string;
  readonly nodeId: string;
  readonly type: WorkspaceDiffChangeType;
  readonly severity: WorkspaceDiffChangeSeverity;
  readonly description: string;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
};

export class InvalidWorkspaceDiffChangesError extends Error {
  public constructor(readonly path: string) {
    super(`Workspace diff changes are invalid: ${path}`);
    this.name = 'InvalidWorkspaceDiffChangesError';
  }
}

export interface IWorkspaceDiffChangesRepository {
  listDiffChanges(): Promise<readonly WorkspaceDiffChange[]>;
}
