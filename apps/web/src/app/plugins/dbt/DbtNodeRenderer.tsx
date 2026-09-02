import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { Clock, Code, Info, Loader2, Table } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  useRunSnapshotQuery,
  useScopedRunSummariesQueryForHistory,
} from '../../queries/runsQueries';
import { useRunEventFeedQuery } from '../../queries/runEventFeedQuery';
import {
  buildRunEventPresentationModel,
  type RunEventLevel,
} from '../../services/runs/runEventPresentationModel';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import { useSessionStore } from '../../stores/sessionStore';
import {
  useApplicationLanguageStore,
  type ApplicationLanguage,
} from '../../stores/applicationLanguageStore';
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
import { inspectorVisualClasses } from '../../components/inspector/inspectorVisualTokens';
import { graphStatusBadgeClasses } from '../graph/graphVisualTokens';
import { projectGraphNodeCardViewProps } from '../graph/graphNodeCardReadModel';
import { GraphNodeCardView } from '../graph/GraphNodeCardView';

const DBT_PLUGIN_ID = 'dbt';

const DBT_INSPECTOR_COPY = {
  en: {
    package: 'Package',
    path: 'Path',
    status: 'Status',
    lastDuration: 'Last duration',
    lastCost: 'Last cost',
    description: 'Description',
    tags: 'Tags',
    dependencies: 'Dependencies',
    compiledSql: 'Compiled SQL',
    noCompiledSql: 'No compiled SQL available',
    noColumnMetadata: 'No column metadata available.',
    nullable: 'nullable',
    notNull: 'not null',
    historyLoadFailure: 'Runtime event detail could not be loaded for this node.',
    retryHistory: 'Retry history',
    loadingRunData: 'Loading run data...',
    noRuntimeSnapshot: 'No runtime snapshot exists for this run.',
    noRunHistory: 'No run history for this node.',
    lastRecordedDuration: 'Last recorded duration',
    statuses: {
      idle: 'Idle',
      running: 'Running',
      success: 'Success',
      failed: 'Failed',
      skipped: 'Skipped',
      warn: 'Warning',
    },
  },
  es: {
    package: 'Paquete',
    path: 'Ruta',
    status: 'Estado',
    lastDuration: 'Última duración',
    lastCost: 'Último coste',
    description: 'Descripción',
    tags: 'Etiquetas',
    dependencies: 'Dependencias',
    compiledSql: 'SQL compilado',
    noCompiledSql: 'No hay SQL compilado disponible',
    noColumnMetadata: 'No hay metadatos de columnas disponibles.',
    nullable: 'admite nulos',
    notNull: 'no nulo',
    historyLoadFailure: 'No se pudo cargar el detalle de ejecución de este nodo.',
    retryHistory: 'Reintentar historial',
    loadingRunData: 'Cargando datos de ejecución...',
    noRuntimeSnapshot: 'No existe una instantánea de ejecución para esta ejecución.',
    noRunHistory: 'No hay historial de ejecuciones para este nodo.',
    lastRecordedDuration: 'Última duración registrada',
    statuses: {
      idle: 'Inactivo',
      running: 'En ejecución',
      success: 'Correcto',
      failed: 'Fallido',
      skipped: 'Omitido',
      warn: 'Con advertencias',
    },
  },
} as const;

function useDbtInspectorCopy() {
  const language = useApplicationLanguageStore((state) => state.language);
  return DBT_INSPECTOR_COPY[language];
}

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

function meta<T>(node: InspectorPanelProps['node'], key: string): T | undefined {
  return node.metadata?.[key] as T | undefined;
}

export function buildDbtNodeRunHistoryEntries(
  runId: string | undefined,
  events: readonly EngineRunEvent[] | undefined,
  nodeId: string,
  language: ApplicationLanguage = 'en'
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
        emittedAtLabel: new Date(event.emittedAt).toLocaleString(
          language === 'es' ? 'es-ES' : 'en-US'
        ),
        headline: resolveRunEventHeadline(presentation.headlineKey, presentation.fallbackHeadline),
        detail: presentation.detail,
        level: presentation.level,
        stepId: presentation.stepId,
      };
    });
}

