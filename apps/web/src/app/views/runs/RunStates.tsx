import { Clock, GitCommit } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import type { RunSummaryItem } from '../../services/runs/runsService';

type RunListStateProps = {
  runs: RunSummaryItem[];
  isLoading?: boolean;
};

function isKnownValue(value: string | undefined): value is string {
  return Boolean(value && value !== 'unknown' && value !== 'unknown-plan');
}

export function RunListState({ runs, isLoading }: RunListStateProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Runs</h1>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoading && <p className="text-sm text-slate-400">Loading runs...</p>}

          {!isLoading && runs.length === 0 && (
            <Card className="bg-slate-900 border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400 mb-3">No runs yet.</p>
              <Link to="/canvas" className="text-sm text-blue-400 underline underline-offset-2">
                Go to canvas to plan and start a run
              </Link>
            </Card>
          )}

          {runs.map((runRecord) => (
            <Card
              key={runRecord.runId}
              className="bg-slate-900 border-slate-700 p-4 hover:border-slate-600 cursor-pointer transition-colors"
              onClick={() => {
                void navigate(`/runs/${runRecord.runId}`);
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">Run {runRecord.runId}</h3>
                    <Badge
                      className={cn(
                        runRecord.status === 'completed' && 'bg-green-600',
                        runRecord.status === 'running' && 'bg-blue-600',
                        runRecord.status === 'failed' && 'bg-red-600'
                      )}
                    >
                      {runRecord.status}
                    </Badge>
                    {runRecord.substatus && <Badge variant="outline">{runRecord.substatus}</Badge>}
                  </div>
                  <div className="flex gap-4 text-sm text-slate-300">
                    {isKnownValue(runRecord.gitSha) && (
                      <div className="flex items-center gap-1">
                        <GitCommit className="size-3" />
                        {runRecord.gitSha}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(runRecord.startedAt).toLocaleString()}
                    </div>
                    {isKnownValue(runRecord.environment) && (
                      <div>Environment: {runRecord.environment}</div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigate(`/runs/${runRecord.runId}`);
                  }}
                >
                  View Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

type RunNotFoundStateProps = {
  runId: string;
};

export function RunNotFoundState({ runId }: RunNotFoundStateProps) {
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Runs</h1>
      </div>
      <div className="flex-1 p-6">
        <Card className="max-w-xl mx-auto bg-slate-900 border-slate-700 p-5">
          <h2 className="text-base font-semibold mb-2">Run not found</h2>
          <p className="text-sm text-slate-300">
            No data is available for run <span className="font-mono">{runId}</span>.
          </p>
        </Card>
      </div>
    </div>
  );
}

type RunDetailLoadingStateProps = {
  runId: string;
};

export function RunDetailLoadingState({ runId }: RunDetailLoadingStateProps) {
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Run {runId}</h1>
      </div>
      <div className="flex-1 p-6">
        <Card className="max-w-xl mx-auto bg-slate-900 border-slate-700 p-5 text-sm text-slate-300">
          Loading run workspace...
        </Card>
      </div>
    </div>
  );
}

type RunDetailErrorStateProps = {
  runId: string;
  message: string;
};

export function RunDetailErrorState({ runId, message }: RunDetailErrorStateProps) {
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Run {runId}</h1>
      </div>
      <div className="flex-1 p-6">
        <Card className="max-w-xl mx-auto bg-red-950/30 border-red-900 p-5">
          <h2 className="text-base font-semibold mb-2 text-red-200">Run workspace unavailable</h2>
          <p className="text-sm text-red-100">{message}</p>
        </Card>
      </div>
    </div>
  );
}

type RunWorkspaceStateProps = {
  workspace: RunWorkspaceViewModel;
};

export function RunWorkspaceState({ workspace }: RunWorkspaceStateProps) {
  const { snapshot, timeline, detailState } = workspace;
  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Run {snapshot.runId}</h1>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <Card className="bg-slate-900 border-slate-700 p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Runtime snapshot</h2>
              <Badge className="bg-blue-600">{snapshot.status}</Badge>
              {snapshot.substatus && <Badge variant="outline">{snapshot.substatus}</Badge>}
              <Badge variant="outline">
                {detailState === 'snapshot-plus-events' ? 'snapshot+timeline' : 'snapshot-only'}
              </Badge>
            </div>

            <p className="text-sm text-slate-300">
              This route consumes explicit runtime read models. It does not fabricate step or
              artifact detail from snapshot payloads.
            </p>

            {snapshot.message && (
              <p className="mt-3 rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200">
                {snapshot.message}
              </p>
            )}
          </Card>

          <Card className="bg-slate-900 border-slate-700 p-5">
            <h3 className="text-sm font-semibold mb-3">Snapshot fields</h3>
            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <span className="text-slate-400">Started</span>
                <div>{new Date(snapshot.startedAt).toLocaleString()}</div>
              </div>
              {snapshot.completedAt && (
                <div>
                  <span className="text-slate-400">Completed</span>
                  <div>{new Date(snapshot.completedAt).toLocaleString()}</div>
                </div>
              )}
              {isKnownValue(snapshot.environment) && (
                <div>
                  <span className="text-slate-400">Environment</span>
                  <div>{snapshot.environment}</div>
                </div>
              )}
              {isKnownValue(snapshot.gitSha) && (
                <div>
                  <span className="text-slate-400">Git SHA</span>
                  <div className="font-mono">{snapshot.gitSha}</div>
                </div>
              )}
              {snapshot.hash && (
                <div className="md:col-span-2">
                  <span className="text-slate-400">Snapshot hash</span>
                  <div className="font-mono text-xs break-all">{snapshot.hash}</div>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-slate-900 border-slate-700 p-5">
            <h3 className="text-sm font-semibold mb-3">Event timeline</h3>

            {timeline.state === 'degraded' && (
              <div className="rounded border border-yellow-900 bg-yellow-950/30 px-3 py-2 text-sm text-yellow-100">
                {timeline.message}
              </div>
            )}

            {timeline.state === 'empty' && (
              <p className="text-sm text-slate-400">
                No runtime events are available yet for this run.
              </p>
            )}

            {timeline.state === 'available' && (
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
                    {event.stepId && <div className="mt-1 text-slate-400">Step: {event.stepId}</div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
