/**
 * Owned concern: host Runs list query results, URL-stable table state, and
 * navigation while delegating dense row semantics to the Runs table component.
 */
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { WorkbenchStateFrame } from '../../components/workbench/state/WorkbenchStates';
import type { RunSummaryItem } from '../../ports/runs';
import { RunOperationalTable } from './RunOperationalTable';
import {
  buildRunOperationalRows,
  filterRunOperationalRows,
  parseRunOperationalTableSearchParams,
  serializeRunOperationalTableSearchParams,
  sortRunOperationalRows,
  type RunOperationalTableFilters,
  type RunOperationalTableSort,
} from './runOperationalTableModel';
import { useRunStatesCopy } from './runStatesCopy';
import type { RunControlCommandController } from './useRunControlCommands';

type RunListStateProps = {
  runs: RunSummaryItem[];
  isLoading?: boolean;
  runControls?: RunControlCommandController;
};

export function RunListStateView({ runs, isLoading, runControls }: RunListStateProps) {
  const { copy, language } = useRunStatesCopy();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableState = useMemo(
    () => parseRunOperationalTableSearchParams(searchParams),
    [searchParams]
  );
  const rows = useMemo(() => {
    const builtRows = buildRunOperationalRows(runs, language);
    const filteredRows = filterRunOperationalRows(builtRows, tableState.filters);
    return sortRunOperationalRows(filteredRows, tableState.sort);
  }, [language, runs, tableState.filters, tableState.sort]);
  const updateTableState = (filters: RunOperationalTableFilters, sort: RunOperationalTableSort) => {
    setSearchParams(serializeRunOperationalTableSearchParams({ filters, sort }));
  };

  return (
    <WorkbenchStateFrame title={copy.runsTitle} slotPrefix="runs-state">
      <div className="mx-auto max-w-6xl space-y-4">
        <RunOperationalTable
          rows={rows}
          filters={tableState.filters}
          sort={tableState.sort}
          onFiltersChange={(filters) => updateTableState(filters, tableState.sort)}
          onSortChange={(sort) => updateTableState(tableState.filters, sort)}
          onOpenRun={(runId) => {
            void navigate(`/runs/${runId}`);
          }}
          runControls={runControls}
          isLoading={isLoading}
        />
      </div>
    </WorkbenchStateFrame>
  );
}
