import { Card } from '../../components/ui/card';
import { lineageViewCopy as copy } from './copy';

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
    <Card className="border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-3 font-semibold">{copy.impactSummary}</h3>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-slate-300">{copy.upstreamDependencies}</div>
          <div className="mt-1 text-xl font-semibold">{upstreamCount}</div>
        </div>
        <div>
          <div className="text-slate-300">{copy.downstreamConsumers}</div>
          <div className="mt-1 text-xl font-semibold">{downstreamCount}</div>
        </div>
        <div>
          <div className="text-slate-300">{copy.exposuresAffected}</div>
          <div className="mt-1 text-xl font-semibold">{exposureCount}</div>
        </div>
      </div>
    </Card>
  );
}
