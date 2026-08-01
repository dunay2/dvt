/**
 * Owned concern: re-export named state views under shortened aliases for the
 * runs route renderer.
 */
import {
  RunDetailErrorStateView,
  RunDetailLoadingStateView,
  RunMissingStateView,
  RunsEmptyStateView,
  RunsErrorStateView,
} from './RunDetailStateViews';
import { RunEventFeedHealthView } from './RunEventFeedHealthView';
import { RunListStateView } from './RunListStateView';
import { RunWorkspaceStateView } from './RunWorkspaceStateView';

export const RunListState = RunListStateView;
export const RunsEmptyState = RunsEmptyStateView;
export const RunsErrorState = RunsErrorStateView;
export const RunMissingState = RunMissingStateView;
export const RunDetailLoadingState = RunDetailLoadingStateView;
export const RunDetailErrorState = RunDetailErrorStateView;
export const RunEventFeedHealthState = RunEventFeedHealthView;
export const RunWorkspaceState = RunWorkspaceStateView;
