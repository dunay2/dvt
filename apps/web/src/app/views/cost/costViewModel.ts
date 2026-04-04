import type { RunSummaryItem } from '../../ports/runs';
import type { DbtNode } from '../../types/dbt';

export type CostDriver = {
  readonly name: string;
  readonly cost: number;
  readonly duration: number;
  readonly status: DbtNode['status'];
};

export type CostAlert = {
  readonly id: string;
  readonly title: string;
  readonly description: string;
};

export type CostViewModel = {
  readonly nodesWithCostCount: number;
  readonly totalCost: number;
  readonly totalDuration: number;
  readonly averageCostPerRun: number;
  readonly costAlerts: CostAlert[];
  readonly currentRunCost: number | null;
  readonly costByModel: CostDriver[];
  readonly costByRun: ReadonlyArray<{ readonly name: string; readonly cost: number }>;
  readonly durationByModel: ReadonlyArray<{ readonly name: string; readonly duration: number }>;
};

export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function buildCostViewModel(
  workspaceNodes: DbtNode[],
  runs: RunSummaryItem[],
  hasCurrentRun: boolean
): CostViewModel {
  const nodesWithCost = workspaceNodes.filter((node) => typeof node.lastCost === 'number');
  const totalCost = nodesWithCost.reduce((sum, node) => sum + (node.lastCost ?? 0), 0);
  const totalDuration = nodesWithCost.reduce((sum, node) => sum + (node.lastDuration ?? 0), 0);
  const averageCostPerRun = runs.length > 0 ? totalCost / runs.length : totalCost;
  const expensiveNodes = nodesWithCost.filter((node) => (node.lastCost ?? 0) >= 0.4);
  const currentRunCost = hasCurrentRun ? averageCostPerRun * 0.15 : null;

  const costByModel = [...nodesWithCost]
    .sort((left, right) => (right.lastCost ?? 0) - (left.lastCost ?? 0))
    .map((node) => ({
      name: node.name,
      cost: node.lastCost ?? 0,
      duration: node.lastDuration ?? 0,
      status: node.status,
    }));

  const costByRun = runs.map((run, index) => ({
    name: `Run ${index + 1}`,
    cost: averageCostPerRun,
  }));

  const durationByModel = costByModel.map((model) => ({
    name: model.name,
    duration: Number(model.duration.toFixed(1)),
  }));

  const costAlerts = expensiveNodes.map((node) => ({
    id: node.id,
    title: `${node.name} exceeded cost threshold`,
    description: `Last observed cost ${formatCurrency(node.lastCost ?? 0)} exceeded the warning threshold of $0.40.`,
  }));

  return {
    nodesWithCostCount: nodesWithCost.length,
    totalCost,
    totalDuration,
    averageCostPerRun,
    costAlerts,
    currentRunCost,
    costByModel,
    costByRun,
    durationByModel,
  };
}
