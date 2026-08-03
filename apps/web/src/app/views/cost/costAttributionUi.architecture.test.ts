/** Owned concern: guard Cost route authority against local monetary inference. */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const APP_ROOT = path.resolve(import.meta.dirname, '../..');

function readAppSource(relativePathFromApp: string): string {
  return readFileSync(path.join(APP_ROOT, relativePathFromApp), 'utf8');
}

describe('cost attribution UI architecture', () => {
  it('routes Cost view data through the CostAttributionSummary query rail', () => {
    const useCostData = readAppSource('views/cost/useCostData.ts');
    const costQueries = readAppSource('queries/costQueries.ts');
    const appServicesContext = readAppSource('services/AppServicesContext.tsx');
    const appServices = readAppSource('services/composition/appServices.ts');

    expect(useCostData).toContain('useCostAttributionSummaryQuery');
    expect(useCostData).toContain('buildCostViewModel(attributionSummaryQuery.data ?? null)');
    expect(useCostData).not.toContain('useWorkspaceGraphForViewQuery');
    expect(useCostData).not.toContain('lastCost');

    expect(costQueries).toContain('useCostAttributionSummaryPort');
    expect(costQueries).toContain('queryKeys.cost.attributionSummary');
    expect(appServicesContext).toContain('useCostAttributionSummaryPort');
    expect(appServices).toContain('createApiCostAttributionSummaryPort');
  });

  it('keeps Cost route presentation free from synthetic dollar estimation', () => {
    const costView = readAppSource('views/CostView.tsx');
    const costViewModel = readAppSource('views/cost/costViewModel.ts');
    const costDriverList = readAppSource('views/cost/CostDriverList.tsx');
    const costCharts = readAppSource('views/cost/CostCharts.tsx');
    const costOverlayModel = readAppSource('views/canvas/useCanvasOverlayModel.ts');

    for (const [modulePath, source] of [
      ['views/CostView.tsx', costView],
      ['views/cost/costViewModel.ts', costViewModel],
      ['views/cost/CostDriverList.tsx', costDriverList],
      ['views/cost/CostCharts.tsx', costCharts],
    ] as const) {
      expect(source, modulePath).not.toContain('formatCurrency');
      expect(source, modulePath).not.toContain('currentRunCost');
      expect(source, modulePath).not.toContain('averageCostPerRun');
      expect(source, modulePath).not.toContain('lastCost');
      expect(source, modulePath).not.toContain("'$");
      expect(source, modulePath).not.toContain('"$');
      expect(source, modulePath).not.toContain('USD');
      expect(source, modulePath).not.toContain('EUR');
    }

    expect(costViewModel).toContain(
      'totalCostLabel: formatMoneyAmount(summary.totalCostAmount, summary.currency)'
    );
    expect(costViewModel).toContain('return UNAVAILABLE_MONEY_LABEL');
    expect(costOverlayModel).not.toContain('node.lastCost');
    expect(costOverlayModel).toContain('new Map<string, NodeCostData>()');
  });
});
