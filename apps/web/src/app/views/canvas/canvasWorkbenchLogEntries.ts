/** Owned concern: project current Canvas route posture into workbench log entries. */
import type { UserPermissions } from './canvasShell.types';
import type { CanvasRouteState } from './canvasDraftPresentationModel';
import type {
  CanvasDraftAccessPosture,
  CanvasDraftAccessPostureKind,
} from './canvasDraftAccessPostureModel';
import type { PlanRunReadinessReadModel } from './canvasPlanReadiness';

export type CanvasWorkbenchLogSeverity = 'info' | 'warning' | 'error';

export type CanvasWorkbenchLogSource =
  'route' | 'draft' | 'plan' | 'permission' | 'graph' | 'selection' | 'run';

export type CanvasWorkbenchLogEntry = Readonly<{
  id: string;
  severity: CanvasWorkbenchLogSeverity;
  source: CanvasWorkbenchLogSource;
  message: string;
  detail: string;
}>;

export type CanvasWorkbenchLogEntriesReadModel = Readonly<{
  rail: 'ListCanvasWorkbenchLogEntries';
  entries: readonly CanvasWorkbenchLogEntry[];
}>;

export type BuildCanvasWorkbenchLogEntriesArgs = Readonly<{
  presentation: Pick<
    import('./canvasDraftPresentationModel').CanvasDraftPresentationState,
    'routeState' | 'routeReadiness'
  >;
  draft: Pick<CanvasDraftAccessPosture, 'kind' | 'title' | 'message' | 'statusLabel'>;
  toolbar: Readonly<{
    planRunReadiness: Pick<PlanRunReadinessReadModel, 'status' | 'summary'>;
    canPlanGraph: boolean;
    canStartRun: boolean;
    planStatusSummary: string;
  }>;
  permissions: UserPermissions;
  graph: Readonly<{
    nodeCount: number;
    edgeCount: number;
  }>;
  selection: Readonly<{
    inspectorNodeName: string | null;
    activeRunId: string | null;
  }>;
}>;

function normalizeLogMessage(message: string): string {
  return message.trim().replace(/\s+/g, ' ');
}

function slugLogMessage(message: string): string {
  return normalizeLogMessage(message)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function resolveRouteSeverity(routeState: CanvasRouteState): CanvasWorkbenchLogSeverity {
  if (routeState === 'blocked_backend' || routeState === 'error_graph') {
    return 'error';
  }

  if (routeState === 'loading_backend' || routeState === 'loading_graph') {
    return 'warning';
  }

  if (routeState === 'recovery' || routeState === 'needs_canvas') {
    return 'warning';
  }

  return 'info';
}

function resolveDraftSeverity(
  draftKind: CanvasDraftAccessPostureKind
): CanvasWorkbenchLogSeverity | null {
  switch (draftKind) {
    case 'writable':
    case 'saved':
      return null;
    case 'save_failed':
    case 'unauthenticated':
    case 'forbidden_scope':
    case 'format_error':
    case 'stale_conflict':
      return 'error';
    case 'saving':
    case 'read_only':
    case 'missing_remote':
    case 'projection_gap':
    case 'unknown_pending':
      return 'warning';
  }
}

function formatGraphMessage(nodeCount: number, edgeCount: number): string {
  if (nodeCount === 0 && edgeCount === 0) {
    return 'Graph is empty.';
  }

  const nodeLabel = nodeCount === 1 ? 'node' : 'nodes';
  const edgeLabel = edgeCount === 1 ? 'edge' : 'edges';
  return `Graph contains ${nodeCount} ${nodeLabel} and ${edgeCount} ${edgeLabel}.`;
}

export function buildCanvasWorkbenchLogEntries({
  presentation,
  draft,
  toolbar,
  permissions,
  graph,
  selection,
}: BuildCanvasWorkbenchLogEntriesArgs): CanvasWorkbenchLogEntriesReadModel {
  const entries: CanvasWorkbenchLogEntry[] = [];
  const seenMessages = new Set<string>();

  function pushEntry(entry: Omit<CanvasWorkbenchLogEntry, 'id'>): void {
    const message = normalizeLogMessage(entry.message);
    if (message.length === 0) {
      return;
    }

    const dedupeKey = message.toLowerCase();
    if (seenMessages.has(dedupeKey)) {
      return;
    }

    seenMessages.add(dedupeKey);
    entries.push({
      ...entry,
      message,
      id: `${entry.source}:${entry.detail}:${slugLogMessage(message)}`,
    });
  }

  pushEntry({
    severity: resolveRouteSeverity(presentation.routeState),
    source: 'route',
    message: presentation.routeReadiness.detail,
    detail: presentation.routeState,
  });

  const draftSeverity = resolveDraftSeverity(draft.kind);
  if (draftSeverity != null) {
    pushEntry({
      severity: draftSeverity,
      source: 'draft',
      message: draft.message || draft.statusLabel || draft.title,
      detail: draft.kind,
    });
  }

  if (toolbar.planRunReadiness.status === 'blocked') {
    pushEntry({
      severity: 'warning',
      source: 'plan',
      message: toolbar.planRunReadiness.summary || toolbar.planStatusSummary,
      detail: toolbar.planRunReadiness.status,
    });
  }

  if (!permissions.canPlan || !toolbar.canPlanGraph) {
    pushEntry({
      severity: 'warning',
      source: 'permission',
      message: 'Execution Preview is unavailable for this workspace scope.',
      detail: 'plan_unavailable',
    });
  }

  if (!permissions.canRun || !toolbar.canStartRun) {
    pushEntry({
      severity: 'warning',
      source: 'permission',
      message: 'Run start is unavailable for this workspace scope.',
      detail: 'run_unavailable',
    });
  }

  if (!permissions.canEditEdges) {
    pushEntry({
      severity: 'warning',
      source: 'permission',
      message: 'Graph editing is unavailable for this workspace scope.',
      detail: 'graph_edit_unavailable',
    });
  }

  pushEntry({
    severity: 'info',
    source: 'graph',
    message: formatGraphMessage(graph.nodeCount, graph.edgeCount),
    detail: 'current_graph',
  });

  if (selection.inspectorNodeName != null && selection.inspectorNodeName.trim().length > 0) {
    pushEntry({
      severity: 'info',
      source: 'selection',
      message: `Selected node: ${selection.inspectorNodeName}.`,
      detail: 'selected_node',
    });
  }

  if (selection.activeRunId != null && selection.activeRunId.trim().length > 0) {
    pushEntry({
      severity: 'info',
      source: 'run',
      message: `Active run: ${selection.activeRunId}.`,
      detail: 'active_run',
    });
  }

  return {
    rail: 'ListCanvasWorkbenchLogEntries',
    entries,
  };
}
