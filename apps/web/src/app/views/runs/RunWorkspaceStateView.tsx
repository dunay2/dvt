import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import { RunStateFrame } from './RunStateFrame';
import { runStatesCopy as copy } from './runStatesCopy';
import { getDetailStateBadge, isKnownRunField } from './runStatesModel';

type RunWorkspaceStateProps = {
  workspace: RunWorkspaceViewModel;
};

export function RunWorkspaceStateView({ workspace }: RunWorkspaceStateProps) {
  const { snapshot, timeline, detailState } = workspace;
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
            {snapshot.hash ? (
              <div className="md:col-span-2">
                <span className="text-slate-400">{copy.snapshotHashLabel}</span>
                <div className="break-all font-mono text-xs">{snapshot.hash}</div>
              </div>
            ) : null}
          </div>
        </Card>

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
              {timeline.events.map((event) => (
                <div
                  key={event.eventId}
                  className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{event.eventType}</span>
                    <span className="text-slate-400">{new Date(event.emittedAt).toLocaleString()}</span>
                  </div>
                  {event.stepId ? (
                    <div className="mt-1 text-slate-400">
                      {copy.stepLabel} {event.stepId}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      </div>
    </RunStateFrame>
  );
}
