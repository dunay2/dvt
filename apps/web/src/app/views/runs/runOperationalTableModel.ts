/**
 * Owned concern: derive dense Runs table rows, filters, sorting, and URL state
 * from presentation-facing run summaries without owning runtime read authority.
 */
import type { RunSummaryItem, UiRunStatus } from '../../ports/runs';
import { isKnownRunField } from './runStatesModel';

const RUN_STATUS_FILTERS = [
  'all',
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
const RUN_SORT_COLUMNS = [
  'runId',
  'status',
  'startedAt',
  'duration',
  'environment',
  'gitSha',
] as const;

export type RunOperationalStatusFilter = (typeof RUN_STATUS_FILTERS)[number];
export type RunOperationalSortColumn = (typeof RUN_SORT_COLUMNS)[number];
export type RunOperationalSortDirection = 'asc' | 'desc';

export type RunOperationalTableFilters = {
  readonly status: RunOperationalStatusFilter;
  readonly query: string;
};

export type RunOperationalTableSort = {
  readonly columnId: RunOperationalSortColumn;
  readonly direction: RunOperationalSortDirection;
};

export type RunOperationalTableState = {
  readonly filters: RunOperationalTableFilters;
  readonly sort: RunOperationalTableSort;
};

export type RunOperationalRow = {
  readonly runId: string;
  readonly planId: string | null;
  readonly status: UiRunStatus;
  readonly substatus: string | null;
  readonly environment: string | null;
  readonly gitSha: string | null;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly startedAtLabel: string;
  readonly completedAtLabel: string;
  readonly durationMs: number | null;
  readonly durationLabel: string;
};

export const DEFAULT_RUN_OPERATIONAL_TABLE_STATE: RunOperationalTableState = {
  filters: { status: 'all', query: '' },
  sort: { columnId: 'startedAt', direction: 'desc' },
};

function formatDateTime(value: string | null): string {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString();
}

function durationBetween(startedAt: string, completedAt?: string): number | null {
  if (!completedAt) {
    return null;
  }

  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : null;
}

function formatDuration(durationMs: number | null): string {
  if (durationMs == null) {
    return '-';
  }

  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(1)} s`;
}

function compareText(left: string | null, right: string | null): number {
  return (left ?? '').localeCompare(right ?? '');
}

function compareNullableNumber(left: number | null, right: number | null): number {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }
  return left - right;
}

function matchesStatus(row: RunOperationalRow, status: RunOperationalStatusFilter): boolean {
  return status === 'all' || row.status === status;
}

function matchesQuery(row: RunOperationalRow, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [row.runId, row.planId, row.environment, row.gitSha, row.substatus]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

function isStatusFilter(value: string | null): value is RunOperationalStatusFilter {
  return RUN_STATUS_FILTERS.includes(value as RunOperationalStatusFilter);
}

function isSortColumn(value: string | null): value is RunOperationalSortColumn {
  return RUN_SORT_COLUMNS.includes(value as RunOperationalSortColumn);
}

function isSortDirection(value: string | null): value is RunOperationalSortDirection {
  return value === 'asc' || value === 'desc';
}

export function buildRunOperationalRows(runs: readonly RunSummaryItem[]): RunOperationalRow[] {
  return runs.map((run) => {
    const completedAt = run.completedAt ?? null;
    const durationMs = durationBetween(run.startedAt, completedAt ?? undefined);

    return {
      runId: run.runId,
      planId: isKnownRunField(run.planId) ? run.planId : null,
      status: run.status,
      substatus: run.substatus ?? null,
      environment: isKnownRunField(run.environment) ? run.environment : null,
      gitSha: isKnownRunField(run.gitSha) ? run.gitSha : null,
      startedAt: run.startedAt,
      completedAt,
      startedAtLabel: formatDateTime(run.startedAt),
      completedAtLabel: formatDateTime(completedAt),
      durationMs,
      durationLabel: formatDuration(durationMs),
    };
  });
}

export function filterRunOperationalRows(
  rows: readonly RunOperationalRow[],
  filters: RunOperationalTableFilters
): RunOperationalRow[] {
  return rows.filter(
    (row) => matchesStatus(row, filters.status) && matchesQuery(row, filters.query)
  );
}

export function sortRunOperationalRows(
  rows: readonly RunOperationalRow[],
  sort: RunOperationalTableSort
): RunOperationalRow[] {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...rows].sort((left, right) => {
    let result = 0;

    switch (sort.columnId) {
      case 'runId':
        result = compareText(left.runId, right.runId);
        break;
      case 'status':
        result = compareText(left.status, right.status);
        break;
      case 'startedAt':
        result = new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime();
        break;
      case 'duration':
        result = compareNullableNumber(left.durationMs, right.durationMs);
        break;
      case 'environment':
        result = compareText(left.environment, right.environment);
        break;
      case 'gitSha':
        result = compareText(left.gitSha, right.gitSha);
        break;
    }

    return result === 0 ? compareText(left.runId, right.runId) : result * direction;
  });
}

export function parseRunOperationalTableSearchParams(
  searchParams: URLSearchParams
): RunOperationalTableState {
  const status = searchParams.get('status');
  const sort = searchParams.get('sort');
  const direction = searchParams.get('dir');

  return {
    filters: {
      status: isStatusFilter(status) ? status : DEFAULT_RUN_OPERATIONAL_TABLE_STATE.filters.status,
      query: searchParams.get('q') ?? '',
    },
    sort: {
      columnId: isSortColumn(sort) ? sort : DEFAULT_RUN_OPERATIONAL_TABLE_STATE.sort.columnId,
      direction: isSortDirection(direction)
        ? direction
        : DEFAULT_RUN_OPERATIONAL_TABLE_STATE.sort.direction,
    },
  };
}

export function serializeRunOperationalTableSearchParams(
  state: RunOperationalTableState
): URLSearchParams {
  const params = new URLSearchParams();

  if (state.filters.status !== DEFAULT_RUN_OPERATIONAL_TABLE_STATE.filters.status) {
    params.set('status', state.filters.status);
  }
  if (state.filters.query.trim()) {
    params.set('q', state.filters.query.trim());
  }
  if (
    state.sort.columnId !== DEFAULT_RUN_OPERATIONAL_TABLE_STATE.sort.columnId ||
    state.sort.direction !== DEFAULT_RUN_OPERATIONAL_TABLE_STATE.sort.direction
  ) {
    params.set('sort', state.sort.columnId);
    params.set('dir', state.sort.direction);
  }

  return params;
}
