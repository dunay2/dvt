import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { Card } from '../../components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../../components/ui/chart';
import { cn } from '../../components/ui/utils';
import type { CostViewCopy } from './copy';
import type { RuntimeDurationPoint } from './costViewModel';

type CostChartsProps = {
  readonly durationByRun: readonly RuntimeDurationPoint[];
  readonly durationByStep: readonly RuntimeDurationPoint[];
  readonly copy: CostViewCopy;
};

export function CostCharts({ durationByRun, durationByStep, copy }: CostChartsProps) {
  const durationByRunChartConfig = {
    duration: {
      label: copy.durationByRunSeriesLabel,
      color: 'var(--status-info)',
    },
  } satisfies ChartConfig;

  const durationByStepChartConfig = {
    duration: {
      label: copy.durationByStepSeriesLabel,
      color: 'var(--status-info)',
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card
        data-slot="cost-chart-duration-by-run"
        className={cn(routeWorkbenchPanelClassName, 'p-4')}
      >
        <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.durationByRun}</h3>
        <ChartContainer config={durationByRunChartConfig} className="h-[260px] w-full">
          <BarChart accessibilityLayer data={[...durationByRun]}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="duration"
              fill="var(--color-duration)"
              name={copy.durationByRunSeriesLabel}
              radius={4}
            />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card
        data-slot="cost-chart-duration-by-step"
        className={cn(routeWorkbenchPanelClassName, 'p-4')}
      >
        <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.durationByStep}</h3>
        <ChartContainer config={durationByStepChartConfig} className="h-[260px] w-full">
          <LineChart accessibilityLayer data={[...durationByStep]}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="duration"
              dot={false}
              name={copy.durationByStepSeriesLabel}
              stroke="var(--color-duration)"
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </Card>
    </div>
  );
}
