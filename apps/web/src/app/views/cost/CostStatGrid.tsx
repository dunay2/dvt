import { Activity, AlertTriangle, CheckCircle2, DollarSign, TrendingUp } from 'lucide-react';

import { StatCard } from '../../components/domain';
import type { CostViewCopy } from './copy';

type CostStatGridProps = {
  readonly totalCostLabel: string;
  readonly runCount: number;
  readonly completedStepCount: number;
  readonly failedStepCount: number;
  readonly copy: CostViewCopy;
};

export function CostStatGrid({
  totalCostLabel,
  runCount,
  completedStepCount,
  failedStepCount,
  copy,
}: CostStatGridProps) {
  return (
    <div data-slot="cost-stat-grid" className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        icon={<DollarSign className="size-5" />}
        value={totalCostLabel}
        label={copy.costCaptureStatus}
        tone="warning"
        trend={<span>{copy.costCaptureUnavailable}</span>}
      />
      <StatCard
        icon={<Activity className="size-5" />}
        value={runCount}
        label={copy.runsObserved}
        tone="info"
        trend={
          <div className="flex items-center gap-1 text-[var(--status-info)]">
            <TrendingUp className="size-3" />
            <span>{copy.tracked}</span>
          </div>
        }
      />
      <StatCard
        icon={<CheckCircle2 className="size-5" />}
        value={completedStepCount}
        label={copy.completedSteps}
        tone="success"
        trend={<span>{copy.runtime}</span>}
      />
      <StatCard
        icon={<AlertTriangle className="size-5" />}
        value={failedStepCount}
        label={copy.failedSteps}
        tone={failedStepCount > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
