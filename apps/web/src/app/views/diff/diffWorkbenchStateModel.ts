import type { DbtNode, DiffChange } from '../../types/dbt';

export type DiffWorkbenchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready' };

type BuildDiffWorkbenchStateInput = {
  diffChanges: DiffChange[];
  isLoadingDiffChanges: boolean;
  diffChangesError: Error | null;
  diffChangesErrorMessage: string;
};

export function buildDiffWorkbenchState({
  diffChanges,
  isLoadingDiffChanges,
  diffChangesError,
  diffChangesErrorMessage,
}: BuildDiffWorkbenchStateInput): DiffWorkbenchState {
  if (diffChangesError && diffChanges.length === 0) {
    return {
      kind: 'error',
      message: diffChangesErrorMessage,
    };
  }

  if (isLoadingDiffChanges && diffChanges.length === 0) {
    return { kind: 'loading' };
  }

  if (diffChanges.length === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'ready' };
}

export type DiffCompareContextState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'ready' };

export type DiffSqlContextState =
  | { kind: 'loading' }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string }
  | { kind: 'ready' };

type BuildDiffCompareContextStateInput = {
  primaryNode: DbtNode | null;
  isLoadingGraphSnapshot: boolean;
  graphSnapshotError: Error | null;
};

export function buildDiffCompareContextState({
  primaryNode,
  isLoadingGraphSnapshot,
  graphSnapshotError,
}: BuildDiffCompareContextStateInput): DiffCompareContextState {
  if (isLoadingGraphSnapshot) {
    return { kind: 'loading' };
  }

  if (graphSnapshotError || !primaryNode) {
    return { kind: 'unavailable' };
  }

  return { kind: 'ready' };
}

type BuildDiffSqlContextStateInput = {
  primaryNode: DbtNode | null;
  isLoadingGraphSnapshot: boolean;
  graphSnapshotError: Error | null;
  isLoadingFileContent: boolean;
  fileContentError: Error | null;
  fileContentErrorMessage: string;
  hasFileContent: boolean;
};

export function buildDiffSqlContextState({
  primaryNode,
  isLoadingGraphSnapshot,
  graphSnapshotError,
  isLoadingFileContent,
  fileContentError,
  fileContentErrorMessage,
  hasFileContent,
}: BuildDiffSqlContextStateInput): DiffSqlContextState {
  if (isLoadingGraphSnapshot) {
    return { kind: 'loading' };
  }

  if (graphSnapshotError || !primaryNode) {
    return { kind: 'unavailable' };
  }

  if (fileContentError) {
    return {
      kind: 'error',
      message: fileContentErrorMessage,
    };
  }

  if (isLoadingFileContent || !hasFileContent) {
    return { kind: 'loading' };
  }

  return { kind: 'ready' };
}
