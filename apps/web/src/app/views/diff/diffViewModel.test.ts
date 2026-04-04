import { describe, expect, it } from 'vitest';

import type { DiffChange } from '../../types/dbt';
import { buildDiffSummary, filterDiffChanges, getComparePreset } from './diffViewModel';

function buildChange(overrides?: Partial<DiffChange>): DiffChange {
  return {
    id: '1',
    nodeId: 'model.analytics.orders',
    type: 'changed',
    severity: 'warning',
    description: 'Column type changed',
    ...overrides,
  };
}

describe('diffViewModel', () => {
  it('filters by severity', () => {
    const changes = [
      buildChange({ severity: 'breaking' }),
      buildChange({ id: '2', severity: 'warning' }),
    ];
    expect(filterDiffChanges(changes, 'breaking')).toHaveLength(1);
  });

  it('returns all changes when filter is all', () => {
    const changes = [buildChange(), buildChange({ id: '2', severity: 'breaking' })];
    expect(filterDiffChanges(changes, 'all')).toHaveLength(2);
  });

  it('builds summary counters by change type', () => {
    const summary = buildDiffSummary([
      buildChange({ type: 'added' }),
      buildChange({ id: '2', type: 'removed' }),
      buildChange({ id: '3', type: 'changed' }),
    ]);
    expect(summary.added).toBe(1);
    expect(summary.removed).toBe(1);
    expect(summary.changed).toBe(1);
  });

  it('counts breaking severities in summary', () => {
    const summary = buildDiffSummary([
      buildChange({ severity: 'breaking' }),
      buildChange({ id: '2', severity: 'warning' }),
    ]);
    expect(summary.breaking).toBe(1);
  });

  it('returns compare preset by mode', () => {
    expect(getComparePreset('git')).toEqual({ left: 'a3f2b91', right: 'b7e4c22' });
    expect(getComparePreset('run')).toEqual({ left: 'run_124', right: 'run_125' });
  });
});
