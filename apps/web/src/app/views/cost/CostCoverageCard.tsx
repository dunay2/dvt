import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { CostViewCopy } from './copy';

type CostCoverageCardProps = {
  readonly stepsWithUsageCount: number;
  readonly totalDurationSeconds: number;
  readonly observedWindowLabel: string;
  readonly copy: CostViewCopy;
};

export function CostCoverageCard({
  stepsWithUsageCount,
  totalDurationSeconds,
  observedWindowLabel,
  copy,
}: CostCoverageCardProps) {
  return (
    <Card data-slot="cost-coverage-card" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-2 font-semibold text-[var(--text-strong)]">{copy.coverage}</h3>
      <p className="text-sm text-[var(--text-muted)]">{copy.coverageDescription}</p>
      <div className="mt-3 text-sm text-[var(--text-default)]">
        <div>
          {copy.stepsWithUsageData}: {stepsWithUsageCount}
        </div>
        <div>
          {copy.totalObservedDuration}: {totalDurationSeconds.toFixed(1)}s
        </div>
        <div>
          {copy.observedWindow}: <span className="font-mono">{observedWindowLabel}</span>
        </div>
      </div>
    </Card>
  );
}
