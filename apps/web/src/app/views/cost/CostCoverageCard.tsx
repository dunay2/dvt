import { Card } from '../../components/ui/card';
import type { CostViewCopy } from './copy';

type CostCoverageCardProps = {
  readonly nodesWithCostCount: number;
  readonly totalDuration: number;
  readonly copy: CostViewCopy;
};

export function CostCoverageCard({
  nodesWithCostCount,
  totalDuration,
  copy,
}: CostCoverageCardProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-2 font-semibold">{copy.coverage}</h3>
      <p className="text-sm text-slate-400">{copy.coverageDescription}</p>
      <div className="mt-3 text-sm text-slate-300">
        <div>
          {copy.nodesWithCostData}: {nodesWithCostCount}
        </div>
        <div>
          {copy.totalObservedDuration}: {totalDuration.toFixed(1)}s
        </div>
      </div>
    </Card>
  );
}
