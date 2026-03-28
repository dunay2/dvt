import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../components/ui/utils';
import type { Run } from '../../../types/dbt';

type RunStepsTabProps = {
  run: Run;
  completedSteps: number;
};

type MetricCardProps = {
  icon: ReactNode;
  value: number;
  label: string;
  colorClassName: string;
};

function MetricCard({ icon, value, label, colorClassName }: MetricCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-700 p-4">
      <div className={cn('flex items-center gap-2 mb-2', colorClassName)}>
        {icon}
        <span className="text-2xl font-semibold">{value}</span>
      </div>
      <p className="text-sm text-slate-300">{label}</p>
    </Card>
  );
}

export default function RunStepsTab({ run, completedSteps }: RunStepsTabProps) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon={<CheckCircle2 className="size-5" />}
          value={completedSteps}
          label="Successful"
          colorClassName="text-green-400"
        />
        <MetricCard
          icon={<XCircle className="size-5" />}
          value={0}
          label="Failed"
          colorClassName="text-red-400"
        />
        <MetricCard
          icon={<AlertCircle className="size-5" />}
          value={0}
          label="Warnings"
          colorClassName="text-yellow-400"
        />
      </div>

      <div className="space-y-2">
        {run.steps.flatMap((step) =>
          step.nodes.map((nodeId) => (
            <Card key={nodeId} className="bg-slate-900 border-slate-700 p-3">
              <div className="flex items-center justify-between">
                <div className="font-mono text-sm">{nodeId}</div>
                <Badge className="bg-green-600">Success</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
}
