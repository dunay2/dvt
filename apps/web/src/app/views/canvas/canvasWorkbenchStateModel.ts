import {
  canvasViewCopy,
  formatCanvasLimitedAccessMessage,
  type CanvasDisabledCapability,
} from './copy';

export type CanvasWorkbenchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'needs_canvas' }
  | { kind: 'empty' }
  | { kind: 'ready' };

export type CanvasReadOnlyState = {
  title: string;
  message: string;
  note: string;
} | null;

type CanvasWorkbenchStateArgs = {
  canonicalNodeCount: number;
  hasCanvasDocument: boolean;
  isLoadingGraph: boolean;
  graphErrorMessage?: string | null;
};

type CanvasReadOnlyStateArgs = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
};

export function getCanvasWorkbenchState({
  canonicalNodeCount,
  hasCanvasDocument,
  isLoadingGraph,
  graphErrorMessage,
}: CanvasWorkbenchStateArgs): CanvasWorkbenchState {
  if (isLoadingGraph) {
    return { kind: 'loading' };
  }

  if (canonicalNodeCount === 0 && graphErrorMessage) {
    return {
      kind: 'error',
      message: graphErrorMessage,
    };
  }

  if (!hasCanvasDocument) {
    return { kind: 'needs_canvas' };
  }

  if (canonicalNodeCount === 0) {
    return { kind: 'empty' };
  }

  return { kind: 'ready' };
}

export function getCanvasReadOnlyState({
  canPlan,
  canRun,
  canEditEdges,
}: CanvasReadOnlyStateArgs): CanvasReadOnlyState {
  const disabledCapabilities: CanvasDisabledCapability[] = [];

  if (!canPlan) {
    disabledCapabilities.push('plan_preview');
  }

  if (!canRun) {
    disabledCapabilities.push('run_start');
  }

  if (!canEditEdges) {
    disabledCapabilities.push('graph_edits');
  }

  if (disabledCapabilities.length === 0) {
    return null;
  }

  if (disabledCapabilities.length === 3) {
    return {
      title: canvasViewCopy.readOnlyTitle,
      message: canvasViewCopy.readOnlyMessage,
      note: canvasViewCopy.readOnlyNote,
    };
  }

  return {
    title: canvasViewCopy.limitedAccessTitle,
    message: formatCanvasLimitedAccessMessage(disabledCapabilities),
    note: canvasViewCopy.readOnlyNote,
  };
}
