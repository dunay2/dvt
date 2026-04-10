import {
  RunDetailErrorStateView,
  RunDetailLoadingStateView,
  RunDegradedStateView,
  RunMissingStateView,
  RunsEmptyStateView,
  RunsErrorStateView,
} from './RunDetailStateViews';
import { RunListStateView } from './RunListStateView';
import { RunWorkspaceStateView } from './RunWorkspaceStateView';

export const RunListState = RunListStateView;
export const RunsEmptyState = RunsEmptyStateView;
export const RunsErrorState = RunsErrorStateView;
export const RunMissingState = RunMissingStateView;
export const RunDetailLoadingState = RunDetailLoadingStateView;
export const RunDetailErrorState = RunDetailErrorStateView;
export const RunDegradedState = RunDegradedStateView;
export const RunWorkspaceState = RunWorkspaceStateView;
