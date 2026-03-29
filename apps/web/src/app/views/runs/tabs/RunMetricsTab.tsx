import { RunStatCard, RunSurfaceCard } from './RunTabPrimitives';

type RunMetricsTabProps = {
  completedSteps: number;
  totalSteps: number;
  totalDuration: number;
  runningSteps: number;
  totalNodes: number;
};

export default function RunMetricsTab({
  completedSteps,
  totalSteps,
  totalDuration,
  runningSteps,
  totalNodes,
}: Readonly<RunMetricsTabProps>) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <RunStatCard label="Total Duration" value={`${totalDuration.toFixed(1)}s`} />
        <RunStatCard label="Completed Steps" value={`${completedSteps} / ${totalSteps}`} />
        <RunStatCard label="Running Steps" value={String(runningSteps)} />
        <RunStatCard label="Nodes in Plan" value={String(totalNodes)} />
      </div>

      <RunSurfaceCard className="p-4">
        <div className="text-sm text-slate-200">
          Events and metrics are promoted to this main run screen. Raw execution logs stay in the
          bottom console drawer.
        </div>
      </RunSurfaceCard>
    </div>
  );
}
