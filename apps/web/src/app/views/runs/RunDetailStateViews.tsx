/**
 * Owned concern: own all empty, error, degraded, loading, and missing state
 * views for the runs detail route.
 */
import { Link } from 'react-router';

import {
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
} from '../../components/workbench/state/WorkbenchStates';
import { useRunStatesCopy } from './runStatesCopy';

type RunsEmptyStateProps = {
  title?: string;
};

export function RunsEmptyStateView({ title }: RunsEmptyStateProps) {
  const { copy } = useRunStatesCopy();
  return (
    <WorkbenchEmptyState
      frameTitle={title ?? copy.runsTitle}
      slotPrefix="runs-state"
      dataSlot="runs-empty-state"
      title={copy.emptyRunsTitle}
      message={copy.emptyRuns}
      centered
      action={
        <Link to="/canvas" className="text-sm text-blue-400 underline underline-offset-2">
          {copy.emptyRunsLink}
        </Link>
      }
    />
  );
}

type RunMissingStateProps = {
  runId: string;
};

export function RunMissingStateView({ runId }: RunMissingStateProps) {
  const { copy } = useRunStatesCopy();
  return (
    <WorkbenchEmptyState
      frameTitle={copy.runsTitle}
      slotPrefix="runs-state"
      dataSlot="run-missing-state"
      title={copy.runMissingTitle}
      message={
        <>
          {copy.runMissingMessagePrefix} <span className="font-mono">{runId}</span>.
        </>
      }
    />
  );
}

type RunsErrorStateProps = {
  message: string;
};

export function RunsErrorStateView({ message }: RunsErrorStateProps) {
  const { copy } = useRunStatesCopy();
  return (
    <WorkbenchErrorState
      frameTitle={copy.runsTitle}
      slotPrefix="runs-state"
      dataSlot="runs-error-state"
      title={copy.runsUnavailableTitle}
      message={message}
    />
  );
}

type RunDetailLoadingStateProps = {
  runId: string;
};

export function RunDetailLoadingStateView({ runId }: RunDetailLoadingStateProps) {
  const { copy } = useRunStatesCopy();
  return (
    <WorkbenchLoadingState
      frameTitle={copy.runTitle(runId)}
      slotPrefix="runs-state"
      dataSlot="run-detail-loading-state"
      message={copy.runWorkspaceLoading}
    />
  );
}

type RunDetailErrorStateProps = {
  runId: string;
  message: string;
};

export function RunDetailErrorStateView({ runId, message }: RunDetailErrorStateProps) {
  const { copy } = useRunStatesCopy();
  return (
    <WorkbenchErrorState
      frameTitle={copy.runTitle(runId)}
      slotPrefix="runs-state"
      dataSlot="run-detail-error-state"
      title={copy.runWorkspaceUnavailable}
      message={message}
    />
  );
}
