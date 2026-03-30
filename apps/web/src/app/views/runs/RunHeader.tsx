import { Clock, GitCommit, Pause, StopCircle } from 'lucide-react';

import type { Run } from '../../types/dbt';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../components/ui/utils';

type RunHeaderProps = {
  run: Run;
  completedSteps: number;
  totalSteps: number;
  progress: number;
};

export default function RunHeader({ run, completedSteps, totalSteps, progress }: RunHeaderProps) {
  return (
    <div className="bg-slate-900 border-b border-slate-700">
      <div className="px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold">Run {run.runId}</h1>
              <Badge
                className={cn(
                  run.status === 'completed' && 'bg-green-600',
                  run.status === 'running' && 'bg-blue-600 animate-pulse',
                  run.status === 'failed' && 'bg-red-600'
                )}
              >
                {run.status}
              </Badge>
            </div>
            <div className="flex gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-1">
                <GitCommit className="size-4" />
                {run.gitSha}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="size-4" />
                Started {new Date(run.startTime).toLocaleString()}
              </div>
              <div>Environment: {run.environment}</div>
            </div>
          </div>

          <div className="flex gap-2">
            {run.status === 'running' && (
              <>
                <Button variant="outline" size="sm">
                  <Pause className="size-4 mr-2" />
                  Pause
                </Button>
                <Button variant="outline" size="sm">
                  <StopCircle className="size-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm text-slate-300 mb-2">
            <span>
              {completedSteps} of {totalSteps} steps completed
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </div>
  );
}
