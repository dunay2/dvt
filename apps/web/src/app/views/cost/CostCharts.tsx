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

import { Card } from '../../components/ui/card';
import type { CostViewCopy } from './copy';

type CostChartsProps = {
  readonly costByRun: ReadonlyArray<{ readonly name: string; readonly cost: number }>;
  readonly durationByModel: ReadonlyArray<{ readonly name: string; readonly duration: number }>;
  readonly copy: CostViewCopy;
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
};

export function CostCharts({ costByRun, durationByModel, copy }: CostChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card className="border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-4 font-semibold">{copy.estimatedCostByRun}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={[...costByRun]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="cost" fill="#22c55e" name="Cost" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-4 font-semibold">{copy.durationByModel}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={[...durationByModel]}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} />
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
  );
}
