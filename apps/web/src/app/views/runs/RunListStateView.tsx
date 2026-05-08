/**
 * Owned concern: render the runs summary list view using shared workbench state
 * primitives, badges, and route navigation.
 */
import { Clock, GitCommit } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import {
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { WorkbenchStateFrame } from '../../components/workbench/state/WorkbenchStates';
import type { RunSummaryItem } from '../../ports/runs';
import { runStatesCopy as copy } from './runStatesCopy';
import { getRunStatusTone, isKnownRunField } from './runStatesModel';

type RunListStateProps = {
  runs: RunSummaryItem[];
  isLoading?: boolean;
};

export function RunListStateView({ runs, isLoading }: RunListStateProps) {
  const navigate = useNavigate();
  return (
    <WorkbenchStateFrame title={copy.runsTitle} slotPrefix="runs-state">
      <div className="mx-auto max-w-4xl space-y-4">
        {isLoading ? (
          <p className={cn('text-sm', routeWorkbenchMutedTextClassName)}>{copy.loadingRuns}</p>
        ) : null}

        {runs.map((runRecord) => (
          <Card
            key={runRecord.runId}
            className={cn(
              routeWorkbenchPanelClassName,
              'cursor-pointer p-4 transition-colors hover:border-[color:var(--border-strong)]'
            )}
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
                <div className={cn('flex gap-4 text-sm', routeWorkbenchMutedTextClassName)}>
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
    </WorkbenchStateFrame>
  );
}
