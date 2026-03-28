import { CheckCircle2, XCircle } from 'lucide-react';

import { Badge } from '../../../components/ui/badge';
import { Card } from '../../../components/ui/card';
import { cn } from '../../../components/ui/utils';
import type { Run } from '../../../types/dbt';

type RunTimelineTabProps = {
  run: Run;
};

export default function RunTimelineTab({ run }: RunTimelineTabProps) {
  return (
    <div className="space-y-3">
      {run.steps.map((step, idx) => (
        <Card
          key={step.id}
          className={cn(
            'bg-slate-900 border-2 p-4',
            step.status === 'running' && 'border-blue-500',
            step.status === 'success' && 'border-green-500',
            step.status === 'failed' && 'border-red-500',
            step.status === 'idle' && 'border-slate-700'
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-8 rounded-full bg-gray-800">
                <span className="text-sm">{idx + 1}</span>
              </div>
              <div>
                <h3 className="font-semibold">{step.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{step.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {step.status === 'running' && <Badge className="bg-blue-600 animate-pulse">Running</Badge>}
              {step.status === 'success' && (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="size-3 mr-1" />
                  Success
                </Badge>
              )}
              {step.status === 'failed' && (
                <Badge className="bg-red-600">
                  <XCircle className="size-3 mr-1" />
                  Failed
                </Badge>
              )}
              {step.status === 'idle' && <Badge variant="secondary">Pending</Badge>}
              {step.duration && <span className="text-sm text-slate-300">{step.duration}s</span>}
            </div>
          </div>

          <div className="flex gap-4 text-xs text-slate-300">
            <div>{step.nodes.length} nodes</div>
            {step.policies.concurrency && <div>Concurrency: {step.policies.concurrency}</div>}
            {step.policies.timeout && <div>Timeout: {step.policies.timeout}s</div>}
            {step.policies.warehouse && <div>Warehouse: {step.policies.warehouse}</div>}
          </div>
        </Card>
      ))}
    </div>
  );
}
