import { describe, expect, it } from 'vitest';

import type { RunSummaryItem } from '../../ports/runs';
import type { DbtNode } from '../../types/dbt';
import { buildCostViewModel, formatCurrency } from './costViewModel';

function buildNode(overrides?: Partial<DbtNode>): DbtNode {
  return {
    id: 'node-1',
    name: 'fct_sales',
    type: 'MODEL',
    package: 'analytics',
    path: 'models/fct_sales.sql',
    tags: [],
    status: 'success',
    dependencies: [],
    ...overrides,
  };
}

function buildRun(overrides?: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_1',
    status: 'completed',
    startedAt: '2026-04-04T10:00:00Z',
    ...overrides,
  };
}

describe('costViewModel', () => {
  it('builds the expected aggregate values', () => {
    const model = buildCostViewModel(
      [
        buildNode({ id: 'node-1', name: 'fct_sales', lastCost: 0.9, lastDuration: 30 }),
        buildNode({ id: 'node-2', name: 'dim_store', lastCost: 0.2, lastDuration: 12 }),
      ],
      [buildRun(), buildRun({ runId: 'run_2' })],
      true
    );

    expect(model.totalCost).toBe(1.1);
    expect(model.totalDuration).toBe(42);
    expect(model.averageCostPerRun).toBe(0.55);
    expect(model.currentRunCost).toBeCloseTo(0.0825);
    expect(model.costAlerts).toHaveLength(1);
    expect(model.costByModel[0]?.name).toBe('fct_sales');
  });

  it('handles empty runs without dividing by zero', () => {
    const model = buildCostViewModel([buildNode({ lastCost: 0.5, lastDuration: 10 })], [], false);

    expect(model.averageCostPerRun).toBe(0.5);
    expect(model.currentRunCost).toBeNull();
    expect(model.costByRun).toEqual([]);
  });

  it('formats currency consistently', () => {
    expect(formatCurrency(1.234)).toBe('$1.23');
  });
});
