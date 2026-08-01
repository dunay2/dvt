/**
 * Owned concern: render the run workspace detail, provenance, materialization,
 * diagnostics, and timeline read model.
 */
import { ArrowLeft, ListChecks } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { WorkbenchStateFrame } from '../../components/workbench/state/WorkbenchStates';
import type {
  MaterializationEvidence,
  RunDiagnostics,
  RunExecutor,
  RunPlanExecutionSummary,
} from '../../ports/runs';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceModel';
import { RunDegradedStateView } from './RunDetailStateViews';
import { RunEventTimelineTable } from './RunEventTimelineTable';
import { runStatesCopy as copy } from './runStatesCopy';
import { getDetailStateBadge, isKnownRunField } from './runStatesModel';

type RunWorkspaceStateProps = {
  workspace: RunWorkspaceViewModel;
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

function formatRunScopeList(values: readonly string[] | undefined): string {
  return values && values.length > 0 ? values.join(', ') : copy.scopeUnavailable;
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

  if (
    typeof storageUri !== 'string' ||
    typeof sha256 !== 'string' ||
    typeof sizeBytes !== 'number' ||
    !Number.isFinite(sizeBytes)
  ) {
    return null;
  }

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
    if (event.eventType !== 'StepStarted' || !event.stepId || !isRecord(event.payload)) {
      continue;
    }

    const stepArtifactPayload = isRecord(event.payload.stepArtifactRef)
      ? event.payload.stepArtifactRef
      : null;
    const stepArtifactRef = readArtifactFields(stepArtifactPayload);
    const compiledCodeRef = stepArtifactRef
      ? null
      : readArtifactFields(event.payload.compiledCodeRef);

    const artifact =
      stepArtifactRef && typeof stepArtifactPayload?.artifactKind === 'string'
        ? {
            artifactKind: stepArtifactPayload.artifactKind,
            ...stepArtifactRef,
          }
        : compiledCodeRef
          ? {
              artifactKind: copy.compiledCodeArtifactKind,
              ...compiledCodeRef,
            }
          : null;

    if (!artifact) {
      continue;
    }

    const dedupeKey = `${event.stepId}|${artifact.storageUri}|${artifact.sha256}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);

    provenance.push({
      stepId: event.stepId,
      emittedAt: event.emittedAt,
      ...artifact,
    });
  }

  return provenance;
}

function deriveAuthoringArtifacts(workspace: RunWorkspaceViewModel): AuthoringArtifact[] {
  const authoring = workspace.snapshot.provenance?.authoring;
  const artifacts: AuthoringArtifact[] = [];

  if (authoring?.graphArtifact) {
    artifacts.push({
      title: copy.graphArtifactTitle,
      ...authoring.graphArtifact,
    });
  }

  if (authoring?.sqlArtifact) {
    artifacts.push({
      title: copy.sqlArtifactTitle,
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
}: Readonly<{
  workspace: RunWorkspaceViewModel;
  executor: RunExecutor | undefined;
  materializationEvidence: MaterializationEvidence | undefined;
}>) {
  const { snapshot } = workspace;
  const planSummary: RunPlanExecutionSummary | undefined = snapshot.planSummary;
  const sinkScope =
    planSummary?.sinkTables && planSummary.sinkTables.length > 0
      ? formatRunScopeList(planSummary.sinkTables)
      : (materializationEvidence?.sinkTable ?? copy.scopeUnavailable);

  return (
    <Card data-slot="run-itinerary-card" className="border-slate-700 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{copy.runItineraryTitle}</h2>
            <Badge className="bg-blue-600">{snapshot.status}</Badge>
          </div>
          <p className="text-sm text-slate-300">{copy.runItineraryNote}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/canvas">
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
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
        <div>
          <span className="text-slate-400">{copy.planLabel}</span>
          <div className="break-all font-mono text-xs">
            {snapshot.planId ?? copy.scopeUnavailable}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.executorLabel}</span>
          <div>
            {planSummary?.executor ??
              executor ??
              materializationEvidence?.executor ??
              copy.scopeUnavailable}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.environmentLabel}</span>
          <div>
            {materializationEvidence?.environmentId ??
              snapshot.environment ??
              copy.scopeUnavailable}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.stepsLabel}</span>
          <div>
            {planSummary
              ? `${planSummary.stepCount} ${copy.stepsUnit} / ${planSummary.nodeCount} ${copy.nodesUnit}`
              : copy.scopeUnavailable}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.sourceTablesLabel}</span>
          <div className="break-all font-mono text-xs">
            {formatRunScopeList(planSummary?.sourceTables)}
          </div>
        </div>
        <div>
          <span className="text-slate-400">{copy.sinkTablesLabel}</span>
          <div className="break-all font-mono text-xs">{sinkScope}</div>
        </div>
      </div>
      {!planSummary ? (
        <p className="mt-4 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {copy.noPlanScopeEvidence}
        </p>
      ) : null}
    </Card>
  );
}

function RunDiagnosticsCard({
  diagnostics,
}: Readonly<{
  diagnostics: RunDiagnostics;
}>) {
  const fields = [
    [copy.diagnosticsRunIdLabel, diagnostics.runId, true],
    [copy.diagnosticsPlanIdLabel, diagnostics.planId, true],
    [copy.diagnosticsPlanShaLabel, diagnostics.planSha, true],
    [copy.diagnosticsStepIdLabel, diagnostics.stepId, true],
    [copy.diagnosticsAttemptIdLabel, diagnostics.attemptId, true],
    [copy.diagnosticsAdapterLabel, diagnostics.adapter, false],
    [copy.durationLabel, diagnostics.durationMs, false],
    [copy.diagnosticsStatusLabel, diagnostics.status, false],
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
              <Badge variant="outline">{pointer.label}</Badge>
              <div className="mt-2 break-all font-mono text-xs">{pointer.value}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function RunWorkspaceStateView({ workspace }: RunWorkspaceStateProps) {
  const { snapshot, timeline, detailState } = workspace;
  const executor = deriveExecutor(workspace);
  const failureDiagnostics = deriveFailureDiagnostics(workspace);
  const planProvenance = snapshot.provenance;
  const authoringArtifacts = deriveAuthoringArtifacts(workspace);
  const executionProvenance = deriveExecutionProvenance(workspace);
  const materializationEvidence = deriveMaterializationEvidence(workspace);
  const showMaterializationSection = snapshot.status === 'completed';

  return (
    <WorkbenchStateFrame title={`Run ${snapshot.runId}`} slotPrefix="runs-state">
      <div className="mx-auto max-w-4xl space-y-4">
        <RunItineraryCard
          workspace={workspace}
          executor={executor}
          materializationEvidence={materializationEvidence}
        />

        <Card className="border-slate-700 bg-slate-900 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{copy.runtimeSnapshotTitle}</h2>
            <Badge className="bg-blue-600">{snapshot.status}</Badge>
            {snapshot.substatus ? <Badge variant="outline">{snapshot.substatus}</Badge> : null}
            <Badge variant="outline">{getDetailStateBadge(detailState)}</Badge>
          </div>

          <p className="text-sm text-slate-300">{copy.snapshotReadModelNote}</p>

          {snapshot.message ? (
            <p className="mt-3 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
              {snapshot.message}
            </p>
          ) : null}
        </Card>

        <Card data-slot="run-snapshot-fields-card" className="border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.snapshotFieldsTitle}</h3>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div>
              <span className="text-slate-400">{copy.startedLabel}</span>
              <div>
                {snapshot.startedAt
                  ? new Date(snapshot.startedAt).toLocaleString()
                  : copy.scopeUnavailable}
              </div>
            </div>
            {snapshot.completedAt ? (
              <div>
                <span className="text-slate-400">{copy.completedLabel}</span>
                <div>{new Date(snapshot.completedAt).toLocaleString()}</div>
              </div>
            ) : null}
            {isKnownRunField(snapshot.environment) ? (
              <div>
                <span className="text-slate-400">{copy.environmentLabel}</span>
                <div>{snapshot.environment}</div>
              </div>
            ) : null}
            {executor ? (
              <div>
                <span className="text-slate-400">{copy.executorLabel}</span>
                <div>{executor}</div>
              </div>
            ) : null}
            <div>
              <span className="text-slate-400">{copy.durationLabel}</span>
              <div>
                {snapshot.durationMs === undefined
                  ? copy.scopeUnavailable
                  : `${(snapshot.durationMs / 1000).toFixed(1)} s`}
              </div>
            </div>
            {isKnownRunField(snapshot.gitSha) ? (
              <div>
                <span className="text-slate-400">{copy.gitShaLabel}</span>
                <div className="font-mono">{snapshot.gitSha}</div>
              </div>
            ) : null}
            {isKnownRunField(snapshot.currentStepId) ? (
              <div>
                <span className="text-slate-400">{copy.currentStepLabel}</span>
                <div className="font-mono">{snapshot.currentStepId}</div>
              </div>
            ) : isKnownRunField(snapshot.execution?.activeStepId) ? (
              <div>
                <span className="text-slate-400">{copy.currentStepLabel}</span>
                <div className="font-mono">{snapshot.execution?.activeStepId}</div>
              </div>
            ) : null}
            {isKnownRunField(snapshot.hash) ? (
              <div className="md:col-span-2">
                <span className="text-slate-400">{copy.snapshotHashLabel}</span>
                <div className="break-all font-mono text-xs">{snapshot.hash}</div>
              </div>
            ) : null}
          </div>
        </Card>

        {snapshot.diagnostics ? <RunDiagnosticsCard diagnostics={snapshot.diagnostics} /> : null}

        {showMaterializationSection ? (
          <Card data-slot="run-materialization-card" className="border-slate-700 bg-slate-900 p-5">
            <h3 className="mb-3 text-sm font-semibold">{copy.materializationTitle}</h3>
            {materializationEvidence ? (
              <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <div>
                  <span className="text-slate-400">{copy.executorLabel}</span>
                  <div>{materializationEvidence.executor}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.environmentLabel}</span>
                  <div>{materializationEvidence.environmentId}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.sinkTableLabel}</span>
                  <div className="font-mono">{materializationEvidence.sinkTable}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.rowsWrittenLabel}</span>
                  <div>{materializationEvidence.rowsWritten.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.startedLabel}</span>
                  <div>{new Date(materializationEvidence.startedAt).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.completedLabel}</span>
                  <div>{new Date(materializationEvidence.completedAt).toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-slate-400">{copy.durationLabel}</span>
                  <div>{formatDuration(materializationEvidence.durationMs)}</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">{copy.noResultEvidence}</p>
            )}
          </Card>
        ) : null}

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
                            <div className="break-all font-mono text-xs">
                              {artifact.contentSha256}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-400">{copy.noPlanProvenance}</p>
          )}
        </Card>

        <Card
          data-slot="run-execution-provenance-card"
          className="border-slate-700 bg-slate-900 p-5"
        >
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
                      {new Date(artifact.emittedAt).toLocaleString()}
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
                  <div>{new Date(failureDiagnostics.failureEmittedAt).toLocaleString()}</div>
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card className="border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.eventTimelineTitle}</h3>

          {timeline.state === 'degraded' ? (
            <RunDegradedStateView message={timeline.message} />
          ) : null}

          {timeline.state === 'empty' ? (
            <p className="text-sm text-slate-400">{copy.emptyTimeline}</p>
          ) : null}

          {timeline.state === 'available' ? (
            <RunEventTimelineTable events={timeline.events} />
          ) : null}
        </Card>
      </div>
    </WorkbenchStateFrame>
  );
}
