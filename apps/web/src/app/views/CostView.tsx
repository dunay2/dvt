/** Owned concern: render the Cost route workbench from protected runtime cost attribution read models. */
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
import { COST_ROUTE_ID, deriveCostRouteBootstrapPresentation } from './cost/costRouteBootstrap';
import { useCostData } from './cost/useCostData';

export default function CostView() {
  const copy = resolveCostViewCopy();
  const { currentRun, isLoading, loadError, viewModel } = useCostData();
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
            icon={<DollarSign className="size-6 text-[var(--status-warning)]" />}
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
              <Badge
                data-slot="cost-capture-unavailable"
                variant="outline"
                className="border-[color:var(--status-warning)] text-xs text-[var(--status-warning)]"
              >
                {copy.costCaptureUnavailable}
              </Badge>
            }
          />
        </div>
      }
      bodyContainerClassName="space-y-6"
      slots={{
        primarySurface: (
          <>
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
              totalCostLabel={viewModel.totalCostLabel}
              runCount={viewModel.runCount}
              completedStepCount={viewModel.completedStepCount}
              failedStepCount={viewModel.failedStepCount}
              copy={copy}
            />

            <CostCharts
              durationByRun={viewModel.durationByRun}
              durationByStep={viewModel.durationByStep}
              copy={copy}
            />

            <CostDriverList drivers={viewModel.costByModel} copy={copy} />
            <CostAlertsList alerts={viewModel.costAlerts} copy={copy} />
            <CostCoverageCard
              stepsWithUsageCount={viewModel.stepsWithUsageCount}
              totalDurationSeconds={viewModel.totalDurationSeconds}
              observedWindowLabel={viewModel.observedWindowLabel}
              copy={copy}
            />
          </>
        ),
      }}
    />
  );
}
