import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { CostViewCopy } from './copy';
import type { CostDriver } from './costViewModel';

type CostDriverListProps = {
  readonly drivers: CostDriver[];
  readonly copy: CostViewCopy;
};

function resolveDriverStatusLabel(driver: CostDriver): string {
  return driver.status === 'failed' ? 'failed' : 'completed';
}

export function CostDriverList({ drivers, copy }: CostDriverListProps) {
  const maxDurationMs = Math.max(drivers[0]?.durationMs ?? 1, 1);

  return (
    <Card data-slot="cost-driver-list" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.topUsageDrivers}</h3>
      <div className="space-y-2">
        {drivers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{copy.noUsageData}</p>
        ) : null}
        {drivers.map((driver) => (
          <div
            data-slot="cost-driver-row"
            key={driver.id}
            className="flex items-center justify-between rounded border border-[color:var(--border-default)] bg-[var(--surface-app)] p-3"
          >
            <div className="flex flex-1 items-center gap-3">
              <div className="min-w-0">
                <code className="block truncate font-mono text-sm font-medium text-[var(--text-strong)]">
                  {driver.name}
                </code>
                <span className="text-xs text-[var(--text-muted)]">
                  {driver.runId} - {resolveDriverStatusLabel(driver)}
                </span>
              </div>
              <div className="max-w-md flex-1">
                <div
                  className={cn(
                    'h-2 rounded',
                    driver.status === 'failed'
                      ? 'bg-[var(--status-warning)]'
                      : 'bg-[var(--status-info)]'
                  )}
                  style={{ width: `${Math.max(8, (driver.durationMs / maxDurationMs) * 100)}%` }}
                />
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--text-default)]">
              {driver.duration.toFixed(1)}s
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
