import { Card } from '../../../components/ui/card';

type RunMetricsTabProps = {
  completedSteps: number;
  totalSteps: number;
  totalDuration: number;
  runningSteps: number;
  totalNodes: number;
};

type MetricSummaryCardProps = {
  label: string;
  value: string;
};

function MetricSummaryCard({ label, value }: MetricSummaryCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-700 p-4">
      <div className="text-xs text-slate-300 mb-2">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </Card>
  );
}

export default function RunMetricsTab({
  completedSteps,
  totalSteps,
  totalDuration,
  runningSteps,
  totalNodes,
}: RunMetricsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <MetricSummaryCard label="Total Duration" value={`${totalDuration.toFixed(1)}s`} />
        <MetricSummaryCard label="Completed Steps" value={`${completedSteps} / ${totalSteps}`} />
        <MetricSummaryCard label="Running Steps" value={String(runningSteps)} />
        <MetricSummaryCard label="Nodes in Plan" value={String(totalNodes)} />
      </div>

      <Card className="bg-slate-900 border-slate-700 p-4">
        <div className="text-sm text-slate-200">
          Events and metrics are promoted to this main run screen. Raw execution logs stay in the
          bottom console drawer.
        </div>
      </Card>
    </div>
  );
}