export function DbtNodeRenderer(props: Readonly<NodeRendererProps>): ReactElement {
  return <GraphNodeCardView {...projectGraphNodeCardViewProps(props)} />;
}

function DbtOverviewPanel({ node, tagsEditor }: InspectorPanelProps) {
  const copy = useDbtInspectorCopy();
  const pkg = meta<string>(node, 'package');
  const deps = meta<string[]>(node, 'dependencies') ?? [];
  const statusClass = graphStatusBadgeClasses[node.status] ?? graphStatusBadgeClasses.idle;

  return (
    <div className="space-y-4">
      <Card className={inspectorVisualClasses.inspectorCard}>
        <div className="space-y-2 text-sm">
          {pkg && (
            <div className="flex justify-between">
              <span className={inspectorVisualClasses.inspectorLabel}>{copy.package}</span>
              <span>{pkg}</span>
            </div>
          )}
          {node.path && (
            <div className="flex justify-between gap-4">
              <span className={inspectorVisualClasses.inspectorLabelFixed}>{copy.path}</span>
              <span className="truncate font-mono text-xs">{node.path}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className={inspectorVisualClasses.inspectorLabel}>{copy.status}</span>
            <Badge variant="outline" className={`capitalize ${statusClass}`}>
              {copy.statuses[node.status]}
            </Badge>
          </div>
          {node.lastDuration != null && (
            <div className="flex justify-between">
              <span className={inspectorVisualClasses.inspectorLabel}>{copy.lastDuration}</span>
              <span>{node.lastDuration}s</span>
            </div>
          )}
          {node.lastCost != null && (
            <div className="flex justify-between">
              <span className={inspectorVisualClasses.inspectorLabel}>{copy.lastCost}</span>
              <span>${node.lastCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </Card>

      {node.description && (
        <Card className={inspectorVisualClasses.inspectorCard}>
          <h3 className={inspectorVisualClasses.inspectorTitle}>{copy.description}</h3>
          <p className={inspectorVisualClasses.inspectorBody}>{node.description}</p>
        </Card>
      )}

      {(node.tags.length > 0 || tagsEditor) && (
        <Card className={inspectorVisualClasses.inspectorCard}>
          <h3 className={inspectorVisualClasses.inspectorTitle}>{copy.tags}</h3>
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
        <Card className={inspectorVisualClasses.inspectorCard}>
          <h3 className={inspectorVisualClasses.inspectorTitle}>{copy.dependencies}</h3>
          <div className="space-y-0.5">
            {deps.map((dep) => (
              <div key={dep} className={`font-mono ${inspectorVisualClasses.inspectorBody}`}>
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
  const copy = useDbtInspectorCopy();
  const compiledSql = meta<string>(node, 'compiledSql');

  return (
    <Card className={inspectorVisualClasses.inspectorCard}>
      <h3 className={inspectorVisualClasses.inspectorTitle}>{copy.compiledSql}</h3>
      <pre className={inspectorVisualClasses.inspectorCodeBlock}>
        {compiledSql ?? copy.noCompiledSql}
      </pre>
    </Card>
  );
}

function DbtColumnsPanel({ node }: InspectorPanelProps) {
  const copy = useDbtInspectorCopy();
  const columns = meta<ColumnMeta[]>(node, 'columns') ?? [];

  if (columns.length === 0) {
    return <p className={inspectorVisualClasses.inspectorMuted}>{copy.noColumnMetadata}</p>;
  }

  return (
    <div className="space-y-2">
      {columns.map((column) => (
        <Card key={column.name} className={inspectorVisualClasses.inspectorCard}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-mono text-sm">{column.name}</div>
              <div className={`mt-0.5 ${inspectorVisualClasses.inspectorBody}`}>{column.type}</div>
              {column.description && (
                <p className={`mt-1 ${inspectorVisualClasses.inspectorBody}`}>
                  {column.description}
                </p>
              )}
            </div>
            {column.nullable != null && (
              <Badge variant="outline" className="text-xs">
                {column.nullable ? copy.nullable : copy.notNull}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function DbtHistoryDegradedNotice({ onRetry }: Readonly<{ onRetry?: () => void }>) {
  const copy = useDbtInspectorCopy();
  return (
    <div className={inspectorVisualClasses.inspectorMutedBlock}>
      <p>{copy.historyLoadFailure}</p>
      {onRetry ? (
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onRetry}>
          {copy.retryHistory}
        </Button>
      ) : null}
    </div>
  );
}

function DbtHistoryPanel({ node, activeRunId }: InspectorPanelProps) {
  const language = useApplicationLanguageStore((state) => state.language);
  const copy = DBT_INSPECTOR_COPY[language];
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
  const historyRunStatus = activeRunId ? runSnapshot?.status : runSummaries?.[0]?.status;
  const canLoadEvents =
    Boolean(historyRunId) && (!activeRunId || (hasRunSnapshotLoaded && runSnapshot != null));
  const {
    data: runEventFeed,
    isLoading: isLoadingEvents,
    retryNow,
  } = useRunEventFeedQuery(historyRunId, {
    enabled: canLoadEvents,
    runStatus: historyRunStatus,
  });
  const runEvents = runEventFeed?.phase === 'idle' ? [] : runEventFeed?.events;
  const nodeHistoryEntries = useMemo(
    () => buildDbtNodeRunHistoryEntries(historyRunId, runEvents, node.id, language),
    [historyRunId, language, node.id, runEvents]
  );
  const hasRunEventFeedFailure = runEventFeed?.phase !== 'idle' && Boolean(runEventFeed?.failure);
  const retryHistory =
    runEventFeed?.phase !== 'idle' && runEventFeed?.failure?.retryable
      ? () => {
          void retryNow();
        }
      : undefined;

  if (isLoading || isLoadingList || (canLoadEvents && isLoadingEvents)) {
    return (
      <div className={`flex items-center gap-2 ${inspectorVisualClasses.inspectorMuted}`}>
        <Loader2 className="size-4 animate-spin" />
        {copy.loadingRunData}
      </div>
    );
  }

  if (activeRunId && hasRunSnapshotLoaded && runSnapshot == null) {
    return (
      <div className={inspectorVisualClasses.inspectorMutedBlock}>
        <p>{copy.noRuntimeSnapshot}</p>
      </div>
    );
  }

  if (hasRunEventFeedFailure && historyRunId && nodeHistoryEntries.length === 0) {
    return <DbtHistoryDegradedNotice onRetry={retryHistory} />;
  }

  if (nodeHistoryEntries.length > 0) {
    return (
      <div className="space-y-2">
        {hasRunEventFeedFailure ? <DbtHistoryDegradedNotice onRetry={retryHistory} /> : null}
        {nodeHistoryEntries.map((entry) => (
          <Card key={entry.eventId} className={inspectorVisualClasses.inspectorCard}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className={inspectorVisualClasses.inspectorTitle}>{entry.headline}</h3>
                <p className={inspectorVisualClasses.inspectorSubtle}>{entry.emittedAtLabel}</p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">
                {entry.eventType}
              </Badge>
            </div>
            {entry.detail && (
              <p className={`mt-2 ${inspectorVisualClasses.inspectorBody}`}>{entry.detail}</p>
            )}
            <div className={`mt-2 flex flex-wrap gap-2 ${inspectorVisualClasses.inspectorSubtle}`}>
              <span className="font-mono">seq {entry.runSeq}</span>
              {entry.stepId && <span className="font-mono">{entry.stepId}</span>}
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={inspectorVisualClasses.inspectorMutedBlock}>
      <p>{copy.noRunHistory}</p>
      {node.lastDuration != null && (
        <p className={inspectorVisualClasses.inspectorBody}>
          {copy.lastRecordedDuration}: <span className="font-mono">{node.lastDuration}s</span>
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
    label: {
      key: 'dbt.inspector.overview',
      fallback: 'Overview',
      translations: { es: 'Vista general' },
    },
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
    id: 'dbt.columns',
    pluginId: DBT_PLUGIN_ID,
    label: {
      key: 'dbt.inspector.columns',
      fallback: 'Columns',
      translations: { es: 'Columnas' },
    },
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
    label: {
      key: 'dbt.inspector.history',
      fallback: 'History',
      translations: { es: 'Historial' },
    },
    icon: Clock,
    order: 50,
    shouldShow: (node) => node.pluginId === DBT_PLUGIN_ID,
    component: DbtHistoryPanel,
  },
];
