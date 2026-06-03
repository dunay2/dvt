import { Card } from '../../components/ui/card';
import { lineageViewCopy as copy } from './copy';
import { lineageChromeClasses } from './lineageChromeTokens';

interface LineageImpactSummaryProps {
  upstreamCount: number;
  downstreamCount: number;
  exposureCount: number;
}

export function LineageImpactSummary({
  upstreamCount,
  downstreamCount,
  exposureCount,
}: LineageImpactSummaryProps) {
  return (
    <Card className={`${lineageChromeClasses.panel} p-4`}>
      <h3 className="mb-3 font-semibold">{copy.impactSummary}</h3>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className={lineageChromeClasses.mutedText}>{copy.upstreamDependencies}</div>
          <div className="mt-1 text-xl font-semibold">{upstreamCount}</div>
        </div>
        <div>
          <div className={lineageChromeClasses.mutedText}>{copy.downstreamConsumers}</div>
          <div className="mt-1 text-xl font-semibold">{downstreamCount}</div>
        </div>
        <div>
          <div className={lineageChromeClasses.mutedText}>{copy.exposuresAffected}</div>
          <div className="mt-1 text-xl font-semibold">{exposureCount}</div>
        </div>
      </div>
    </Card>
  );
}
