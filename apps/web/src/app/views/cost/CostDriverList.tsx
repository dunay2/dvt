import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { CostViewCopy } from './copy';
import { formatCurrency, type CostDriver } from './costViewModel';

type CostDriverListProps = {
  readonly drivers: CostDriver[];
  readonly copy: CostViewCopy;
};

export function CostDriverList({ drivers, copy }: CostDriverListProps) {
  return (
    <Card data-slot="cost-driver-list" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.topCostDrivers}</h3>
      <div className="space-y-2">
        {drivers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{copy.noNodeCostData}</p>
        ) : null}
        {drivers.map((driver) => (
          <div
            data-slot="cost-driver-row"
            key={driver.name}
            className="flex items-center justify-between rounded border border-[color:var(--border-default)] bg-[var(--surface-app)] p-3"
          >
            <div className="flex flex-1 items-center gap-3">
              <code className="font-mono text-sm font-medium text-[var(--text-strong)]">
                {driver.name}
              </code>
              <div className="max-w-md flex-1">
                <div
                  className="h-2 rounded bg-[var(--status-success)]"
                  style={{
                    width: `${Math.max(
                      8,
                      (driver.cost / Math.max(drivers[0]?.cost ?? 1, 0.01)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-[var(--text-muted)]">{driver.duration.toFixed(1)}s</div>
              <div className="font-semibold text-[var(--status-success)]">
                {formatCurrency(driver.cost)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
