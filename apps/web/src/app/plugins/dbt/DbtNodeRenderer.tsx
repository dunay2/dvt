import { useMemo } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { Clock, Code, Info, Loader2, Settings, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import {
  useRunEventsQuery,
  useRunSnapshotQuery,
  useScopedRunSummariesQueryForHistory,
} from '../../queries/runsQueries';
import {
  buildRunEventPresentationModel,
  type RunEventLevel,
} from '../../services/runs/runEventPresentationModel';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import { useSessionStore } from '../../stores/sessionStore';
import type { Run, RunEvent } from '../../types/dbt';
import type {
  CanonicalRun,
  CanonicalRunStatus,
  CanonicalTask,
  CanonicalTaskStatus,
} from '../../types/canonical';
import type { RunEvent as EngineRunEvent } from '../../types/engine';
import type { InspectorPanelContribution, InspectorPanelProps } from '../contracts/PluginManifest';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import {
  graphStatusBadgeClasses,
  graphStatusRingClasses,
  graphVisualClasses,
} from '../graph/graphVisualTokens';
import { buildGraphNodeCardPlayAction } from '../graph/graphNodeCardActions';
import { buildGraphNodeCardReadModel } from '../graph/graphNodeCardReadModel';
import type { GraphNodeOperationalDetail } from '../graph/graphNodeCardStrategyContracts';
import { GraphNodeCardView } from '../graph/GraphNodeCardView';
import { CANVAS_NODE_KINDS } from '../nodeTypeCatalog';

const DBT_PLUGIN_ID = 'dbt';

type ColumnMeta = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
};

export type DbtNodeRunHistoryEntry = {
  readonly eventId: string;
  readonly eventType: string;
  readonly runId: string;
  readonly runSeq: number;
  readonly emittedAt: string;
  readonly emittedAtLabel: string;
  readonly headline: string;
  readonly detail: string | null;
  readonly level: RunEventLevel;
  readonly stepId: string | null;
};

function resolveKindMeta(kind: string) {
  return CANVAS_NODE_KINDS.find((entry) => entry.kind === kind);
}

function buildOverlayProps(
  borderColor?: string,
  backgroundColor?: string
): { style?: CSSProperties } {
  const style: CSSProperties = {};
  if (borderColor) style.borderColor = borderColor;
  if (backgroundColor) style.backgroundColor = backgroundColor;
  return Object.keys(style).length > 0 ? { style } : {};
}

function resolveColumns(
  data: Record<string, unknown>,
  metadata: Record<string, unknown> | undefined
): ColumnMeta[] {
  if (Array.isArray(data.columns)) {
    return data.columns as ColumnMeta[];
  }
  if (Array.isArray(metadata?.columns)) {
    return metadata.columns as ColumnMeta[];
  }
  return [];
}

function meta<T>(node: InspectorPanelProps['node'], key: string): T | undefined {
  return node.metadata?.[key] as T | undefined;
}

export function buildDbtNodeRunHistoryEntries(
  runId: string | undefined,
  events: readonly EngineRunEvent[] | undefined,
  nodeId: string
): DbtNodeRunHistoryEntry[] {
  if (!runId || !events) {
    return [];
  }

  const readEventPayloadNodeId = (event: EngineRunEvent): string | null => {
    const payload = event.payload;
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const payloadNodeId = (payload as Record<string, unknown>).nodeId;
    return typeof payloadNodeId === 'string' && payloadNodeId.length > 0 ? payloadNodeId : null;
  };

  const isNodeHistoryEvent = (event: EngineRunEvent): boolean =>
    event.stepId === nodeId || readEventPayloadNodeId(event) === nodeId;

  return events
    .filter((event) => event.runId === runId && isNodeHistoryEvent(event))
    .map((event) => {
      const presentation = buildRunEventPresentationModel(event);

      return {
        eventId: event.eventId,
        eventType: event.eventType,
        runId: event.runId,
        runSeq: event.runSeq,
        emittedAt: event.emittedAt,
        emittedAtLabel: new Date(event.emittedAt).toLocaleString(),
        headline: resolveRunEventHeadline(presentation.headlineKey, presentation.fallbackHeadline),
        detail: presentation.detail,
        level: presentation.level,
        stepId: presentation.stepId,
      };
    });
}

