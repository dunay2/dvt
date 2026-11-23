/**
 * Owned concern: resolve Runs detail destinations and tab history from the URL.
 * Corner: a stale Result link for an unfinished run opens its available summary.
 */
import { useLocation, useNavigate } from 'react-router';
import type { UiRunStatus } from '../../ports/runs';

type RunDetailTab = 'models' | 'summary' | 'result' | 'provenance' | 'diagnostics';

function runDetailHref(runId: string, tab: 'models' | 'result'): string {
  return `/runs/${encodeURIComponent(runId)}?tab=${tab}`;
}

export function runResultsHref(runId: string): string {
  return runDetailHref(runId, 'result');
}

export function runModelsHref(runId: string): string {
  return runDetailHref(runId, 'models');
}

export function canInspectRunResult(status: UiRunStatus): boolean {
  return status === 'completed';
}

function resolveTab(value: string | null, canInspectResult: boolean): RunDetailTab {
  if (value === 'models' || value === 'provenance' || value === 'diagnostics') return value;
  if (value === 'result' && canInspectResult) return value;
  return 'summary';
}

export function useRunDetailTabPosition(status: UiRunStatus) {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  const canInspectResult = canInspectRunResult(status);
  const selectedTab = resolveTab(search.get('tab'), canInspectResult);

  function selectTab(value: string): void {
    const nextTab = resolveTab(value, canInspectResult);
    if (nextTab === selectedTab) return;
    const nextSearch = new URLSearchParams(location.search);
    if (nextTab === 'summary') nextSearch.delete('tab');
    else nextSearch.set('tab', nextTab);
    void navigate(
      { pathname: location.pathname, search: nextSearch.toString(), hash: location.hash },
      { preventScrollReset: true }
    );
  }

  return { selectedTab, selectTab, canInspectResult };
}
