import {
  Activity,
  Clock,
  GitBranch,
  Pause,
  XCircle,
  Play,
  CheckCircle2,
  AlertCircle,
  Download,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { mockRun } from '../../data/mockData';

export function RunView() {
  const run = mockRun;

  const getStatusIcon = () => {
    switch (run.status) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (run.status) {
      case 'success':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      case 'running':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const completedSteps = run.steps.filter((s) => s.status === 'success').length;
  const totalSteps = run.steps.length;
  const progress = (completedSteps / totalSteps) * 100;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold">Run #{run.runId.split('_')[1]}</h2>
                <Badge variant={run.status === 'running' ? 'default' : 'secondary'}>
                  {run.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <GitBranch className="h-3 w-3" />
                  <span>{run.gitBranch}</span>
                  <span className="text-xs">@{run.gitSha}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{new Date(run.startedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {run.status === 'running' && (
              <>
                <Button variant="outline" size="sm">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button variant="destructive" size="sm">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>
              Progress: {completedSteps} of {totalSteps} steps completed
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Steps Timeline */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-medium">Execution Steps</h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {run.steps.map((step, index) => {
                const isActive = step.status === 'running';
                const isComplete = step.status === 'success';
                const isFailed = step.status === 'failed';

                return (
                  <Card
                    key={step.id}
                    className={`p-4 ${
                      isActive ? 'border-blue-500 bg-blue-50' : ''
                    } ${isFailed ? 'border-red-500 bg-red-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            isComplete
                              ? 'bg-green-500'
                              : isActive
                                ? 'bg-blue-500'
                                : isFailed
                                  ? 'bg-red-500'
                                  : 'bg-gray-300'
                          }`}
                        >
                          <span className="text-white text-sm font-medium">{index + 1}</span>
                        </div>
                        {index < run.steps.length - 1 && (
                          <div className="w-px h-12 bg-border mt-2" />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{step.type}</span>
                          {step.status && (
                            <Badge
                              variant={
                                isComplete
                                  ? 'default'
                                  : isActive
                                    ? 'secondary'
                                    : isFailed
                                      ? 'destructive'
                                      : 'outline'
                              }
                            >
                              {step.status}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span>{step.nodes.length} nodes</span>
                            <span>•</span>
                            <span>Concurrency: {step.policies.concurrency}</span>
                          </div>
                          {step.duration && (
                            <div>Duration: {(step.duration / 1000).toFixed(2)}s</div>
                          )}
                          {step.startedAt && (
                            <div className="text-xs">
                              Started: {new Date(step.startedAt).toLocaleTimeString()}
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <div className="mt-2">
                            <Progress value={65} className="h-1" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Details */}
        <div className="w-1/2 flex flex-col">
          <Tabs defaultValue="events" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="events" className="p-4 m-0">
                <div className="space-y-2">
                  {run.events.map((event) => {
                    const isError = event.type.includes('Failed');
                    const isComplete = event.type.includes('Completed');

                    return (
                      <div
                        key={event.id}
                        className={`p-3 border rounded-md ${
                          isError
                            ? 'bg-red-50 border-red-200'
                            : isComplete
                              ? 'bg-green-50 border-green-200'
                              : 'bg-background'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {isError ? (
                            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                          ) : isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          ) : (
                            <Activity className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant="outline" className="text-xs">
                                {event.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(event.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{event.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              <TabsContent value="logs" className="p-4 m-0">
                <div className="bg-black text-green-400 p-4 rounded-md font-mono text-xs">
                  <div>[10:35:00] Starting compilation...</div>
                  <div>[10:35:02] Compiling model stg_orders</div>
                  <div>[10:35:04] Compiling model stg_stores</div>
                  <div>[10:35:06] Compiling model dim_store</div>
                  <div>[10:35:08] Compiling model fct_sales</div>
                  <div>[10:35:12] Compilation complete</div>
                  <div>[10:35:12] Starting run...</div>
                  <div>[10:35:14] Running stg_orders...</div>
                  <div>[10:35:16] stg_orders completed (2.3s)</div>
                  <div className="animate-pulse">▌</div>
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="p-4 m-0">
                <div className="space-y-4">
                  <Card className="p-4">
                    <h4 className="font-medium mb-3">Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground mb-1">Total Steps</div>
                        <div className="text-2xl font-semibold">{totalSteps}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Completed</div>
                        <div className="text-2xl font-semibold text-green-600">
                          {completedSteps}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Duration</div>
                        <div className="text-2xl font-semibold">
                          {(run.duration / 1000).toFixed(1)}s
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground mb-1">Nodes Processed</div>
                        <div className="text-2xl font-semibold">2</div>
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="artifacts" className="p-4 m-0">
                <div className="space-y-2">
                  <div className="p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">manifest.json</div>
                        <div className="text-xs text-muted-foreground">Updated 5 minutes ago</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">run_results.json</div>
                        <div className="text-xs text-muted-foreground">Updated 2 minutes ago</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border rounded-md hover:bg-accent cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">catalog.json</div>
                        <div className="text-xs text-muted-foreground">Updated 1 minute ago</div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
