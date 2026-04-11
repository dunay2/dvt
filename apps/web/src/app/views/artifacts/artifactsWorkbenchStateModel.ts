import type { ImportState } from './types';

export type ArtifactsWorkbenchState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'invalid-import'; message: string }
  | { kind: 'ready' };

type ArtifactsWorkbenchStateInput = {
  artifactCount: number;
  importState: ImportState;
  isLoadingWorkspaceArtifacts: boolean;
  workspaceArtifactsErrorMessage: string | null;
};

export function getArtifactsWorkbenchState({
  artifactCount,
  importState,
  isLoadingWorkspaceArtifacts,
  workspaceArtifactsErrorMessage,
}: ArtifactsWorkbenchStateInput): ArtifactsWorkbenchState {
  if (artifactCount > 0) {
    return { kind: 'ready' };
  }

  if (importState.status === 'loading' || isLoadingWorkspaceArtifacts) {
    return { kind: 'loading' };
  }

  if (importState.status === 'error') {
    return {
      kind: 'invalid-import',
      message: importState.message,
    };
  }

  if (workspaceArtifactsErrorMessage !== null) {
    return {
      kind: 'error',
      message: workspaceArtifactsErrorMessage,
    };
  }

  return { kind: 'empty' };
}
