import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import type { Run } from '../../../types/dbt';
import { RunStatCard, RunSurfaceCard } from './RunTabPrimitives';

type RunStepsTabProps = {
  run: Run;
  completedSteps: number;
};

export default function RunStepsTab({ run, completedSteps }: Readonly<RunStepsTabProps>) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <RunStatCard
          icon={<CheckCircle2 className="size-5" />}
          value={completedSteps}
          label="Successful"
          valueClassName="text-green-400"
        />
        <RunStatCard
          icon={<XCircle className="size-5" />}
          value={0}
          label="Failed"
          valueClassName="text-red-400"
        />
        <RunStatCard
          icon={<AlertCircle className="size-5" />}
          value={0}
          label="Warnings"
          valueClassName="text-yellow-400"
        />
      </div>

      <div className="space-y-2">
        {run.steps.flatMap((step) =>
          step.nodes.map((nodeId) => (
            <RunSurfaceCard key={nodeId} className="p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">{nodeId}</div>
                <Badge className="bg-green-600">Success</Badge>
              </div>
            </RunSurfaceCard>
          ))
        )}
      </div>
    </>
  );
}
