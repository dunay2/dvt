/**
 * Owned concern: model the runs workbench as a discriminated-union state
 * machine so the route renderer never handles ad-hoc loading/error/data
 * conditions.
 */
import type { RunSummaryItem } from '../../ports/runs';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';

export type RunsWorkbenchState =
  | {
      kind: 'runs-error';
      message: string;
    }
  | {
      kind: 'runs-empty';
    }
  | {
      kind: 'runs-list';
      runs: RunSummaryItem[];
      isLoading: boolean;
    }
  | {
      kind: 'run-loading';
      runId: string;
    }
  | {
      kind: 'run-error';
      runId: string;
      message: string;
    }
  | {
      kind: 'run-missing';
      runId: string;
    }
  | {
      kind: 'run-workspace';
      workspace: RunWorkspaceViewModel;
    };

type BuildRunsWorkbenchStateInput = {
  runId: string | undefined;
  runs: RunSummaryItem[];
  isLoadingRuns: boolean;
  runsError: Error | null;
  runsErrorMessage: string;
  workspace: RunWorkspaceViewModel | null | undefined;
  isLoadingWorkspace: boolean;
  workspaceError: Error | null;
  workspaceErrorMessage: string;
};

export function buildRunsWorkbenchState({
  runId,
  runs,
  isLoadingRuns,
  runsError,
  runsErrorMessage,
  workspace,
  isLoadingWorkspace,
  workspaceError,
  workspaceErrorMessage,
}: BuildRunsWorkbenchStateInput): RunsWorkbenchState {
  if (!runId) {
    if (runsError && runs.length === 0) {
      return {
        kind: 'runs-error',
        message: runsErrorMessage,
      };
    }

    if (!isLoadingRuns && runs.length === 0) {
      return { kind: 'runs-empty' };
    }

    return {
      kind: 'runs-list',
      runs,
      isLoading: isLoadingRuns,
    };
  }

  if (isLoadingWorkspace) {
    return { kind: 'run-loading', runId };
  }

  if (workspaceError) {
    return {
      kind: 'run-error',
      runId,
      message: workspaceErrorMessage,
    };
  }

  if (!workspace) {
    return { kind: 'run-missing', runId };
  }

  return {
    kind: 'run-workspace',
    workspace,
  };
}
