import { Clock, GitCommit } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { RunSummaryItem } from '../../ports/runs';
import { RunStateFrame } from './RunStateFrame';
import { runStatesCopy as copy } from './runStatesCopy';
import { getRunStatusTone, isKnownRunField } from './runStatesModel';

type RunListStateProps = {
  runs: RunSummaryItem[];
  isLoading?: boolean;
};

export function RunListStateView({ runs, isLoading }: RunListStateProps) {
  const navigate = useNavigate();
  return (
    <RunStateFrame title={copy.runsTitle}>
      <div className="mx-auto max-w-4xl space-y-4">
        {isLoading ? <p className="text-sm text-slate-400">{copy.loadingRuns}</p> : null}
        {!isLoading && runs.length === 0 ? (
          <Card className="border-slate-700 bg-slate-900 p-8 text-center">
            <p className="mb-3 text-sm text-slate-400">{copy.emptyRuns}</p>
            <Link to="/canvas" className="text-sm text-blue-400 underline underline-offset-2">
              {copy.emptyRunsLink}
            </Link>
          </Card>
        ) : null}

        {runs.map((runRecord) => (
          <Card
            key={runRecord.runId}
            className="cursor-pointer border-slate-700 bg-slate-900 p-4 transition-colors hover:border-slate-600"
            onClick={() => {
              void navigate(`/runs/${runRecord.runId}`);
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="font-semibold">Run {runRecord.runId}</h3>
                  <Badge className={cn(getRunStatusTone(runRecord.status))}>
                    {runRecord.status}
                  </Badge>
                  {runRecord.substatus ? (
                    <Badge variant="outline">{runRecord.substatus}</Badge>
                  ) : null}
                </div>
                <div className="flex gap-4 text-sm text-slate-300">
                  {isKnownRunField(runRecord.gitSha) ? (
                    <div className="flex items-center gap-1">
                      <GitCommit className="size-3" />
                      {runRecord.gitSha}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(runRecord.startedAt).toLocaleString()}
                  </div>
                  {isKnownRunField(runRecord.environment) ? (
                    <div>
                      {copy.environmentLabel} {runRecord.environment}
                    </div>
                  ) : null}
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
                {copy.viewDetails}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </RunStateFrame>
  );
}
