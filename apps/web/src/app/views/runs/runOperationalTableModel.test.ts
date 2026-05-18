import { describe, expect, it } from 'vitest';

import type { RunSummaryItem } from '../../ports/runs';
import {
  buildRunOperationalRows,
  filterRunOperationalRows,
  parseRunOperationalTableSearchParams,
  serializeRunOperationalTableSearchParams,
  sortRunOperationalRows,
} from './runOperationalTableModel';

function buildRun(overrides: Partial<RunSummaryItem>): RunSummaryItem {
  return {
    runId: 'run_1',
    planId: 'plan_1',
    status: 'running',
    environment: 'dev',
    gitSha: 'abc123',
    startedAt: '2026-05-18T10:00:00.000Z',
    ...overrides,
  };
}

describe('runOperationalTableModel', () => {
  it('derives stable row semantics without mutating run summaries', () => {
    const source = buildRun({
      runId: 'run_completed',
      status: 'completed',
      startedAt: '2026-05-18T10:00:00.000Z',
      completedAt: '2026-05-18T10:00:05.250Z',
    });

    const rows = buildRunOperationalRows([source]);

    expect(rows).toEqual([
      expect.objectContaining({
        runId: 'run_completed',
        status: 'completed',
        environment: 'dev',
        gitSha: 'abc123',
        durationMs: 5250,
        durationLabel: '5.3 s',
      }),
    ]);
    expect(source.completedAt).toBe('2026-05-18T10:00:05.250Z');
  });

  it('filters by status and case-insensitive operational text', () => {
    const rows = buildRunOperationalRows([
      buildRun({ runId: 'run_failed', status: 'failed', environment: 'prod', gitSha: 'f00bad' }),
      buildRun({ runId: 'run_ok', status: 'completed', environment: 'dev', gitSha: 'abc123' }),
      buildRun({
        runId: 'run_pending',
        status: 'pending',
        environment: undefined,
        gitSha: undefined,
      }),
    ]);

    expect(
      filterRunOperationalRows(rows, { status: 'failed', query: 'PROD' }).map((row) => row.runId)
    ).toEqual(['run_failed']);
    expect(
      filterRunOperationalRows(rows, { status: 'all', query: 'abc' }).map((row) => row.runId)
    ).toEqual(['run_ok']);
    expect(filterRunOperationalRows(rows, { status: 'pending', query: 'prod' })).toEqual([]);
  });

  it('sorts deterministically by started time, status, and duration', () => {
    const rows = buildRunOperationalRows([
      buildRun({ runId: 'run_old', status: 'running', startedAt: '2026-05-18T08:00:00.000Z' }),
      buildRun({
        runId: 'run_new',
        status: 'failed',
        startedAt: '2026-05-18T12:00:00.000Z',
        completedAt: '2026-05-18T12:01:00.000Z',
      }),
      buildRun({
        runId: 'run_mid',
        status: 'completed',
        startedAt: '2026-05-18T10:00:00.000Z',
        completedAt: '2026-05-18T10:00:10.000Z',
      }),
    ]);

    expect(
      sortRunOperationalRows(rows, { columnId: 'startedAt', direction: 'desc' }).map(
        (row) => row.runId
      )
    ).toEqual(['run_new', 'run_mid', 'run_old']);
    expect(
      sortRunOperationalRows(rows, { columnId: 'status', direction: 'asc' }).map((row) => row.runId)
    ).toEqual(['run_mid', 'run_new', 'run_old']);
    expect(
      sortRunOperationalRows(rows, { columnId: 'duration', direction: 'desc' }).map(
        (row) => row.runId
      )
    ).toEqual(['run_new', 'run_mid', 'run_old']);
  });

  it('keeps status, search, and sort URL-stable with invalid input fallback', () => {
    const parsed = parseRunOperationalTableSearchParams(
      new URLSearchParams('status=failed&q=prod&sort=status&dir=asc')
    );

    expect(parsed).toEqual({
      filters: { status: 'failed', query: 'prod' },
      sort: { columnId: 'status', direction: 'asc' },
    });
    expect(
      parseRunOperationalTableSearchParams(
        new URLSearchParams('status=blocked&sort=unknown&dir=sideways')
      )
    ).toEqual({
      filters: { status: 'all', query: '' },
      sort: { columnId: 'startedAt', direction: 'desc' },
    });
    expect(serializeRunOperationalTableSearchParams(parsed).toString()).toBe(
      'status=failed&q=prod&sort=status&dir=asc'
    );
  });
});