export function DbtNodeRenderer({
  node,
  selected,
  hovered,
  overlayDecoration,
  graphNodeCardStrategies,
  data,
}: Readonly<NodeRendererProps>): ReactElement {
  const kindMeta = resolveKindMeta(node.kind);
  const Icon: LucideIcon | undefined = kindMeta?.icon;

  const statusRing = graphStatusRingClasses[node.status] ?? '';
  const dimmed = overlayDecoration?.dimmed ?? false;
  const overlayProps = buildOverlayProps(
    overlayDecoration?.borderColor,
    overlayDecoration?.backgroundColor
  );
  const typeLabel =
    typeof data.typeLabel === 'string'
      ? data.typeLabel
      : typeof data.type === 'string'
        ? data.type
        : (kindMeta?.label ?? node.kind);
  const cardModel = buildGraphNodeCardReadModel(node, data, graphNodeCardStrategies);
  const playAction = buildGraphNodeCardPlayAction({ nodeId: node.id, data });
  const openOperationalDetails = data.onOpenOperationalDetails;
  const columns = resolveColumns(data, node.metadata);
  const showColumns =
    data.showColumns === true &&
    columns.length > 0 &&
    (kindMeta?.supportsColumns || node.role === 'input' || node.role === 'transform');

  return (
    <GraphNodeCardView
      cardModel={cardModel}
      typeLabel={typeLabel}
      tags={node.tags}
      columns={columns}
      showColumns={showColumns}
      icon={Icon}
      iconColor={kindMeta?.minimapColor}
      borderClass={kindMeta?.borderClass}
      statusRingClass={statusRing}
      selected={selected}
      hovered={hovered}
      dimmed={dimmed}
      overlayStyle={overlayProps.style}
      playAction={playAction}
      onOpenOperationalDetails={
        typeof openOperationalDetails === 'function'
          ? (detail: GraphNodeOperationalDetail, anchorRect: DOMRect) => {
              openOperationalDetails(detail, anchorRect);
            }
          : undefined
      }
    />
  );
}

