import { Activity, AlertTriangle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';

import { StatCard } from '../../components/domain';
import type { CostViewCopy } from './copy';
import { formatCurrency } from './costViewModel';

type CostStatGridProps = {
  readonly totalCost: number;
  readonly runsCount: number;
  readonly averageCostPerRun: number;
  readonly costAlertsCount: number;
  readonly copy: CostViewCopy;
};

export function CostStatGrid({
  totalCost,
  runsCount,
  averageCostPerRun,
  costAlertsCount,
  copy,
}: CostStatGridProps) {
  return (
    <div data-slot="cost-stat-grid" className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard
        icon={<DollarSign className="size-5" />}
        value={formatCurrency(totalCost)}
        label={copy.totalObservedNodeCost}
        tone="success"
        trend={
          <div className="flex items-center gap-1 text-[var(--status-success)]">
            <TrendingDown className="size-3" />
            <span>{copy.workspace}</span>
          </div>
        }
      />
      <StatCard
        icon={<Activity className="size-5" />}
        value={runsCount}
        label={copy.runsAvailable}
        tone="info"
        trend={
          <div className="flex items-center gap-1 text-[var(--status-info)]">
            <TrendingUp className="size-3" />
            <span>{copy.tracked}</span>
          </div>
        }
      />
      <StatCard
        icon={<DollarSign className="size-5" />}
        value={formatCurrency(averageCostPerRun)}
        label={copy.averageCostPerRun}
        tone="default"
      />
      <StatCard
        icon={<AlertTriangle className="size-5" />}
        value={costAlertsCount}
        label={copy.costAlerts}
        tone="warning"
      />
    </div>
  );
}
