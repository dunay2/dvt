import { DollarSign } from 'lucide-react';

import { usePublishedRouteBootstrap } from '../bootstrap/usePublishedRouteBootstrap';
import { ViewHeader, ViewStateOverlay } from '../components/domain';
import {
  RouteWorkbenchFrame,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchSubtleTextClassName,
} from '../components/workbench/RouteWorkbenchFrame';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { CostAlertsList } from './cost/CostAlertsList';
import { CostCharts } from './cost/CostCharts';
import { CostCoverageCard } from './cost/CostCoverageCard';
import { CostDriverList } from './cost/CostDriverList';
import { CostStatGrid } from './cost/CostStatGrid';
import { resolveCostViewCopy } from './cost/copy';
import {
  COST_ROUTE_ID,
  deriveCostRouteBootstrapPresentation,
} from './cost/costRouteBootstrap';
import { formatCurrency } from './cost/costViewModel';
import { useCostData } from './cost/useCostData';

export default function CostView() {
  const copy = resolveCostViewCopy();
  const { currentRun, isLoading, loadError, runsQuery, viewModel } = useCostData();
  usePublishedRouteBootstrap(
    COST_ROUTE_ID,
    deriveCostRouteBootstrapPresentation({
      isLoading,
      errorMessage: loadError instanceof Error ? loadError.message : null,
    })
  );

  return (
    <RouteWorkbenchFrame
      header={
        <div data-slot="cost-view-header-band" className={routeWorkbenchHeaderBandClassName}>
          <ViewHeader
            className="border-0 bg-transparent px-0 py-0"
            title={copy.title}
            icon={<DollarSign className="size-6 text-[var(--status-success)]" />}
            subtitle={
              <>
                {copy.subtitle}
                {currentRun ? (
                  <span className={cn('ml-2', routeWorkbenchSubtleTextClassName)}>
                    {copy.focusedRun}: <span className="font-mono">{currentRun.runId}</span>
                  </span>
                ) : null}
              </>
            }
            actions={
              viewModel.currentRunCost != null ? (
                <Badge
                  data-slot="cost-current-run-estimate"
                  className="border-transparent bg-[var(--status-success)] text-[var(--surface-app)] text-xs"
                >
                  {copy.currentRunEstimate} {formatCurrency(viewModel.currentRunCost)}
                </Badge>
              ) : undefined
            }
          />
        </div>
      }
      bodyContainerClassName="space-y-6"
    >
      {isLoading ? (
        <ViewStateOverlay
          kind="loading"
          title={copy.loadingTitle}
          description={copy.loadingDescription}
        />
      ) : null}

      {loadError ? (
        <ViewStateOverlay
          kind="error"
          title={copy.errorTitle}
          description={copy.errorDescription}
          detail={loadError instanceof Error ? loadError.message : undefined}
        />
      ) : null}

      <CostStatGrid
        totalCost={viewModel.totalCost}
        runsCount={runsQuery.data?.length ?? 0}
        averageCostPerRun={viewModel.averageCostPerRun}
        costAlertsCount={viewModel.costAlerts.length}
        copy={copy}
      />

      <CostCharts
        costByRun={viewModel.costByRun}
        durationByModel={viewModel.durationByModel}
        copy={copy}
      />

      <CostDriverList drivers={viewModel.costByModel} copy={copy} />
      <CostAlertsList alerts={viewModel.costAlerts} copy={copy} />
      <CostCoverageCard
        nodesWithCostCount={viewModel.nodesWithCostCount}
        totalDuration={viewModel.totalDuration}
        copy={copy}
      />
    </RouteWorkbenchFrame>
  );
}
