import { useMemo, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import { ChevronDown, ChevronUp, Clock, Code, Info, Loader2, Settings, Table } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  useRunSnapshotQuery,
  useScopedRunSummariesQueryForHistory,
} from '../../queries/runsQueries';
import { useSessionStore } from '../../stores/sessionStore';
import type { Run, RunEvent } from '../../types/dbt';
import type {
  CanonicalRun,
  CanonicalRunStatus,
  CanonicalTask,
  CanonicalTaskStatus,
} from '../../types/canonical';
import type { InspectorPanelContribution, InspectorPanelProps } from '../contracts/PluginManifest';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import {
  graphStatusBadgeClasses,
  graphStatusDotClasses,
  graphStatusRingClasses,
  graphVisualClasses,
} from '../graph/graphVisualTokens';
import { CANVAS_NODE_KINDS } from '../nodeTypeCatalog';

const DBT_PLUGIN_ID = 'dbt';

type ColumnMeta = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
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

export function DbtNodeRenderer({
  node,
  selected,
  hovered,
  overlayDecoration,
  data,
}: Readonly<NodeRendererProps>): ReactElement {
  const kindMeta = resolveKindMeta(node.kind);
  const Icon: LucideIcon | undefined = kindMeta?.icon;
  const [columnsExpanded, setColumnsExpanded] = useState(false);

  const statusRing = graphStatusRingClasses[node.status] ?? '';
  const statusDot = graphStatusDotClasses[node.status] ?? graphStatusDotClasses.idle;
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
  const columns = resolveColumns(data, node.metadata);
  const showColumns =
    data.showColumns === true &&
    columns.length > 0 &&
    (kindMeta?.supportsColumns || node.role === 'input' || node.role === 'transform');

  return (
    <div
      className={cn(
        graphVisualClasses.nodeCard,
        kindMeta?.borderClass,
        selected && 'ring-2 ring-white/40',
        hovered && !selected && 'ring-1 ring-white/20',
        statusRing,
        dimmed && 'opacity-30'
      )}
      {...overlayProps}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {Icon && (
            <Icon
              size={12}
              className="shrink-0 opacity-70"
              {...(kindMeta?.minimapColor
                ? { style: { color: kindMeta.minimapColor } as CSSProperties }
                : {})}
            />
          )}
          <span className="truncate font-semibold leading-tight">{node.name}</span>
        </div>
        <div className={cn('size-2 shrink-0 rounded-full', statusDot)} />
      </div>

      <div className="mt-2">
        <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
          {typeLabel}
        </Badge>
      </div>

      {(node.lastDuration != null || node.lastCost != null) && (
        <div className={graphVisualClasses.metricText}>
          {node.lastDuration != null && <span>{node.lastDuration}s</span>}
          {node.lastCost != null && <span>${node.lastCost.toFixed(2)}</span>}
        </div>
      )}

      {node.path && <div className="mt-1 truncate text-[10px] opacity-50">{node.path}</div>}

      {node.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {node.tags.slice(0, 3).map((tag) => (
            <span key={tag} className={graphVisualClasses.tag}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {showColumns && (
        <div className={graphVisualClasses.columnsShell}>
          <button
            type="button"
            onClick={() => setColumnsExpanded((value) => !value)}
            className={graphVisualClasses.columnsToggle}
          >
            <span className="flex items-center gap-1">
              <Table className="size-3" />
              Columns ({columns.length})
            </span>
            {columnsExpanded ? (
              <ChevronUp className="size-3" />
            ) : (
              <ChevronDown className="size-3" />
            )}
          </button>

          {columnsExpanded && (
            <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
              {columns.map((column) => (
                <div key={`${node.id}:${column.name}`} className={graphVisualClasses.columnRow}>
                  <span className={graphVisualClasses.columnName}>{column.name}</span>
                  <span className={graphVisualClasses.columnType}>{column.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DbtOverviewPanel({ node }: InspectorPanelProps) {
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

      {node.tags.length > 0 && (
        <Card className={graphVisualClasses.inspectorCard}>
          <h3 className={graphVisualClasses.inspectorTitle}>Tags</h3>
          <div className="flex flex-wrap gap-1">
            {node.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
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

  const { data: runSnapshot, isLoading } = useRunSnapshotQuery(
    workspaceLayoutKey,
    activeRunIdOrUndefined
  );
  const { data: runSummaries, isLoading: isLoadingList } = useScopedRunSummariesQueryForHistory(
    workspaceLayoutKey,
    !activeRunId
  );

  const hasRuntimeSnapshotData =
    (activeRunId && runSnapshot != null) ||
    (!activeRunId && Array.isArray(runSummaries) && runSummaries.length > 0);

  if (isLoading || isLoadingList) {
    return (
      <div className={`flex items-center gap-2 ${graphVisualClasses.inspectorMuted}`}>
        <Loader2 className="size-4 animate-spin" />
        Loading run data...
      </div>
    );
  }

  if (hasRuntimeSnapshotData) {
    return (
      <div className={graphVisualClasses.inspectorMutedBlock}>
        <p>Detailed node history is unavailable from the current runtime contract baseline.</p>
        <p className={graphVisualClasses.inspectorSubtle}>
          This panel needs event-backed and step-backed run detail. `F-07` provides snapshot and
          timeline truth, but node-level execution detail remains follow-on work.
        </p>
      </div>
    );
  }

  if (activeRunId && runSnapshot == null) {
    return (
      <div className={graphVisualClasses.inspectorMutedBlock}>
        <p>No runtime snapshot exists for this run.</p>
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
