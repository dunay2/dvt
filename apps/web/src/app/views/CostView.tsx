import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { queryKeys } from '../queries/queryKeys';
import { useRunsService, useWorkspaceService } from '../services/AppServicesContext';
import { useExecutionStore } from '../stores/executionStore';

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export default function CostView() {
  const workspaceService = useWorkspaceService();
  const runsService = useRunsService();
  const currentRun = useExecutionStore((state) => state.currentRun);

  const graphSnapshotQuery = useQuery({
    queryKey: queryKeys.workspace.graphForView('cost-view'),
    queryFn: () => workspaceService.getGraphSnapshot(),
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.runs.list('cost-view'),
    queryFn: () => runsService.listRunSummaries(),
  });

  const workspaceNodes = graphSnapshotQuery.data?.nodes ?? [];
  const runs = runsQuery.data ?? [];
  const nodesWithCost = workspaceNodes.filter((node) => typeof node.lastCost === 'number');
  const totalCost = nodesWithCost.reduce((sum, node) => sum + (node.lastCost ?? 0), 0);
  const totalDuration = nodesWithCost.reduce((sum, node) => sum + (node.lastDuration ?? 0), 0);
  const averageCostPerRun = runs.length > 0 ? totalCost / runs.length : totalCost;
  const expensiveNodes = nodesWithCost.filter((node) => (node.lastCost ?? 0) >= 0.4);
  const currentRunCost = currentRun ? averageCostPerRun * 0.15 : null;

  const costByModel = useMemo(
    () =>
      [...nodesWithCost]
        .sort((left, right) => (right.lastCost ?? 0) - (left.lastCost ?? 0))
        .map((node) => ({
          name: node.name,
          cost: node.lastCost ?? 0,
          duration: node.lastDuration ?? 0,
          status: node.status,
        })),
    [nodesWithCost]
  );

  const costByRun = useMemo(
    () =>
      runs.map((run, index) => ({
        name: `Run ${index + 1}`,
        cost: averageCostPerRun,
      })),
    [averageCostPerRun, runs]
  );

  const durationByModel = useMemo(
    () =>
      costByModel.map((model) => ({
        name: model.name,
        duration: Number(model.duration.toFixed(1)),
      })),
    [costByModel]
  );

  const costAlerts = expensiveNodes.map((node) => ({
    id: node.id,
    title: `${node.name} exceeded cost threshold`,
    description: `Last observed cost ${formatCurrency(node.lastCost ?? 0)} exceeded the warning threshold of $0.40.`,
  }));

  const isLoading = graphSnapshotQuery.isLoading || runsQuery.isLoading;
  const loadError = graphSnapshotQuery.error ?? runsQuery.error;

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="size-6 text-green-400" />
            <div>
              <h1 className="text-xl font-semibold">Cost</h1>
              <p className="text-sm text-slate-400">
                Node cost data is derived from the active workspace graph.
                {currentRun && (
                  <span className="ml-2 text-slate-500">
                    Focused run: <span className="font-mono">{currentRun.runId}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          {currentRunCost != null && (
            <Badge className="bg-emerald-700 text-xs">
              Current run estimate {formatCurrency(currentRunCost)}
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          {isLoading && (
            <Card className="border-slate-700 bg-slate-900 p-4 text-sm text-slate-400">
              Loading cost coverage from workspace and runs...
            </Card>
          )}

          {loadError && (
            <Card className="border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
              Cost data could not be loaded from the current data source.
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card className="border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2 text-green-400">
                  <DollarSign className="size-5" />
                  <span className="text-2xl font-semibold">{formatCurrency(totalCost)}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingDown className="size-3" />
                  <span>workspace</span>
                </div>
              </div>
              <p className="text-sm text-slate-300">Total observed node cost</p>
            </Card>

            <Card className="border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2 text-blue-400">
                  <Activity className="size-5" />
                  <span className="text-2xl font-semibold">{runs.length}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-300">
                  <TrendingUp className="size-3" />
                  <span>tracked</span>
                </div>
              </div>
              <p className="text-sm text-slate-300">Runs available</p>
            </Card>

            <Card className="border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2 text-purple-400">
                  <DollarSign className="size-5" />
                  <span className="text-2xl font-semibold">
                    {formatCurrency(averageCostPerRun)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-300">Average cost per run</p>
            </Card>

            <Card className="border-slate-700 bg-slate-900 p-4">
              <div className="mb-2 flex items-start justify-between">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="size-5" />
                  <span className="text-2xl font-semibold">{costAlerts.length}</span>
                </div>
              </div>
              <p className="text-sm text-slate-300">Cost alerts</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="border-slate-700 bg-slate-900 p-4">
              <h3 className="mb-4 font-semibold">Estimated cost by run</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={costByRun}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cost" fill="#22c55e" name="Cost" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="border-slate-700 bg-slate-900 p-4">
              <h3 className="mb-4 font-semibold">Duration by model</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={durationByModel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Duration (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="border-slate-700 bg-slate-900 p-4">
            <h3 className="mb-4 font-semibold">Top cost drivers</h3>
            <div className="space-y-2">
              {costByModel.length === 0 && (
                <p className="text-sm text-slate-400">No node cost data is available.</p>
              )}
              {costByModel.map((model) => (
                <div
                  key={model.name}
                  className="flex items-center justify-between rounded border border-slate-700 bg-slate-950 p-3"
                >
                  <div className="flex flex-1 items-center gap-3">
                    <code className="font-mono text-sm font-medium">{model.name}</code>
                    <div className="max-w-md flex-1">
                      <div
                        className="h-2 rounded bg-emerald-500"
                        style={{
                          width: `${Math.max(
                            8,
                            (model.cost / Math.max(costByModel[0]?.cost ?? 1, 0.01)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-slate-300">{model.duration.toFixed(1)}s</div>
                    <div className="font-semibold text-emerald-400">
                      {formatCurrency(model.cost)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-700 bg-slate-900 p-4">
            <h3 className="mb-4 font-semibold">Alerts</h3>
            <div className="space-y-2">
              {costAlerts.length === 0 && (
                <p className="text-sm text-slate-400">No cost alerts are active.</p>
              )}
              {costAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded border border-yellow-800 bg-yellow-900/20 p-3"
                >
                  <AlertTriangle className="mt-0.5 size-5 text-yellow-400" />
                  <div className="flex-1">
                    <div className="mb-1 font-medium">{alert.title}</div>
                    <p className="text-sm text-slate-300">{alert.description}</p>
                  </div>
                  <Badge className="bg-yellow-700 text-xs">Warning</Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-slate-700 bg-slate-900 p-4">
            <h3 className="mb-2 font-semibold">Coverage</h3>
            <p className="text-sm text-slate-400">
              Cost coverage currently uses node-level `lastCost` and `lastDuration` data from the
              workspace graph. The canvas cost heatmap reads the same source when the `Cost` overlay
              is enabled from the canvas toolbar.
            </p>
            <div className="mt-3 text-sm text-slate-300">
              <div>Nodes with cost data: {nodesWithCost.length}</div>
              <div>Total observed duration: {totalDuration.toFixed(1)}s</div>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
