/**
 * Owned concern: render the run workspace detail, provenance, materialization,
 * diagnostics, and timeline read model.
 */
import { ArrowLeft, ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { RunControlActions } from '../../components/runs/RunControlActions';
import {
  routeWorkbenchTabListClassName,
  routeWorkbenchTabTriggerClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { WorkbenchStateFrame } from '../../components/workbench/state/WorkbenchStates';
import type {
  MaterializationEvidence,
  RunDiagnostics,
  RunExecutor,
  RunPlanExecutionSummary,
} from '../../ports/runs';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceModel';
import { RunEventTimelineTable } from './RunEventTimelineTable';
import { RunEventFeedHealthView } from './RunEventFeedHealthView';
import { RunResultPanel } from './RunResultPanel';
import { RunExecutedModels } from './RunExecutedModels';
import { useRunDetailTabPosition } from './runDetailNavigation';
import { useRunStatesCopy } from './runStatesCopy';
import { isKnownRunField } from './runStatesModel';
import type { RunControlCommandController } from './useRunControlCommands';

type RunWorkspaceStateProps = {
  workspace: RunWorkspaceViewModel;
  onRetryEventFeed?: () => void;
  runControls?: RunControlCommandController;
  publicationRows?: ReactNode;
};

type ProvenanceArtifact = {
  stepId: string;
  emittedAt: string;
  artifactKind: string;
  storageUri: string;
  sha256: string;
  sizeBytes: number;
  encoding?: string;
};

type AuthoringArtifact = {
  title: string;
  repo: string;
  path: string;
  ref?: string;
  commitSha?: string;
  contentSha256?: string;
};

function formatDuration(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function formatByteSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRunScopeList(
  values: readonly string[] | undefined,
  scopeUnavailable: string
): string {
  return values && values.length > 0 ? values.join(', ') : scopeUnavailable;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function readArtifactFields(
  value: unknown
): Omit<ProvenanceArtifact, 'stepId' | 'emittedAt' | 'artifactKind'> | null {
  if (!isRecord(value)) {
    return null;
  }

  const storageUri = value.storageUri;
  const sha256 = value.sha256;
  const sizeBytes = value.sizeBytes;
  const encoding = value.encoding;

  if (typeof storageUri !== 'string') return null;
  if (typeof sha256 !== 'string') return null;
  if (typeof sizeBytes !== 'number') return null;
  if (!Number.isFinite(sizeBytes)) return null;

  return {
    storageUri,
    sha256,
    sizeBytes,
    ...(typeof encoding === 'string' ? { encoding } : {}),
  };
}

function deriveMaterializationEvidence(
  workspace: RunWorkspaceViewModel
): MaterializationEvidence | undefined {
  if (workspace.snapshot.status !== 'completed') {
    return undefined;
  }

  return workspace.snapshot.materialization ?? workspace.snapshot.execution?.materialization;
}

function deriveExecutor(workspace: RunWorkspaceViewModel): RunExecutor | undefined {
  return workspace.snapshot.executor;
}

function deriveExecutionProvenance(workspace: RunWorkspaceViewModel): ProvenanceArtifact[] {
  const seen = new Set<string>();
  const provenance: ProvenanceArtifact[] = [];

  for (const event of workspace.timeline.events) {
    const artifact = readStepArtifact(event);
    if (artifact == null) continue;

    const dedupeKey = `${artifact.stepId}|${artifact.storageUri}|${artifact.sha256}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    provenance.push(artifact);
  }

  return provenance;
}

function deriveAuthoringArtifacts(
  workspace: RunWorkspaceViewModel,
  graphArtifactTitle: string,
  sqlArtifactTitle: string
): AuthoringArtifact[] {
  const authoring = workspace.snapshot.provenance?.authoring;
  const artifacts: AuthoringArtifact[] = [];

  if (authoring?.graphArtifact) {
    artifacts.push({
      title: graphArtifactTitle,
      ...authoring.graphArtifact,
    });
  }

  if (authoring?.sqlArtifact) {
    artifacts.push({
      title: sqlArtifactTitle,
      ...authoring.sqlArtifact,
    });
  }

  return artifacts;
}

function deriveFailureDiagnostics(workspace: RunWorkspaceViewModel) {
  if (workspace.snapshot.status !== 'failed') {
    return {
      failedStepId: undefined,
      errorReason: undefined,
      failureEmittedAt: undefined,
    };
  }

  const nestedFailure = workspace.snapshot.execution?.failure;
  const failedStepId = workspace.snapshot.failedStepId ?? nestedFailure?.stepId;
  const errorReason =
    workspace.snapshot.errorReason ?? nestedFailure?.reason ?? nestedFailure?.message;
  const failureEmittedAt = nestedFailure?.failedAt;

  return {
    failedStepId,
    errorReason,
    failureEmittedAt,
  };
}

function RunItineraryCard({
  workspace,
  executor,
  materializationEvidence,
  runControls,
}: Readonly<{
  workspace: RunWorkspaceViewModel;
  executor: RunExecutor | undefined;
  materializationEvidence: MaterializationEvidence | undefined;
  runControls?: RunControlCommandController;
}>) {
  const { copy } = useRunStatesCopy();
  const { snapshot } = workspace;

  return (
    <Card data-slot="run-itinerary-card" className="border-slate-700 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{copy.runItineraryTitle}</h2>
            <Badge className="bg-blue-600">{copy.statusLabels[snapshot.status]}</Badge>
          </div>
          <p className="text-sm text-slate-300">{copy.runItineraryNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/canvas?runId=${encodeURIComponent(snapshot.runId)}`}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              {copy.backToCanvasAction}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/runs">
              <ListChecks aria-hidden="true" className="size-4" />
              {copy.allRunsAction}
            </Link>
          </Button>
          {runControls ? (
            <RunControlActions
              runId={snapshot.runId}
              availability={snapshot.controls}
              activity={runControls.activity}
              outcome={runControls.outcome}
              failure={runControls.failure}
              onCancel={() => runControls.cancelRun(snapshot.runId)}
              onRecover={() => runControls.recoverRun(snapshot.runId)}
              compact={false}
            />
          ) : null}
        </div>
      </div>

      <RunItineraryScope
        workspace={workspace}
        executor={executor}
        materializationEvidence={materializationEvidence}
      />
    </Card>
  );
}

function RunDiagnosticsCard({
  diagnostics,
}: Readonly<{
  diagnostics: RunDiagnostics;
}>) {
  const { copy } = useRunStatesCopy();
  const fields = [
    [copy.diagnosticsRunIdLabel, diagnostics.runId, true],
    [copy.diagnosticsPlanIdLabel, diagnostics.planId, true],
    [copy.diagnosticsPlanShaLabel, diagnostics.planSha, true],
    [copy.diagnosticsStepIdLabel, diagnostics.stepId, true],
    [copy.diagnosticsAttemptIdLabel, diagnostics.attemptId, true],
    [copy.diagnosticsAdapterLabel, diagnostics.adapter, false],
    [copy.durationLabel, diagnostics.durationMs, false],
    [copy.diagnosticsStatusLabel, copy.statusLabels[diagnostics.status], false],
    [copy.diagnosticsErrorCodeLabel, diagnostics.errorCode, false],
  ] as const;

  return (
    <Card data-slot="run-diagnostics-card" className="border-slate-700 bg-slate-900 p-5">
      <h3 className="mb-3 text-sm font-semibold">{copy.diagnosticsTitle}</h3>
      <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        {fields.map(([label, value, monospace]) =>
          value === undefined ? null : (
            <div
              key={label}
              className={label === copy.diagnosticsPlanShaLabel ? 'md:col-span-2' : ''}
            >
              <span className="text-slate-400">{label}</span>
              <div className={monospace ? 'break-all font-mono text-xs' : undefined}>
                {typeof value === 'number' ? formatDuration(value) : value}
              </div>
            </div>
          )
        )}
      </div>

      <div className="mt-4">
        <h4 className="mb-2 text-xs font-semibold uppercase text-slate-400">
          {copy.diagnosticsPointersLabel}
        </h4>
        <div className="space-y-2">
          {diagnostics.pointers.map((pointer) => (
            <div
              key={`${pointer.kind}-${pointer.value}`}
              className="rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
            >
              <Badge variant="outline">
                {pointer.kind === 'trace' ? copy.traceQueryLabel : copy.logQueryLabel}
              </Badge>
              <div className="mt-2 break-all font-mono text-xs">{pointer.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RunWorkspaceStateView({
  workspace,
  onRetryEventFeed,
  runControls,
  publicationRows,
}: RunWorkspaceStateProps) {
  const { copy, language: locale } = useRunStatesCopy();
  const { snapshot } = workspace;
  const { selectedTab, selectTab, canInspectResult } = useRunDetailTabPosition(snapshot.status);
  if (selectedTab === 'models') return <RunExecutedModels snapshot={snapshot} />;

  const executor = deriveExecutor(workspace);
  const materializationEvidence = deriveMaterializationEvidence(workspace);

  return (
    <WorkbenchStateFrame title={copy.runTitle(snapshot.runId)} slotPrefix="runs-state">
      <Tabs
        value={selectedTab}
        onValueChange={selectTab}
        className="mx-auto w-full max-w-4xl"
        data-slot="run-detail-tabs"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList
            aria-label={copy.runDetailSectionsLabel}
            className={`${routeWorkbenchTabListClassName} min-w-max`}
          >
            <TabsTrigger value="summary" className={routeWorkbenchTabTriggerClassName}>
              {copy.runSummaryTabLabel}
            </TabsTrigger>
            <TabsTrigger
              value="result"
              data-slot="run-result-tab"
              className={routeWorkbenchTabTriggerClassName}
              disabled={!canInspectResult}
            >
              {copy.runResultTabLabel}
            </TabsTrigger>
            <TabsTrigger value="provenance" className={routeWorkbenchTabTriggerClassName}>
              {copy.runProvenanceTabLabel}
            </TabsTrigger>
            <TabsTrigger
              value="diagnostics"
              className={routeWorkbenchTabTriggerClassName}
              data-slot="run-detail-diagnostics-tab"
            >
              {copy.runDiagnosticsEventsTabLabel}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="summary" className="mt-2 space-y-4">
          <RunItineraryCard
            workspace={workspace}
            executor={executor}
            materializationEvidence={materializationEvidence}
            runControls={runControls}
          />

          <RunSnapshotSummary workspace={workspace} />

          <RunSnapshotFields workspace={workspace} executor={executor} />
        </TabsContent>

        <TabsContent value="result" className="mt-2 space-y-4">
          <RunResultPanel
            publication={snapshot.publication}
            evidence={materializationEvidence}
            durationLabel={
              materializationEvidence && formatDuration(materializationEvidence.durationMs)
            }
            locale={locale}
            publicationRows={publicationRows}
          />
        </TabsContent>

        <TabsContent value="provenance" className="mt-2 space-y-4">
          <RunPlanProvenance workspace={workspace} />

          <RunExecutionProvenance workspace={workspace} />
        </TabsContent>

        <RunDiagnosticsTab workspace={workspace} onRetryEventFeed={onRetryEventFeed} />
      </Tabs>
    </WorkbenchStateFrame>
  );
}

function RunItineraryScope({
  workspace,
  executor,
  materializationEvidence,
}: Readonly<{
  workspace: RunWorkspaceViewModel;
  executor: RunExecutor | undefined;
  materializationEvidence: MaterializationEvidence | undefined;
}>) {
  const { copy } = useRunStatesCopy();
  return (
    <>
      <RunFieldGrid
        fields={projectRunItineraryFields({ workspace, executor, materializationEvidence, copy })}
        className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2"
      />
      {!workspace.snapshot.planSummary ? (
        <p className="mt-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {copy.noPlanScopeEvidence}
        </p>
      ) : null}
    </>
  );
}

function RunSnapshotSummary({ workspace }: Readonly<{ workspace: RunWorkspaceViewModel }>) {
  const { copy } = useRunStatesCopy();
  const { snapshot, detailState } = workspace;
  return (
    <Card className="border-slate-700 bg-slate-900 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold">{copy.runtimeSnapshotTitle}</h2>
        <Badge className="bg-blue-600">{copy.statusLabels[snapshot.status]}</Badge>
        {snapshot.substatus ? <Badge variant="outline">{snapshot.substatus}</Badge> : null}
        <Badge variant="outline">
          {detailState === 'snapshot-plus-events'
            ? copy.snapshotTimelineBadge
            : copy.snapshotOnlyBadge}
        </Badge>
      </div>

      <p className="text-sm text-slate-300">{copy.snapshotReadModelNote}</p>

      {snapshot.message ? (
        <p className="mt-3 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
          {snapshot.message}
        </p>
      ) : null}
    </Card>
  );
}

function RunSnapshotFields({
  workspace,
  executor,
}: Readonly<{ workspace: RunWorkspaceViewModel; executor: RunExecutor | undefined }>) {
  const { copy, language: locale } = useRunStatesCopy();
  return (
    <Card data-slot="run-snapshot-fields-card" className="border-slate-700 bg-slate-900 p-5">
      <h3 className="mb-3 text-sm font-semibold">{copy.snapshotFieldsTitle}</h3>
      <RunFieldGrid
        fields={projectRunSnapshotFields({ workspace, executor, copy, locale })}
        className="grid gap-3 text-sm text-slate-300 md:grid-cols-2"
      />
    </Card>
  );
}

function RunAuthoringArtifact({ artifact }: Readonly<{ artifact: AuthoringArtifact }>) {
  const { copy } = useRunStatesCopy();
  return (
    <div
      key={`${artifact.title}-${artifact.repo}-${artifact.path}`}
      className="rounded border border-slate-700 bg-slate-950 p-3"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline">{artifact.title}</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <span className="text-slate-400">{copy.artifactRepoPathLabel}</span>
          <div className="break-all font-mono text-xs">
            {artifact.repo}:{artifact.path}
          </div>
        </div>
        {artifact.ref ? (
          <div>
            <span className="text-slate-400">{copy.artifactGitRefLabel}</span>
            <div className="break-all font-mono text-xs">{artifact.ref}</div>
          </div>
        ) : null}
        {artifact.commitSha ? (
          <div>
            <span className="text-slate-400">{copy.artifactCommitShaLabel}</span>
            <div className="break-all font-mono text-xs">{artifact.commitSha}</div>
          </div>
        ) : null}
        {artifact.contentSha256 ? (
          <div className="md:col-span-2">
            <span className="text-slate-400">{copy.artifactContentShaLabel}</span>
            <div className="break-all font-mono text-xs">{artifact.contentSha256}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RunPlanProvenance({ workspace }: Readonly<{ workspace: RunWorkspaceViewModel }>) {
  const { copy } = useRunStatesCopy();
  const planProvenance = workspace.snapshot.provenance;
  const authoringArtifacts = deriveAuthoringArtifacts(
    workspace,
    copy.graphArtifactTitle,
    copy.sqlArtifactTitle
  );
  return (
    <Card data-slot="run-plan-provenance-card" className="border-slate-700 bg-slate-900 p-5">
      <h3 className="mb-3 text-sm font-semibold">{copy.planProvenanceTitle}</h3>
      {planProvenance ? (
        <div className="space-y-4 text-sm text-slate-300">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0">
              <span className="text-slate-400">{copy.planRecordLabel}</span>
              <div data-slot="run-plan-record-value" className="break-all font-mono text-xs">
                {planProvenance.persistedPlan.planRecordId}
              </div>
            </div>
            <div>
              <span className="text-slate-400">{copy.planVersionLabel}</span>
              <div>{planProvenance.persistedPlan.planVersion}</div>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-400">{copy.planSourceRefLabel}</span>
              <div className="break-all font-mono text-xs">
                {planProvenance.persistedPlan.sourceRef}
              </div>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-400">{copy.canonicalPlanShaLabel}</span>
              <div className="break-all font-mono text-xs">
                {planProvenance.persistedPlan.canonicalPlanSha256}
              </div>
            </div>
          </div>

          {authoringArtifacts.length > 0 ? (
            <div className="space-y-3">
              {authoringArtifacts.map((artifact) => (
                <RunAuthoringArtifact
                  key={`${artifact.title}-${artifact.repo}-${artifact.path}`}
                  artifact={artifact}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{copy.noPlanProvenance}</p>
      )}
    </Card>
  );
}

function RunExecutionProvenance({ workspace }: Readonly<{ workspace: RunWorkspaceViewModel }>) {
  const { copy, language: locale } = useRunStatesCopy();
  const executionProvenance = deriveExecutionProvenance(workspace);
  return (
    <Card data-slot="run-execution-provenance-card" className="border-slate-700 bg-slate-900 p-5">
      <h3 className="mb-3 text-sm font-semibold">{copy.provenanceTitle}</h3>
      {executionProvenance.length > 0 ? (
        <div className="space-y-3">
          {executionProvenance.map((artifact) => (
            <div
              key={`${artifact.stepId}-${artifact.storageUri}-${artifact.sha256}`}
              className="rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-300"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{copy.stepLabel.replace(':', '')}</Badge>
                <span className="font-mono text-xs">{artifact.stepId}</span>
                <Badge variant="outline">{artifact.artifactKind}</Badge>
                <span className="text-xs text-slate-400">
                  {new Date(artifact.emittedAt).toLocaleString(locale)}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <span className="text-slate-400">{copy.artifactKindLabel}</span>
                  <div>{artifact.artifactKind}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.artifactSizeLabel}</span>
                  <div>{formatByteSize(artifact.sizeBytes)}</div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-400">{copy.artifactUriLabel}</span>
                  <div className="break-all font-mono text-xs">{artifact.storageUri}</div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-slate-400">{copy.artifactShaLabel}</span>
                  <div className="break-all font-mono text-xs">{artifact.sha256}</div>
                </div>
                {artifact.encoding ? (
                  <div>
                    <span className="text-slate-400">{copy.artifactEncodingLabel}</span>
                    <div>{artifact.encoding}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">{copy.noProvenanceEvidence}</p>
      )}
    </Card>
  );
}

function RunFailureDiagnostics({ workspace }: Readonly<{ workspace: RunWorkspaceViewModel }>) {
  const { copy, language: locale } = useRunStatesCopy();
  const failureDiagnostics = deriveFailureDiagnostics(workspace);
  return (
    <>
      {' '}
      {failureDiagnostics.failedStepId ||
      failureDiagnostics.errorReason ||
      failureDiagnostics.failureEmittedAt ? (
        <Card className="border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.failureDiagnosticsTitle}</h3>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            {failureDiagnostics.failedStepId ? (
              <div>
                <span className="text-slate-400">{copy.failedStepLabel}</span>
                <div className="font-mono">{failureDiagnostics.failedStepId}</div>
              </div>
            ) : null}
            {failureDiagnostics.errorReason ? (
              <div>
                <span className="text-slate-400">{copy.errorReasonLabel}</span>
                <div>{failureDiagnostics.errorReason}</div>
              </div>
            ) : null}
            {failureDiagnostics.failureEmittedAt ? (
              <div>
                <span className="text-slate-400">{copy.failedAtLabel}</span>
                <div>{new Date(failureDiagnostics.failureEmittedAt).toLocaleString(locale)}</div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </>
  );
}

function RunDiagnosticsTab({
  workspace,
  onRetryEventFeed,
}: Pick<RunWorkspaceStateProps, 'workspace' | 'onRetryEventFeed'>) {
  const { copy } = useRunStatesCopy();
  const { snapshot, timeline } = workspace;
  return (
    <TabsContent value="diagnostics" className="mt-2 space-y-4">
      {snapshot.diagnostics ? <RunDiagnosticsCard diagnostics={snapshot.diagnostics} /> : null}

      <RunFailureDiagnostics workspace={workspace} />

      <Card className="border-slate-700 bg-slate-900 p-5">
        <h3 className="mb-3 text-sm font-semibold">{copy.eventTimelineTitle}</h3>

        <RunEventFeedHealthView
          copy={copy.eventFeedHealth}
          health={workspace.eventFeedHealth}
          onRetry={onRetryEventFeed}
        />

        {timeline.state === 'empty' ? (
          <p className="text-sm text-slate-400">{copy.emptyTimeline}</p>
        ) : null}

        {timeline.state === 'available' ? <RunEventTimelineTable events={timeline.events} /> : null}
      </Card>
    </TabsContent>
  );
}

function readStepArtifact(
  event: RunWorkspaceViewModel['timeline']['events'][number]
): ProvenanceArtifact | null {
  if (event.eventType !== 'StepStarted') return null;
  if (!event.stepId) return null;
  if (!isRecord(event.payload)) return null;
  const payload = event.payload.stepArtifactRef;
  if (!isRecord(payload)) return null;
  const fields = readArtifactFields(payload);
  if (!fields) return null;
  if (typeof payload.artifactKind !== 'string') return null;
  return {
    stepId: event.stepId,
    emittedAt: event.emittedAt,
    artifactKind: payload.artifactKind,
    ...fields,
  };
}

function RunFieldGrid({
  fields,
  className,
}: Readonly<{
  fields: readonly Readonly<{
    label: string;
    value: ReactNode;
    rowClassName?: string;
    valueClassName?: string;
  }>[];
  className: string;
}>) {
  return (
    <div className={className}>
      {fields.map((field) =>
        field.value === undefined ? null : (
          <div key={field.label} className={field.rowClassName}>
            <span className="text-slate-400">{field.label}</span>
            <div className={field.valueClassName}>{field.value}</div>
          </div>
        )
      )}
    </div>
  );
}

function projectRunSnapshotFields({
  workspace,
  executor,
  copy,
  locale,
}: Readonly<{
  workspace: RunWorkspaceViewModel;
  executor: RunExecutor | undefined;
  copy: ReturnType<typeof useRunStatesCopy>['copy'];
  locale: string;
}>) {
  const { snapshot } = workspace;
  const step = [snapshot.currentStepId, snapshot.execution?.activeStepId].find(isKnownRunField);
  return [
    {
      label: copy.startedLabel,
      value: snapshot.startedAt
        ? new Date(snapshot.startedAt).toLocaleString(locale)
        : copy.scopeUnavailable,
    },
    {
      label: copy.completedLabel,
      value: snapshot.completedAt
        ? new Date(snapshot.completedAt).toLocaleString(locale)
        : undefined,
    },
    {
      label: copy.environmentLabel,
      value: isKnownRunField(snapshot.environment) ? snapshot.environment : undefined,
    },
    { label: copy.executorLabel, value: executor },
    {
      label: copy.durationLabel,
      value:
        snapshot.durationMs === undefined
          ? copy.scopeUnavailable
          : (snapshot.durationMs / 1000).toFixed(1) + ' s',
    },
    {
      label: copy.gitShaLabel,
      value: isKnownRunField(snapshot.gitSha) ? snapshot.gitSha : undefined,
      valueClassName: 'font-mono',
    },
    { label: copy.currentStepLabel, value: step, valueClassName: 'font-mono' },
    {
      label: copy.snapshotHashLabel,
      value: isKnownRunField(snapshot.hash) ? snapshot.hash : undefined,
      rowClassName: 'md:col-span-2',
      valueClassName: 'break-all font-mono text-xs',
    },
  ];
}

function projectRunItineraryFields({
  workspace,
  executor,
  materializationEvidence,
  copy,
}: Readonly<{
  workspace: RunWorkspaceViewModel;
  executor: RunExecutor | undefined;
  materializationEvidence: MaterializationEvidence | undefined;
  copy: ReturnType<typeof useRunStatesCopy>['copy'];
}>) {
  const { snapshot } = workspace;
  const summary = snapshot.planSummary;
  const context = resolveRunItineraryExecutionContext({
    summary,
    executor,
    materializationEvidence,
    environment: snapshot.environment,
    unavailable: copy.scopeUnavailable,
  });
  return [
    {
      label: copy.planLabel,
      value: snapshot.planId ?? copy.scopeUnavailable,
      valueClassName: 'break-all font-mono text-xs',
    },
    { label: copy.executorLabel, value: context.executor },
    { label: copy.environmentLabel, value: context.environment },
    {
      label: copy.stepsLabel,
      value: summary
        ? summary.stepCount +
          ' ' +
          copy.stepsUnit +
          ' / ' +
          summary.nodeCount +
          ' ' +
          copy.nodesUnit
        : copy.scopeUnavailable,
    },
    {
      label: copy.sourceTablesLabel,
      value: formatRunScopeList(summary?.sourceTables, copy.scopeUnavailable),
      valueClassName: 'break-all font-mono text-xs',
    },
    {
      label: copy.sinkTablesLabel,
      value: resolveRunSinkScope(summary, materializationEvidence, copy.scopeUnavailable),
      valueClassName: 'break-all font-mono text-xs',
    },
  ];
}

function resolveRunItineraryExecutionContext({
  summary,
  executor,
  materializationEvidence,
  environment,
  unavailable,
}: Readonly<{
  summary: RunPlanExecutionSummary | undefined;
  executor: RunExecutor | undefined;
  materializationEvidence: MaterializationEvidence | undefined;
  environment: string | undefined;
  unavailable: string;
}>) {
  return {
    executor:
      [summary?.executor, executor, materializationEvidence?.executor].find(
        (value) => value != null
      ) ?? unavailable,
    environment:
      [materializationEvidence?.environmentId, environment].find((value) => value != null) ??
      unavailable,
  };
}

function resolveRunSinkScope(
  summary: RunPlanExecutionSummary | undefined,
  materializationEvidence: MaterializationEvidence | undefined,
  unavailable: string
): string {
  return formatRunScopeList(summary?.sinkTables, materializationEvidence?.sinkTable ?? unavailable);
}
