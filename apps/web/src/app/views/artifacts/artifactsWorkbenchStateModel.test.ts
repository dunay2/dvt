import { describe, expect, it } from 'vitest';

import { getArtifactsWorkbenchState } from './artifactsWorkbenchStateModel';

describe('getArtifactsWorkbenchState', () => {
  it('returns ready when artifacts are available', () => {
    expect(
      getArtifactsWorkbenchState({
        artifactCount: 1,
        importState: { status: 'idle' },
        isLoadingWorkspaceArtifacts: false,
        workspaceArtifactsErrorMessage: 'workspace unavailable',
      })
    ).toEqual({ kind: 'ready' });
  });

  it('returns loading while workspace artifacts are resolving and no artifacts exist yet', () => {
    expect(
      getArtifactsWorkbenchState({
        artifactCount: 0,
        importState: { status: 'idle' },
        isLoadingWorkspaceArtifacts: true,
        workspaceArtifactsErrorMessage: null,
      })
    ).toEqual({ kind: 'loading' });
  });

  it('returns invalid-import when the local manifest import fails and no artifacts exist', () => {
    expect(
      getArtifactsWorkbenchState({
        artifactCount: 0,
        importState: { status: 'error', message: 'Invalid manifest.' },
        isLoadingWorkspaceArtifacts: false,
        workspaceArtifactsErrorMessage: null,
      })
    ).toEqual({ kind: 'invalid-import', message: 'Invalid manifest.' });
  });

  it('returns error when workspace artifacts fail to load and no import is available', () => {
    expect(
      getArtifactsWorkbenchState({
        artifactCount: 0,
        importState: { status: 'idle' },
        isLoadingWorkspaceArtifacts: false,
        workspaceArtifactsErrorMessage: 'workspace unavailable',
      })
    ).toEqual({ kind: 'error', message: 'workspace unavailable' });
  });

  it('returns empty when no artifacts or import errors exist', () => {
    expect(
      getArtifactsWorkbenchState({
        artifactCount: 0,
        importState: { status: 'idle' },
        isLoadingWorkspaceArtifacts: false,
        workspaceArtifactsErrorMessage: null,
      })
    ).toEqual({ kind: 'empty' });
  });
});
