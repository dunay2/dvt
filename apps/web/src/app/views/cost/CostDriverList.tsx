import { Card } from '../../components/ui/card';
import type { CostViewCopy } from './copy';
import { formatCurrency, type CostDriver } from './costViewModel';

type CostDriverListProps = {
  readonly drivers: CostDriver[];
  readonly copy: CostViewCopy;
};

export function CostDriverList({ drivers, copy }: CostDriverListProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-4 font-semibold">{copy.topCostDrivers}</h3>
      <div className="space-y-2">
        {drivers.length === 0 ? (
          <p className="text-sm text-slate-400">{copy.noNodeCostData}</p>
        ) : null}
        {drivers.map((driver) => (
          <div
            key={driver.name}
            className="flex items-center justify-between rounded border border-slate-700 bg-slate-950 p-3"
          >
            <div className="flex flex-1 items-center gap-3">
              <code className="font-mono text-sm font-medium">{driver.name}</code>
              <div className="max-w-md flex-1">
                <div
                  className="h-2 rounded bg-emerald-500"
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
              <div className="text-slate-300">{driver.duration.toFixed(1)}s</div>
              <div className="font-semibold text-emerald-400">{formatCurrency(driver.cost)}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
