/**
 * Owned concern: derive run status presentation helpers from the runs port DTOs
 * without importing adapter internals.
 */
import type { RunSummaryItem } from '../../ports/runs';
import type { RunWorkspaceViewModel } from '../../services/runs/runWorkspaceFacade';

export function isKnownRunField(value: string | undefined): value is string {
  return Boolean(value && value !== 'unknown' && value !== 'unknown-plan');
}

export function getRunStatusTone(status: RunSummaryItem['status']) {
  if (status === 'completed') {
    return 'bg-green-600';
  }
  if (status === 'running') {
    return 'bg-blue-600';
  }
  if (status === 'failed') {
    return 'bg-red-600';
  }
  return '';
}

export function getDetailStateBadge(detailState: RunWorkspaceViewModel['detailState']) {
  return detailState === 'snapshot-plus-events' ? 'snapshot+timeline' : 'snapshot-only';
}
