import { AlertTriangle } from 'lucide-react';

import { StatusIndicator } from '../../components/domain';
import { Card } from '../../components/ui/card';
import type { CostViewCopy } from './copy';
import type { CostAlert } from './costViewModel';

type CostAlertsListProps = {
  readonly alerts: CostAlert[];
  readonly copy: CostViewCopy;
};

export function CostAlertsList({ alerts, copy }: CostAlertsListProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-4 font-semibold">{copy.alerts}</h3>
      <div className="space-y-2">
        {alerts.length === 0 ? <p className="text-sm text-slate-400">{copy.noActiveAlerts}</p> : null}
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 rounded border border-yellow-800 bg-yellow-900/20 p-3"
          >
            <AlertTriangle className="mt-0.5 size-5 text-yellow-400" />
            <div className="flex-1">
              <div className="mb-1 font-medium">{alert.title}</div>
              <p className="text-sm text-slate-300">{alert.description}</p>
            </div>
            <StatusIndicator
              state="warning"
              label={copy.warning}
              icon={<AlertTriangle className="size-3" />}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}