function DbtOverviewPanel({ node, tagsEditor }: InspectorPanelProps) {
  const pkg = meta<string>(node, 'package');
  const deps = meta<string[]>(node, 'dependencies') ?? [];
  const statusClass = graphStatusBadgeClasses[node.status] ?? graphStatusBadgeClasses.idle;

  return (
    <div className="space-y-4">
      <Card className={graphVisualClasses.inspectorCard}>
        <div className="space-y-2 text-sm">
          {pkg && (
            <div className="flex justify-between">
              <span className={graphVisualClasses.inspectorLabel}>Package</span>
              <span>{pkg}</span>
            </div>
          )}
          {node.path && (
            <div className="flex justify-between gap-4">
              <span className={graphVisualClasses.inspectorLabelFixed}>Path</span>
              <span className="truncate font-mono text-xs">{node.path}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={graphVisualClasses.inspectorLabel}>Status</span>
            <Badge variant="outline" className={`capitalize ${statusClass}`}>
              {node.status}
            </Badge>
          </div>
          {node.lastDuration != null && (
            <div className="flex justify-between">
              <span className={graphVisualClasses.inspectorLabel}>Last duration</span>
              <span>{node.lastDuration}s</span>
            </div>
          )}
          {node.lastCost != null && (
            <div className="flex justify-between">
              <span className={graphVisualClasses.inspectorLabel}>Last cost</span>
              <span>${node.lastCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </Card>

      {node.description && (
        <Card className={graphVisualClasses.inspectorCard}>
          <h3 className={graphVisualClasses.inspectorTitle}>Description</h3>
          <p className={graphVisualClasses.inspectorBody}>{node.description}</p>
        </Card>
      )}

      {(node.tags.length > 0 || tagsEditor) && (
        <Card className={graphVisualClasses.inspectorCard}>
          <h3 className={graphVisualClasses.inspectorTitle}>Tags</h3>
          {tagsEditor ?? (
            <div className="flex flex-wrap gap-1">
              {node.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}

      {deps.length > 0 && (
        <Card className={graphVisualClasses.inspectorCard}>
          <h3 className={graphVisualClasses.inspectorTitle}>Dependencies</h3>
          <div className="space-y-0.5">
            {deps.map((dep) => (
              <div key={dep} className={`font-mono ${graphVisualClasses.inspectorBody}`}>
                -&gt; {dep}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function DbtSqlPanel({ node }: InspectorPanelProps) {
  const compiledSql = meta<string>(node, 'compiledSql');

  return (
    <Card className={graphVisualClasses.inspectorCard}>
      <h3 className={graphVisualClasses.inspectorTitle}>Compiled SQL</h3>
      <pre className={graphVisualClasses.inspectorCodeBlock}>
        {compiledSql ?? 'No compiled SQL available'}
      </pre>
    </Card>
  );
}

function DbtConfigPanel({ node }: InspectorPanelProps) {
  const config = meta<Record<string, unknown>>(node, 'config') ?? { materialized: 'table' };

  return (
    <Card className={graphVisualClasses.inspectorCard}>
      <h3 className={graphVisualClasses.inspectorTitle}>Config</h3>
      <pre className={graphVisualClasses.inspectorCodeText}>{JSON.stringify(config, null, 2)}</pre>
    </Card>
  );
}

function DbtColumnsPanel({ node }: InspectorPanelProps) {
  const columns = meta<ColumnMeta[]>(node, 'columns') ?? [];

  if (columns.length === 0) {
    return <p className={graphVisualClasses.inspectorMuted}>No column metadata available.</p>;
  }

  return (
    <div className="space-y-2">
      {columns.map((column) => (
        <Card key={column.name} className={graphVisualClasses.inspectorCard}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-mono text-sm">{column.name}</div>
              <div className={`mt-0.5 ${graphVisualClasses.inspectorBody}`}>{column.type}</div>
              {column.description && (
                <p className={`mt-1 ${graphVisualClasses.inspectorBody}`}>{column.description}</p>
              )}
            </div>
            {column.nullable != null && (
              <Badge variant="outline" className="text-xs">
                {column.nullable ? 'nullable' : 'not null'}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DbtHistoryPanel({ node, activeRunId }: InspectorPanelProps) {
  const tenantId = useSessionStore((state) => state.tenantId);
  const projectId = useSessionStore((state) => state.projectId);
  const environmentId = useSessionStore((state) => state.environmentId);
  const workspaceLayoutKey = `${tenantId}::${projectId}::${environmentId}`;
  const activeRunIdOrUndefined = activeRunId ?? undefined;

  const {
    data: runSnapshot,
    isFetched: hasRunSnapshotLoaded,
    isLoading,
  } = useRunSnapshotQuery(workspaceLayoutKey, activeRunIdOrUndefined);
  const { data: runSummaries, isLoading: isLoadingList } = useScopedRunSummariesQueryForHistory(
    workspaceLayoutKey,
    !activeRunId
  );
  const fallbackRunId = !activeRunId ? runSummaries?.[0]?.runId : undefined;
  const historyRunId = activeRunIdOrUndefined ?? fallbackRunId;
  const canLoadEvents =
    Boolean(historyRunId) && (!activeRunId || (hasRunSnapshotLoaded && runSnapshot != null));
  const {
    data: runEventsPage,
    isError: isRunEventsError,
    isLoading: isLoadingEvents,
  } = useRunEventsQuery(workspaceLayoutKey, historyRunId, canLoadEvents);
  const nodeHistoryEntries = useMemo(
    () => buildDbtNodeRunHistoryEntries(historyRunId, runEventsPage?.events, node.id),
    [historyRunId, node.id, runEventsPage?.events]
  );

  if (isLoading || isLoadingList || (canLoadEvents && isLoadingEvents)) {
    return (
      <div className={`flex items-center gap-2 ${graphVisualClasses.inspectorMuted}`}>
        <Loader2 className="size-4 animate-spin" />
        Loading run data...
      </div>
    );
  }

  if (activeRunId && hasRunSnapshotLoaded && runSnapshot == null) {
    return (
      <div className={graphVisualClasses.inspectorMutedBlock}>
        <p>No runtime snapshot exists for this run.</p>
      </div>
    );
  }

  if (isRunEventsError && historyRunId) {
    return (
      <div className={graphVisualClasses.inspectorMutedBlock}>
        <p>Runtime event detail could not be loaded for this node.</p>
      </div>
    );
  }

  if (nodeHistoryEntries.length > 0) {
    return (
      <div className="space-y-2">
        {nodeHistoryEntries.map((entry) => (
          <Card key={entry.eventId} className={graphVisualClasses.inspectorCard}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={graphVisualClasses.inspectorTitle}>{entry.headline}</h3>
                <p className={graphVisualClasses.inspectorSubtle}>{entry.emittedAtLabel}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {entry.eventType}
              </Badge>
            </div>
            {entry.detail && (
              <p className={`mt-2 ${graphVisualClasses.inspectorBody}`}>{entry.detail}</p>
            )}
            <div className={`mt-2 flex flex-wrap gap-2 ${graphVisualClasses.inspectorSubtle}`}>
              <span className="font-mono">seq {entry.runSeq}</span>
              {entry.stepId && <span className="font-mono">{entry.stepId}</span>}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={graphVisualClasses.inspectorMutedBlock}>
      <p>No run history for this node.</p>
      {node.lastDuration != null && (
        <p className={graphVisualClasses.inspectorBody}>
          Last recorded duration: <span className="font-mono">{node.lastDuration}s</span>
        </p>
      )}
    </div>
  );
}

function mapRunStatus(status: Run['status']): CanonicalRunStatus {
  switch (status) {
    case 'pending':
      return 'pending';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapTaskStatus(status: string | undefined): CanonicalTaskStatus {
  switch (status) {
    case 'running':
      return 'running';
    case 'success':
      return 'success';
    case 'failed':
      return 'failed';
    case 'skipped':
      return 'skipped';
    case 'warn':
      return 'warn';
    default:
      return 'pending';
  }
}

function findEventMessage(events: RunEvent[], nodeId: string): string | undefined {
  return events.find(
    (event) =>
      event.nodeId === nodeId && (event.type === 'NodeCompleted' || event.type === 'NodeFailed')
  )?.message;
}

function findTaskStartedAt(events: RunEvent[], nodeId: string): string | undefined {
  return events.find((event) => event.nodeId === nodeId && event.type === 'NodeStarted')?.timestamp;
}

function findTaskFinishedAt(events: RunEvent[], nodeId: string): string | undefined {
  return events.find(
    (event) =>
      event.nodeId === nodeId && (event.type === 'NodeCompleted' || event.type === 'NodeFailed')
  )?.timestamp;
}

function buildTasks(run: Run): CanonicalTask[] {
  const tasks: CanonicalTask[] = [];

  for (const step of run.steps) {
    for (const nodeId of step.nodes) {
      const startedAt = findTaskStartedAt(run.events, nodeId);
      const finishedAt = findTaskFinishedAt(run.events, nodeId);
      const message = findEventMessage(run.events, nodeId);
      const isErrored = step.status === 'failed';

      tasks.push({
        taskId: `${run.runId}:${step.id}:${nodeId}`,
        runId: run.runId,
        nodeId,
        pluginId: DBT_PLUGIN_ID,
        status: mapTaskStatus(step.status),
        startedAt,
        finishedAt,
        durationMs:
          step.duration != null
            ? Math.round((step.duration * 1000) / Math.max(step.nodes.length, 1))
            : undefined,
        errorMessage: isErrored ? message : undefined,
        metadata: {
          stepType: step.type,
          stepId: step.id,
          stepName: step.name,
          warehouse: step.policies.warehouse,
          policies: step.policies,
          message,
        },
      });
    }
  }

  return tasks;
}

export function mapRunToCanonical(value: unknown): CanonicalRun | null {
  if (!value || typeof value !== 'object') return null;

  const runtimeDetailLevel = (value as { runtimeDetail?: { level?: string } }).runtimeDetail?.level;
  if (runtimeDetailLevel === 'snapshot') {
    return null;
  }

  const run = value as Partial<Run>;

  if (
    !run.runId ||
    !run.planId ||
    !run.startTime ||
    !Array.isArray(run.steps) ||
    !Array.isArray(run.events) ||
    !run.status ||
    !run.environment
  ) {
    return null;
  }

  return {
    runId: run.runId,
    planId: run.planId,
    pluginId: DBT_PLUGIN_ID,
    status: mapRunStatus(run.status),
    startedAt: run.startTime,
    finishedAt: run.endTime,
    durationMs: run.duration != null ? run.duration * 1000 : undefined,
    environment: run.environment,
    gitSha: run.gitSha,
    tasks: buildTasks(run as Run),
    metadata: {
      artifacts: run.artifacts,
    },
  };
}

export const dbtInspectorPanels: InspectorPanelContribution[] = [
  {
    id: 'dbt.overview',
    pluginId: DBT_PLUGIN_ID,
    label: 'Overview',
    icon: Info,
    order: 10,
    shouldShow: (node) => node.pluginId === DBT_PLUGIN_ID,
    component: DbtOverviewPanel,
  },
  {
    id: 'dbt.sql',
    pluginId: DBT_PLUGIN_ID,
    label: 'SQL',
    icon: Code,
    order: 20,
    shouldShow: (node) => node.pluginId === DBT_PLUGIN_ID && node.metadata?.compiledSql != null,
    component: DbtSqlPanel,
  },
  {
    id: 'dbt.config',
    pluginId: DBT_PLUGIN_ID,
    label: 'Config',
    icon: Settings,
    order: 30,
    shouldShow: (node) => node.pluginId === DBT_PLUGIN_ID,
    component: DbtConfigPanel,
  },
  {
    id: 'dbt.columns',
    pluginId: DBT_PLUGIN_ID,
    label: 'Columns',
    icon: Table,
    order: 40,
    shouldShow: (node) =>
      node.pluginId === DBT_PLUGIN_ID &&
      Array.isArray(node.metadata?.columns) &&
      (node.metadata.columns as unknown[]).length > 0,
    component: DbtColumnsPanel,
  },
  {
    id: 'dbt.history',
    pluginId: DBT_PLUGIN_ID,
    label: 'History',
    icon: Clock,
    order: 50,
    shouldShow: (node) => node.pluginId === DBT_PLUGIN_ID,
    component: DbtHistoryPanel,
  },
];
