import type { DiffChange } from '../../types/dbt';

export type DiffCompareMode = 'git' | 'run';
export type DiffSeverityFilter = 'all' | 'breaking' | 'warning';

export interface DiffSummary {
  added: number;
  removed: number;
  changed: number;
  breaking: number;
}

export function filterDiffChanges(
  changes: DiffChange[],
  severity: DiffSeverityFilter
): DiffChange[] {
  if (severity === 'all') {
    return changes;
  }
  return changes.filter((change) => change.severity === severity);
}

export function buildDiffSummary(changes: DiffChange[]): DiffSummary {
  return {
    added: changes.filter((change) => change.type === 'added').length,
    removed: changes.filter((change) => change.type === 'removed').length,
    changed: changes.filter((change) => change.type === 'changed').length,
    breaking: changes.filter((change) => change.severity === 'breaking').length,
  };
}

export function getComparePreset(mode: DiffCompareMode): { left: string; right: string } {
  if (mode === 'run') {
    return { left: 'run_124', right: 'run_125' };
  }
  return { left: 'a3f2b91', right: 'b7e4c22' };
}
