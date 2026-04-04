import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { CSSProperties, ReactElement } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Info,
  Loader2,
  Settings,
  Table,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { resolveDataSource } from '../../services/config/dataSource';
import { createRunsService } from '../../services/runs/runsService';
import type { Run, RunEvent } from '../../types/dbt';
import type { CanonicalRun, CanonicalRunStatus, CanonicalTask, CanonicalTaskStatus } from '../../types/canonical';
import type { InspectorPanelContribution, InspectorPanelProps } from '../contracts/PluginManifest';
import type { NodeRendererProps } from '../contracts/NodeRendering';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';

const STATUS_RING: Record<string, string> = {
  running: 'ring-2 ring-blue-400',
  success: 'ring-2 ring-green-500',
  failed: 'ring-2 ring-red-500',
  skipped: 'ring-1 ring-yellow-400 opacity-60',
};

const STATUS_DOT: Record<string, string> = {
  idle: 'bg-gray-500',
  running: 'bg-blue-500 animate-pulse',
  success: 'bg-green-500',
  failed: 'bg-red-500',
  skipped: 'bg-yellow-500',
  warn: 'bg-orange-500',
};

const STATUS_BADGE: Record<string, string> = {
  idle: 'border-gray-500/80 bg-gray-900/60 text-slate-100',
  running: 'border-blue-500/80 bg-blue-950/60 text-blue-200',
  success: 'border-green-500/80 bg-green-950/60 text-green-200',
  failed: 'border-red-500/80 bg-red-950/60 text-red-200',
  skipped: 'border-yellow-500/80 bg-yellow-950/60 text-yellow-200',
};

const cardClass = 'border-slate-700 bg-slate-950 p-3 text-slate-50';
const titleClass = 'mb-2 text-sm font-medium text-slate-100';
const DBT_PLUGIN_ID = 'dbt';

type ColumnMeta = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
};

