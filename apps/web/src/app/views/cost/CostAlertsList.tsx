import { AlertTriangle } from 'lucide-react';

import { StatusIndicator } from '../../components/domain';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import type { CostViewCopy } from './copy';
import type { CostAlert } from './costViewModel';

type CostAlertsListProps = {
  readonly alerts: CostAlert[];
  readonly copy: CostViewCopy;
};

export function CostAlertsList({ alerts, copy }: CostAlertsListProps) {
  return (
    <Card data-slot="cost-alerts-list" className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.alerts}</h3>
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">{copy.noActiveAlerts}</p>
        ) : null}
        {alerts.map((alert) => (
          <div
            data-slot="cost-alert-card"
            key={alert.id}
            className="flex items-start gap-3 rounded border border-[color:var(--status-warning)] bg-[var(--surface-elevated)] p-3"
          >
            <AlertTriangle className="mt-0.5 size-5 text-[var(--status-warning)]" />
            <div className="flex-1">
              <div className="mb-1 font-medium text-[var(--text-strong)]">{alert.title}</div>
              <p className="text-sm text-[var(--text-default)]">{alert.description}</p>
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
