import { DollarSign } from 'lucide-react';

import { ViewHeader, ViewStateOverlay } from '../components/domain';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { CostAlertsList } from './cost/CostAlertsList';
import { CostCharts } from './cost/CostCharts';
import { CostCoverageCard } from './cost/CostCoverageCard';
import { CostDriverList } from './cost/CostDriverList';
import { CostStatGrid } from './cost/CostStatGrid';
import { resolveCostViewCopy } from './cost/copy';
import { formatCurrency } from './cost/costViewModel';
import { useCostData } from './cost/useCostData';

export default function CostView() {
  const copy = resolveCostViewCopy();
  const { currentRun, isLoading, loadError, runsQuery, viewModel } = useCostData();

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <ViewHeader
          className="border-0 bg-transparent px-0 py-0"
          title={copy.title}
          icon={<DollarSign className="size-6 text-green-400" />}
          subtitle={
            <>
              {copy.subtitle}
              {currentRun ? (
                <span className="ml-2 text-slate-500">
                  {copy.focusedRun}: <span className="font-mono">{currentRun.runId}</span>
                </span>
              ) : null}
            </>
          }
          actions={
            viewModel.currentRunCost != null ? (
              <Badge className="bg-emerald-700 text-xs">
                {copy.currentRunEstimate} {formatCurrency(viewModel.currentRunCost)}
              </Badge>
            ) : undefined
          }
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
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
        </div>
      </ScrollArea>
    </div>
  );
}
