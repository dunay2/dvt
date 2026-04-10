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

type CostChartsProps = {
  readonly costByRun: ReadonlyArray<{ readonly name: string; readonly cost: number }>;
  readonly durationByModel: ReadonlyArray<{ readonly name: string; readonly duration: number }>;
  readonly copy: CostViewCopy;
};

export function CostCharts({ costByRun, durationByModel, copy }: CostChartsProps) {
  const costByRunChartConfig = {
    cost: {
      label: copy.costSeriesLabel,
      color: 'var(--status-success)',
    },
  } satisfies ChartConfig;

  const durationByModelChartConfig = {
    duration: {
      label: copy.durationSeriesLabel,
      color: 'var(--status-info)',
    },
  } satisfies ChartConfig;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card data-slot="cost-chart-cost-by-run" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
        <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.estimatedCostByRun}</h3>
        <ChartContainer config={costByRunChartConfig} className="h-[260px] w-full">
          <BarChart accessibilityLayer data={[...costByRun]}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="cost" fill="var(--color-cost)" name={copy.costSeriesLabel} radius={4} />
          </BarChart>
        </ChartContainer>
      </Card>

      <Card
        data-slot="cost-chart-duration-by-model"
        className={cn(routeWorkbenchPanelClassName, 'p-4')}
      >
        <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.durationByModel}</h3>
        <ChartContainer config={durationByModelChartConfig} className="h-[260px] w-full">
          <LineChart accessibilityLayer data={[...durationByModel]}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="name" tickLine={false} tickMargin={8} />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="duration"
              dot={false}
              name={copy.durationSeriesLabel}
              stroke="var(--color-duration)"
              strokeWidth={2}
            />
          </LineChart>
        </ChartContainer>
      </Card>
    </div>
  );
}
