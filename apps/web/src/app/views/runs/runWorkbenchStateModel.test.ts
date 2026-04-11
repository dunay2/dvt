import { describe, expect, it } from 'vitest';

import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import { buildRunsWorkbenchState } from './runWorkbenchStateModel';

function buildWorkspace(): RunWorkspaceViewModel {
  return {
    runId: 'run_123',
    snapshot: {
      runId: 'run_123',
      status: 'running',
      startedAt: '2026-04-10T10:00:00.000Z',
    },
    timeline: {
      state: 'empty',
      events: [],
    },
    detailState: 'snapshot-only',
  };
}

describe('runWorkbenchStateModel', () => {
  it('returns runs-error when the list route cannot load summaries and has no fallback data', () => {
    expect(
      buildRunsWorkbenchState({
        runId: undefined,
        runs: [],
        isLoadingRuns: false,
        runsError: new Error('boom'),
        runsErrorMessage: 'Runtime service is unavailable',
        workspace: undefined,
        isLoadingWorkspace: false,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({
      kind: 'runs-error',
      message: 'Runtime service is unavailable',
    });
  });

  it('returns runs-empty when the list route has no runs and is not loading', () => {
    expect(
      buildRunsWorkbenchState({
        runId: undefined,
        runs: [],
        isLoadingRuns: false,
        runsError: null,
        runsErrorMessage: '',
        workspace: undefined,
        isLoadingWorkspace: false,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({ kind: 'runs-empty' });
  });

  it('returns runs-list while the list route is loading', () => {
    expect(
      buildRunsWorkbenchState({
        runId: undefined,
        runs: [],
        isLoadingRuns: true,
        runsError: null,
        runsErrorMessage: '',
        workspace: undefined,
        isLoadingWorkspace: false,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({
      kind: 'runs-list',
      runs: [],
      isLoading: true,
    });
  });

  it('returns run-loading for focused routes while the workspace query is pending', () => {
    expect(
      buildRunsWorkbenchState({
        runId: 'run_123',
        runs: [],
        isLoadingRuns: false,
        runsError: null,
        runsErrorMessage: '',
        workspace: undefined,
        isLoadingWorkspace: true,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({
      kind: 'run-loading',
      runId: 'run_123',
    });
  });

  it('returns run-error for focused routes when the workspace query fails', () => {
    expect(
      buildRunsWorkbenchState({
        runId: 'run_123',
        runs: [],
        isLoadingRuns: false,
        runsError: null,
        runsErrorMessage: '',
        workspace: undefined,
        isLoadingWorkspace: false,
        workspaceError: new Error('boom'),
        workspaceErrorMessage: 'Run workspace unavailable.',
      })
    ).toEqual({
      kind: 'run-error',
      runId: 'run_123',
      message: 'Run workspace unavailable.',
    });
  });

  it('returns run-missing when the focused run does not exist', () => {
    expect(
      buildRunsWorkbenchState({
        runId: 'run_404',
        runs: [],
        isLoadingRuns: false,
        runsError: null,
        runsErrorMessage: '',
        workspace: null,
        isLoadingWorkspace: false,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({
      kind: 'run-missing',
      runId: 'run_404',
    });
  });

  it('returns run-workspace when the focused run is available', () => {
    const workspace = buildWorkspace();

    expect(
      buildRunsWorkbenchState({
        runId: 'run_123',
        runs: [],
        isLoadingRuns: false,
        runsError: null,
        runsErrorMessage: '',
        workspace,
        isLoadingWorkspace: false,
        workspaceError: null,
        workspaceErrorMessage: '',
      })
    ).toEqual({
      kind: 'run-workspace',
      workspace,
    });
  });
});
