import { BarChart3, FileText, Radio } from 'lucide-react';

import type { Run } from '../../types/dbt';

import { ScrollArea } from '../../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import RunArtifactsTab from './tabs/RunArtifactsTab';
import RunEventsTab from './tabs/RunEventsTab';
import RunMetricsTab from './tabs/RunMetricsTab';
import RunStepsTab from './tabs/RunStepsTab';
import RunTimelineTab from './tabs/RunTimelineTab';

type RunTabsContentProps = {
  run: Run;
  activeTab: string;
  onTabChange: (tab: string) => void;
  completedSteps: number;
  totalSteps: number;
  totalDuration: number;
  runningSteps: number;
  totalNodes: number;
};

export default function RunTabsContent({
  run,
  activeTab,
  onTabChange,
  completedSteps,
  totalSteps,
  totalDuration,
  runningSteps,
  totalNodes,
}: RunTabsContentProps) {
  return (
    <div className="flex-1 overflow-hidden">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="bg-slate-900 border-b border-slate-700 rounded-none px-6">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="events">
            <Radio className="size-3 mr-2" />
            Events
          </TabsTrigger>
          <TabsTrigger value="metrics">
            <BarChart3 className="size-3 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="artifacts">
            <FileText className="size-3 mr-2" />
            Artifacts
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <TabsContent value="timeline" className="m-0 max-w-4xl mx-auto">
              <RunTimelineTab run={run} />
            </TabsContent>

            <TabsContent value="steps" className="m-0 max-w-4xl mx-auto">
              <RunStepsTab run={run} completedSteps={completedSteps} />
            </TabsContent>

            <TabsContent value="events" className="m-0 max-w-4xl mx-auto">
              <RunEventsTab run={run} />
            </TabsContent>

            <TabsContent value="metrics" className="m-0 max-w-4xl mx-auto">
              <RunMetricsTab
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                totalDuration={totalDuration}
                runningSteps={runningSteps}
                totalNodes={totalNodes}
              />
            </TabsContent>

            <TabsContent value="artifacts" className="m-0 max-w-4xl mx-auto">
              <RunArtifactsTab run={run} />
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    </div>
  );
}
