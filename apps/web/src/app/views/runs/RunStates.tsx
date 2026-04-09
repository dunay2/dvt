import {
  RunDetailErrorStateView,
  RunDetailLoadingStateView,
  RunNotFoundStateView,
} from './RunDetailStateViews';
import { RunListStateView } from './RunListStateView';
import { RunWorkspaceStateView } from './RunWorkspaceStateView';

export const RunListState = RunListStateView;
export const RunNotFoundState = RunNotFoundStateView;
export const RunDetailLoadingState = RunDetailLoadingStateView;
export const RunDetailErrorState = RunDetailErrorStateView;
export const RunWorkspaceState = RunWorkspaceStateView;
