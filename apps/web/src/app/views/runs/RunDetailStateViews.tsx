import { Link } from 'react-router';

import {
  WorkbenchDegradedState,
  WorkbenchEmptyState,
  WorkbenchErrorState,
  WorkbenchLoadingState,
} from '../../components/workbench/state/WorkbenchStates';
import { runStatesCopy as copy } from './runStatesCopy';

type RunsEmptyStateProps = {
  title?: string;
};

export function RunsEmptyStateView({ title = copy.runsTitle }: RunsEmptyStateProps) {
  return (
    <WorkbenchEmptyState
      frameTitle={title}
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
  return (
    <WorkbenchLoadingState
      frameTitle={`Run ${runId}`}
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
  return (
    <WorkbenchErrorState
      frameTitle={`Run ${runId}`}
      slotPrefix="runs-state"
      dataSlot="run-detail-error-state"
      title={copy.runWorkspaceUnavailable}
      message={message}
    />
  );
}

type RunDegradedStateProps = {
  message: string;
};

export function RunDegradedStateView({ message }: RunDegradedStateProps) {
  return (
    <WorkbenchDegradedState
      dataSlot="run-degraded-state"
      title={copy.runDegradedTitle}
      message={message}
      note={copy.runDegradedNote}
    />
  );
}
