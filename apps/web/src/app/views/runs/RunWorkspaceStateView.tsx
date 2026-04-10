import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import type { MaterializationEvidence } from '../../ports/runs';
import { resolveRunEventHeadline } from '../../services/runs/runEventPresentationCopy';
import { buildRunEventPresentationModel } from '../../services/runs/runEventPresentationModel';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import { RunStateFrame } from './RunStateFrame';
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
  return workspace.snapshot.materialization ?? workspace.snapshot.execution?.materialization;
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

export function RunWorkspaceStateView({ workspace }: RunWorkspaceStateProps) {
  const { snapshot, timeline, detailState } = workspace;
  const failureDiagnostics = deriveFailureDiagnostics(workspace);
  const executionProvenance = deriveExecutionProvenance(workspace);
  const materializationEvidence = deriveMaterializationEvidence(workspace);

  return (
    <RunStateFrame title={`Run ${snapshot.runId}`}>
      <div className="mx-auto max-w-4xl space-y-4">
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

        <Card className="border-slate-700 bg-slate-900 p-5">
          <h3 className="mb-3 text-sm font-semibold">{copy.snapshotFieldsTitle}</h3>
          <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div>
              <span className="text-slate-400">{copy.startedLabel}</span>
              <div>{new Date(snapshot.startedAt).toLocaleString()}</div>
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

        <Card className="border-slate-700 bg-slate-900 p-5">
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

        <Card className="border-slate-700 bg-slate-900 p-5">
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
            <div className="rounded border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-100">
              {timeline.message}
            </div>
          ) : null}

          {timeline.state === 'empty' ? (
            <p className="text-sm text-slate-400">{copy.emptyTimeline}</p>
          ) : null}

          {timeline.state === 'available' ? (
            <div className="space-y-2">
              {timeline.events.map((event) => {
                const presentation = buildRunEventPresentationModel(event);
                const headline = resolveRunEventHeadline(
                  presentation.headlineKey,
                  presentation.fallbackHeadline
                );
                return (
                  <div
                    key={event.eventId}
                    className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{event.eventType}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                          {presentation.level}
                        </Badge>
                      </div>
                      <span className="text-slate-400">
                        {new Date(event.emittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-1">{headline}</div>
                    {presentation.detail ? (
                      <div className="mt-1 text-slate-300">{presentation.detail}</div>
                    ) : null}
                    {presentation.stepId ? (
                      <div className="mt-1 text-slate-400">
                        {copy.stepLabel} {presentation.stepId}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>
      </div>
    </RunStateFrame>
  );
}
