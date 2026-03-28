import { Clock, GitCommit } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import type { Run } from '../../types/dbt';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';

type RunListStateProps = {
  runs: Run[];
  isLoading?: boolean;
};

export function RunListState({ runs, isLoading }: RunListStateProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
        <h1 className="text-lg font-semibold">Runs</h1>
      </div>
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {isLoading && (
            <p className="text-sm text-slate-400">Loading runs…</p>
          )}

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
              onClick={() => navigate(`/runs/${runRecord.runId}`)}
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
                  </div>
                  <div className="flex gap-4 text-sm text-slate-300">
                    <div className="flex items-center gap-1">
                      <GitCommit className="size-3" />
                      {runRecord.gitSha}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {new Date(runRecord.startTime).toLocaleString()}
                    </div>
                    <div>Environment: {runRecord.environment}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/runs/${runRecord.runId}`); }}>
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
