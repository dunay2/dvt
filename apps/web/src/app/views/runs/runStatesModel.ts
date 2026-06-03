/**
 * Owned concern: derive run status presentation helpers from the runs port DTOs
 * without importing adapter internals.
 */
import type { RunSummaryItem } from '../../ports/runs';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';
import { getRouteWorkbenchStatusToneClassName } from '../../components/workbench/routeWorkbenchTableTokens';

export function isKnownRunField(value: string | undefined): value is string {
  return Boolean(value && value !== 'unknown' && value !== 'unknown-plan');
}

export function getRunStatusTone(status: RunSummaryItem['status']) {
  if (status === 'completed') {
    return getRouteWorkbenchStatusToneClassName('success');
  }
  if (status === 'running') {
    return getRouteWorkbenchStatusToneClassName('running');
  }
  if (status === 'failed') {
    return getRouteWorkbenchStatusToneClassName('danger');
  }
  return getRouteWorkbenchStatusToneClassName('neutral');
}

export function getDetailStateBadge(detailState: RunWorkspaceViewModel['detailState']) {
  return detailState === 'snapshot-plus-events' ? 'snapshot+timeline' : 'snapshot-only';
}
