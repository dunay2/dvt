import { DollarSign, TrendingUp, TrendingDown, Activity, AlertTriangle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

const costByRun = [
  { name: 'Run 1', cost: 0.45 },
  { name: 'Run 2', cost: 0.52 },
  { name: 'Run 3', cost: 0.38 },
  { name: 'Run 4', cost: 0.61 },
  { name: 'Run 5', cost: 0.49 },
  { name: 'Run 6', cost: 0.55 },
];

const costByModel = [
  { name: 'fct_sales', cost: 0.45, duration: 15.2 },
  { name: 'dim_store', cost: 0.08, duration: 3.5 },
  { name: 'stg_orders', cost: 0.05, duration: 2.3 },
  { name: 'stg_customers', cost: 0.03, duration: 1.8 },
  { name: 'dim_customer', cost: 0.12, duration: 4.1 },
];

const warehouseUsage = [
  { time: '10:00', usage: 45 },
  { time: '11:00', usage: 62 },
  { time: '12:00', usage: 78 },
  { time: '13:00', usage: 55 },
  { time: '14:00', usage: 43 },
  { time: '15:00', usage: 38 },
];

export default function CostView() {
  return (
    <div className="h-full bg-[#1a1d23] flex flex-col">
      {/* Header */}
      <div className="bg-[#0f1116] border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="size-6 text-green-400" />
            <h1 className="text-xl font-semibold">Cost & Observability</h1>
          </div>
          <div className="flex gap-2">
            <Select defaultValue="7d">
              <SelectTrigger className="w-[150px] bg-[#1a1d23] border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="dev">
              <SelectTrigger className="w-[150px] bg-[#1a1d23] border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">dev</SelectItem>
                <SelectItem value="stage">stage</SelectItem>
                <SelectItem value="prod">prod</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-green-400">
                  <DollarSign className="size-5" />
                  <span className="text-2xl font-semibold">$3.42</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingDown className="size-3" />
                  <span>12%</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Total Cost (7d)</p>
            </Card>

            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-blue-400">
                  <Activity className="size-5" />
                  <span className="text-2xl font-semibold">24</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <TrendingUp className="size-3" />
                  <span>8%</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Runs (7d)</p>
            </Card>

            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-purple-400">
                  <DollarSign className="size-5" />
                  <span className="text-2xl font-semibold">$0.49</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Avg Cost per Run</p>
            </Card>

            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="size-5" />
                  <span className="text-2xl font-semibold">2</span>
                </div>
              </div>
              <p className="text-sm text-gray-400">Cost Alerts</p>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <h3 className="font-semibold mb-4">Cost by Run</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={costByRun}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1116',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="cost" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="bg-[#0f1116] border-gray-800 p-4">
              <h3 className="font-semibold mb-4">Warehouse Usage</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={warehouseUsage}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f1116',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="usage" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Cost by Model */}
          <Card className="bg-[#0f1116] border-gray-800 p-4">
            <h3 className="font-semibold mb-4">Cost by Model</h3>
            <div className="space-y-2">
              {costByModel
                .sort((a, b) => b.cost - a.cost)
                .map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between p-3 bg-[#1a1d23] border border-gray-800 rounded"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <code className="font-mono text-sm font-medium">{model.name}</code>
                      <div className="flex-1 max-w-md">
                        <div
                          className="h-2 bg-blue-500 rounded"
                          style={{ width: `${(model.cost / 0.45) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-gray-400">{model.duration}s</div>
                      <div className="text-green-400 font-semibold">${model.cost.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Alerts */}
          <Card className="bg-[#0f1116] border-gray-800 p-4">
            <h3 className="font-semibold mb-4">Cost Alerts</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                <AlertTriangle className="size-5 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-1">fct_sales exceeded cost threshold</div>
                  <p className="text-sm text-gray-400">
                    Model cost $0.45 exceeded the threshold of $0.40 on last run
                  </p>
                  <div className="text-xs text-gray-500 mt-2">2 hours ago</div>
                </div>
                <Badge className="bg-yellow-600">Warning</Badge>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-900/20 border border-yellow-800 rounded">
                <AlertTriangle className="size-5 text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <div className="font-medium mb-1">Warehouse usage spike detected</div>
                  <p className="text-sm text-gray-400">
                    Usage increased by 45% at 12:00 PM compared to baseline
                  </p>
                  <div className="text-xs text-gray-500 mt-2">4 hours ago</div>
                </div>
                <Badge className="bg-yellow-600">Warning</Badge>
              </div>
            </div>
          </Card>

          {/* OpenTelemetry Traces (Placeholder) */}
          <Card className="bg-[#0f1116] border-gray-800 p-4">
            <h3 className="font-semibold mb-4">OpenTelemetry Traces</h3>
            <div className="text-center py-8 text-gray-500">
              <Activity className="size-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">
                Trace data will appear here when OpenTelemetry is configured
              </p>
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
