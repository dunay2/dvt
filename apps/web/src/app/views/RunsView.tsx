import { useState } from 'react';
import { useParams } from 'react-router';
import { mockRun } from '../data/mockDbtData';
import { useAppStore } from '../stores/appStore';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
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
  Code,
  Download,
} from 'lucide-react';
import { cn } from '../components/ui/utils';

export default function RunsView() {
  const { runId } = useParams();
  const { setConsolePanelHeight } = useAppStore();
  const [activeTab, setActiveTab] = useState('timeline');

  // In a real app, fetch run by ID
  const run = mockRun;

  if (!runId && !run) {
    return (
      <div className="h-full bg-[#1a1d23] flex flex-col">
        <div className="h-12 bg-[#0f1116] border-b border-gray-800 flex items-center px-4">
          <h1 className="text-lg font-semibold">Runs</h1>
        </div>
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {[mockRun, { ...mockRun, runId: 'run_abc123', status: 'completed' as const }].map(
              (r) => (
                <Card
                  key={r.runId}
                  className="bg-[#0f1116] border-gray-800 p-4 hover:border-gray-700 cursor-pointer transition-colors"
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
                      <div className="flex gap-4 text-sm text-gray-400">
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
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter((s) => s.status === 'success').length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="h-full bg-[#1a1d23] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1116] border-b border-gray-800">
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
              <div className="flex gap-4 text-sm text-gray-400">
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
            <div className="flex justify-between text-sm text-gray-400 mb-2">
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
          <TabsList className="bg-[#0f1116] border-b border-gray-800 rounded-none px-6">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="events">
              <Radio className="size-3 mr-2" />
              Events
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
                        'bg-[#0f1116] border-2 p-4',
                        step.status === 'running' && 'border-blue-500',
                        step.status === 'success' && 'border-green-500',
                        step.status === 'failed' && 'border-red-500',
                        step.status === 'idle' && 'border-gray-800'
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center size-8 rounded-full bg-gray-800">
                            <span className="text-sm">{idx + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-semibold">{step.name}</h3>
                            <p className="text-xs text-gray-400 mt-1">{step.type}</p>
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
                            <span className="text-sm text-gray-400">{step.duration}s</span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-4 text-xs text-gray-400">
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
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle2 className="size-5" />
                      <span className="text-2xl font-semibold">{completedSteps}</span>
                    </div>
                    <p className="text-sm text-gray-400">Successful</p>
                  </Card>
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center gap-2 text-red-400 mb-2">
                      <XCircle className="size-5" />
                      <span className="text-2xl font-semibold">0</span>
                    </div>
                    <p className="text-sm text-gray-400">Failed</p>
                  </Card>
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                      <AlertCircle className="size-5" />
                      <span className="text-2xl font-semibold">0</span>
                    </div>
                    <p className="text-sm text-gray-400">Warnings</p>
                  </Card>
                </div>

                <div className="space-y-2">
                  {run.steps.flatMap((step) =>
                    step.nodes.map((nodeId) => (
                      <Card key={nodeId} className="bg-[#0f1116] border-gray-800 p-3">
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
                    <div key={event.id} className="flex gap-3 p-2 hover:bg-[#0f1116] rounded">
                      <span className="text-gray-500">
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
                      <span className="text-gray-300">{event.message}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="artifacts" className="m-0 max-w-4xl mx-auto">
                <div className="space-y-3">
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">manifest.json</h3>
                        <p className="text-xs text-gray-400">{run.artifacts?.manifest}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </Card>
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">run_results.json</h3>
                        <p className="text-xs text-gray-400">{run.artifacts?.runResults}</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="size-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </Card>
                  <Card className="bg-[#0f1116] border-gray-800 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">catalog.json</h3>
                        <p className="text-xs text-gray-400">{run.artifacts?.catalog}</p>
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
