import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { useRunsService } from '../services/AppServicesContext';
import { useAppStore } from '../stores/appStore';
import RunHeader from './runs/RunHeader';
import { RunListState, RunNotFoundState } from './runs/RunStates';
import RunTabsContent from './runs/RunTabsContent';

export default function RunsView() {
  const { runId } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const { setCurrentRun, selectedTenant, selectedProject, selectedEnvironment } = useAppStore();
  const runsService = useRunsService();
  const workspaceLayoutKey = `${selectedTenant}::${selectedProject}::${selectedEnvironment}`;

  const runsQuery = useQuery({
    queryKey: ['runs', 'list', workspaceLayoutKey],
    queryFn: () => runsService.listRuns(),
  });

  const runDetailQuery = useQuery({
    queryKey: ['runs', 'detail', workspaceLayoutKey, runId],
    queryFn: () => runsService.getRun(runId ?? ''),
    enabled: Boolean(runId),
  });

  const runs = runsQuery.data ?? [];
  // /runs always shows the list; /runs/:runId shows the detail
  const run = runId ? (runDetailQuery.data ?? null) : null;

  useEffect(() => {
    setCurrentRun(run);

    return () => {
      setCurrentRun(null);
    };
  }, [run, setCurrentRun]);

  if (!runId) {
    return <RunListState runs={runs} isLoading={runsQuery.isLoading} />;
  }

  if (!run) {
    return <RunNotFoundState runId={runId ?? 'unknown'} />;
  }

  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter((step) => step.status === 'success').length;
  const progress = (completedSteps / totalSteps) * 100;
  const totalDuration = run.steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
  const runningSteps = run.steps.filter((step) => step.status === 'running').length;
  const totalNodes = run.steps.reduce((sum, step) => sum + step.nodes.length, 0);

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      <RunHeader
        run={run}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        progress={progress}
      />
      <RunTabsContent
        run={run}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        completedSteps={completedSteps}
        totalSteps={totalSteps}
        totalDuration={totalDuration}
        runningSteps={runningSteps}
        totalNodes={totalNodes}
      />
    </div>
  );
}
