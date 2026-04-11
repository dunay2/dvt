import { canvasViewCopy } from './copy';

export type CanvasWorkbenchState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready' };

export type CanvasReadOnlyState = {
  title: string;
  message: string;
  note: string;
} | null;

type CanvasWorkbenchStateArgs = {
  canonicalNodeCount: number;
  isLoadingGraph: boolean;
  graphErrorMessage?: string | null;
};

type CanvasReadOnlyStateArgs = {
  canPlan: boolean;
  canRun: boolean;
  canEditEdges: boolean;
};

function formatDisabledCapabilities(capabilities: string[]): string {
  if (capabilities.length === 0) {
    return '';
  }

  if (capabilities.length === 1) {
    return capabilities[0] ?? '';
  }

  if (capabilities.length === 2) {
    return `${capabilities[0]} and ${capabilities[1]}`;
  }

  return `${capabilities.slice(0, -1).join(', ')}, and ${capabilities.at(-1)}`;
}

export function getCanvasWorkbenchState({
  canonicalNodeCount,
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
  const disabledCapabilities: string[] = [];

  if (!canPlan) {
    disabledCapabilities.push('plan preview');
  }

  if (!canRun) {
    disabledCapabilities.push('run start');
  }

  if (!canEditEdges) {
    disabledCapabilities.push('graph edits');
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

  const disabledSummary = formatDisabledCapabilities(disabledCapabilities);
  const verb = disabledCapabilities.length === 1 ? 'is' : 'are';

  return {
    title: canvasViewCopy.limitedAccessTitle,
    message: `You can keep inspecting the graph, but ${disabledSummary} ${verb} unavailable in this context.`,
    note: canvasViewCopy.readOnlyNote,
  };
}
