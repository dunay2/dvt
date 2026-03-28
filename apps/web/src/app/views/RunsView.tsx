import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Pause,
  StopCircle,
  Clock,
  GitCommit,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Radio,
  FileText,
  BarChart3,
  Download,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { cn } from '../components/ui/utils';
import { resolveDataSource } from '../services/config/dataSource';
import { createRunsService } from '../services/runs/runsService';
import { useAppStore } from '../stores/appStore';

export default function RunsView() {
  const { runId } = useParams();
  const { setConsolePanelHeight } = useAppStore();
  const [activeTab, setActiveTab] = useState('timeline');
  const runsService = useMemo(() => createRunsService(resolveDataSource()), []);
  const runsQuery = useQuery({
    queryKey: ['runs', 'list'],
    queryFn: () => runsService.listRuns(),
  });
  const runDetailQuery = useQuery({
    queryKey: ['runs', 'detail', runId],
    queryFn: () => runsService.getRun(runId ?? ''),
    enabled: Boolean(runId),
  });

  const runs = runsQuery.data ?? [];
  const run = runId ? (runDetailQuery.data ?? null) : (runs[0] ?? null);

  if (!runId && !run) {
    return (
      <div className="h-full bg-slate-950 flex flex-col">
        <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
          <h1 className="text-lg font-semibold">Runs</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {runs.map((r) => (
                <Card
                  key={r.runId}
                  className="bg-slate-900 border-slate-700 p-4 hover:border-slate-600 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">Run {r.runId}</h3>
                        <Badge
                          className={cn(
                            r.status === 'completed' && 'bg-green-600',
                            r.status === 'running' && 'bg-blue-600',
                            r.status === 'failed' && 'bg-red-600'
                          )}
                        >
                          {r.status}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-slate-300">
                        <div className="flex items-center gap-1">
                          <GitCommit className="size-3" />
                          {r.gitSha}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(r.startTime).toLocaleString()}
                        </div>
                        <div>Environment: {r.environment}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="h-full bg-slate-950 flex flex-col">
        <div className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-4">
          <h1 className="text-lg font-semibold">Runs</h1>
        </div>
        <div className="flex-1 p-6">
          <Card className="max-w-xl mx-auto bg-slate-900 border-slate-700 p-5">
            <h2 className="text-base font-semibold mb-2">Run no encontrado</h2>
            <p className="text-sm text-slate-300">
              No existe información para el run <span className="font-mono">{runId}</span>.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter((s) => s.status === 'success').length;
  const progress = (completedSteps / totalSteps) * 100;
  const totalDuration = run.steps.reduce((sum, step) => sum + (step.duration ?? 0), 0);
  const runningSteps = run.steps.filter((step) => step.status === 'running').length;
  const totalNodes = run.steps.reduce((sum, step) => sum + step.nodes.length, 0);

  return (
    <div className="h-full bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-700">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl font-semibold">Run {run.runId}</h1>
                <Badge
                  className={cn(
                    run.status === 'completed' && 'bg-green-600',
                    run.status === 'running' && 'bg-blue-600 animate-pulse',
                    run.status === 'failed' && 'bg-red-600'
                  )}
                >
                  {run.status}
                </Badge>
              </div>
              <div className="flex gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1">
                  <GitCommit className="size-4" />
                  {run.gitSha}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="size-4" />
                  Started {new Date(run.startTime).toLocaleString()}
                </div>
                <div>Environment: {run.environment}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {run.status === 'running' && (
                <>
                  <Button variant="outline" size="sm">
                    <Pause className="size-4 mr-2" />
                    Pause
                  </Button>
                  <Button variant="outline" size="sm">
                    <StopCircle className="size-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>
                {completedSteps} of {totalSteps} steps completed
              </span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
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
                <div className="space-y-3">
                  {run.steps.map((step, idx) => (
                    <Card
                      key={step.id}
                      className={cn(
                        'bg-slate-900 border-2 p-4',
                        step.status === 'running' && 'border-blue-500',
                        step.status === 'success' && 'border-green-500',
                        step.status === 'failed' && 'border-red-500',
                        step.status === 'idle' && 'border-slate-700'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-8 rounded-full bg-gray-800">
                            <span className="text-sm">{idx + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{step.name}</h3>
                            <p className="text-xs text-slate-300 mt-1">{step.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {step.status === 'running' && (
                            <Badge className="bg-blue-600 animate-pulse">Running</Badge>
                          )}
                          {step.status === 'success' && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="size-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {step.status === 'failed' && (
                            <Badge className="bg-red-600">
                              <XCircle className="size-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                          {step.status === 'idle' && <Badge variant="secondary">Pending</Badge>}
                          {step.duration && (
                            <span className="text-sm text-slate-300">{step.duration}s</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 text-xs text-slate-300">
                        <div>{step.nodes.length} nodes</div>
                        {step.policies.concurrency && (
                          <div>Concurrency: {step.policies.concurrency}</div>
                        )}
                        {step.policies.timeout && <div>Timeout: {step.policies.timeout}s</div>}
                        {step.policies.warehouse && <div>Warehouse: {step.policies.warehouse}</div>}
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="steps" className="m-0 max-w-4xl mx-auto">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle2 className="size-5" />
                      <span className="text-2xl font-semibold">{completedSteps}</span>
                    </div>
                    <p className="text-sm text-slate-300">Successful</p>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <XCircle className="size-5" />
                      <span className="text-2xl font-semibold">0</span>
                    </div>
                    <p className="text-sm text-slate-300">Failed</p>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <AlertCircle className="size-5" />
                      <span className="text-2xl font-semibold">0</span>
                    </div>
                    <p className="text-sm text-slate-300">Warnings</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  {run.steps.flatMap((step) =>
                    step.nodes.map((nodeId) => (
                      <Card key={nodeId} className="bg-slate-900 border-slate-700 p-3">
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-sm">{nodeId}</div>
                          <Badge className="bg-green-600">Success</Badge>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="events" className="m-0 max-w-4xl mx-auto">
                <div className="space-y-2 font-mono text-sm">
                  {run.events.map((event) => (
                    <div key={event.id} className="flex gap-3 p-2 hover:bg-slate-900 rounded">
                      <span className="text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span
                        className={cn(
                          event.type.includes('Completed') && 'text-green-400',
                          event.type.includes('Started') && 'text-blue-400',
                          event.type.includes('Failed') && 'text-red-400'
                        )}
                      >
                        [{event.type}]
                      </span>
                      <span className="text-slate-200">{event.message}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="m-0 max-w-4xl mx-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <Card className="bg-slate-900 border-slate-700 p-4">
                      <div className="text-xs text-slate-300 mb-2">Total Duration</div>
                      <div className="text-2xl font-semibold">{totalDuration.toFixed(1)}s</div>
                    </Card>
                    <Card className="bg-slate-900 border-slate-700 p-4">
                      <div className="text-xs text-slate-300 mb-2">Completed Steps</div>
                      <div className="text-2xl font-semibold">
                        {completedSteps} / {totalSteps}
                      </div>
                    </Card>
                    <Card className="bg-slate-900 border-slate-700 p-4">
                      <div className="text-xs text-slate-300 mb-2">Running Steps</div>
                      <div className="text-2xl font-semibold">{runningSteps}</div>
                    </Card>
                    <Card className="bg-slate-900 border-slate-700 p-4">
                      <div className="text-xs text-slate-300 mb-2">Nodes in Plan</div>
                      <div className="text-2xl font-semibold">{totalNodes}</div>
                    </Card>
                  </div>

                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="text-sm text-slate-200">
                      Events and metrics are promoted to this main run screen. Raw execution logs
                      stay in the bottom console drawer.
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="artifacts" className="m-0 max-w-4xl mx-auto">
                <div className="space-y-3">
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">manifest.json</h3>
                        <p className="text-xs text-slate-300">{run.artifacts?.manifest}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">run_results.json</h3>
                        <p className="text-xs text-slate-300">{run.artifacts?.runResults}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </Card>
                  <Card className="bg-slate-900 border-slate-700 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">catalog.json</h3>
                        <p className="text-xs text-slate-300">{run.artifacts?.catalog}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}