function resolveKindMeta(kind: string) {
  return DBT_NODE_KINDS.find((entry) => entry.kind === kind);
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

  const statusRing = STATUS_RING[node.status] ?? '';
  const statusDot = STATUS_DOT[node.status] ?? STATUS_DOT.idle;
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
        'min-w-[140px] rounded-md border bg-neutral-900 px-3 py-2 text-xs text-neutral-100 transition-opacity',
        kindMeta?.borderClass ?? 'border-neutral-600',
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
        <div className="mt-2 flex gap-2 text-[10px] text-slate-300">
          {node.lastDuration != null && <span>{node.lastDuration}s</span>}
          {node.lastCost != null && <span>${node.lastCost.toFixed(2)}</span>}
        </div>
      )}

      {node.path && <div className="mt-1 truncate text-[10px] opacity-50">{node.path}</div>}

      {node.tags.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {node.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-neutral-700 px-1 py-0.5 text-[9px] text-neutral-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showColumns && (
        <div className="mt-2 border-t border-slate-700 pt-2">
          <button
            type="button"
            onClick={() => setColumnsExpanded((value) => !value)}
            className="flex w-full items-center justify-between text-xs text-slate-300 transition-colors hover:text-white"
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
                <div
                  key={`${node.id}:${column.name}`}
                  className="flex items-center justify-between rounded bg-slate-950 px-2 py-1 text-[10px]"
                >
                  <span className="truncate font-mono text-white">{column.name}</span>
                  <span className="ml-2 shrink-0 text-slate-400">{column.type}</span>
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
  const statusClass = STATUS_BADGE[node.status] ?? STATUS_BADGE.idle;

  return (
    <div className="space-y-4">
      <Card className={cardClass}>
        <div className="space-y-2 text-sm">
          {pkg && (
            <div className="flex justify-between">
              <span className="text-slate-400">Package</span>
              <span>{pkg}</span>
            </div>
          )}
          {node.path && (
            <div className="flex justify-between gap-4">
              <span className="shrink-0 text-slate-400">Path</span>
              <span className="truncate font-mono text-xs">{node.path}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <Badge variant="outline" className={`capitalize ${statusClass}`}>
              {node.status}
            </Badge>
          </div>
          {node.lastDuration != null && (
            <div className="flex justify-between">
              <span className="text-slate-400">Last duration</span>
              <span>{node.lastDuration}s</span>
            </div>
          )}
          {node.lastCost != null && (
            <div className="flex justify-between">
              <span className="text-slate-400">Last cost</span>
              <span>${node.lastCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </Card>

      {node.description && (
        <Card className={cardClass}>
          <h3 className={titleClass}>Description</h3>
          <p className="text-xs text-slate-300">{node.description}</p>
        </Card>
      )}

      {node.tags.length > 0 && (
        <Card className={cardClass}>
          <h3 className={titleClass}>Tags</h3>
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
        <Card className={cardClass}>
          <h3 className={titleClass}>Dependencies</h3>
          <div className="space-y-0.5">
            {deps.map((dep) => (
              <div key={dep} className="font-mono text-xs text-slate-300">
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
    <Card className={cardClass}>
      <h3 className={titleClass}>Compiled SQL</h3>
      <pre className="whitespace-pre-wrap rounded border border-slate-700 bg-slate-900 p-3 font-mono text-xs text-slate-50">
        {compiledSql ?? 'No compiled SQL available'}
      </pre>
    </Card>
  );
}

function DbtConfigPanel({ node }: InspectorPanelProps) {
  const config = meta<Record<string, unknown>>(node, 'config') ?? { materialized: 'table' };

  return (
    <Card className={cardClass}>
      <h3 className={titleClass}>Config</h3>
      <pre className="whitespace-pre-wrap font-mono text-xs text-slate-50">
        {JSON.stringify(config, null, 2)}
      </pre>
    </Card>
  );
}

function DbtColumnsPanel({ node }: InspectorPanelProps) {
  const columns = meta<ColumnMeta[]>(node, 'columns') ?? [];

  if (columns.length === 0) {
    return <p className="text-sm text-slate-400">No column metadata available.</p>;
  }

  return (
    <div className="space-y-2">
      {columns.map((column) => (
        <Card key={column.name} className={cardClass}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-mono text-sm">{column.name}</div>
              <div className="mt-0.5 text-xs text-slate-400">{column.type}</div>
              {column.description && (
                <p className="mt-1 text-xs text-slate-300">{column.description}</p>
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
  const runsService = useMemo(() => createRunsService(resolveDataSource()), []);

  const { data: runSnapshot, isLoading } = useQuery({
    queryKey: ['runs', 'snapshot', activeRunId],
    queryFn: () => runsService.getRunSnapshot(activeRunId!),
    enabled: Boolean(activeRunId),
    staleTime: 5_000,
  });

  const { data: runSummaries, isLoading: isLoadingList } = useQuery({
    queryKey: ['runs', 'summaries'],
    queryFn: () => runsService.listRunSummaries(),
    enabled: !activeRunId,
    staleTime: 30_000,
  });

  const hasRuntimeSnapshotData =
    (activeRunId && runSnapshot != null) ||
    (!activeRunId && Array.isArray(runSummaries) && runSummaries.length > 0);

  if (isLoading || isLoadingList) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="size-4 animate-spin" />
        Loading run data...
      </div>
    );
  }

  if (hasRuntimeSnapshotData) {
    return (
      <div className="space-y-2 text-sm text-slate-400">
        <p>Detailed node history is unavailable from the current runtime contract baseline.</p>
        <p className="text-slate-500">
          This panel needs event-backed and step-backed run detail. `F-07` provides snapshot and
          timeline truth, but node-level execution detail remains follow-on work.
        </p>
      </div>
    );
  }

  if (activeRunId && runSnapshot == null) {
    return (
      <div className="space-y-2 text-sm text-slate-400">
        <p>No runtime snapshot exists for this run.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-slate-400">
      <p>No run history for this node.</p>
      {node.lastDuration != null && (
        <p className="text-slate-300">
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
