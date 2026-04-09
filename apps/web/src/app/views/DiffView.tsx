import { RouteWorkbenchFrame } from '../components/workbench/RouteWorkbenchFrame';
import { DiffHeader } from './diff/DiffHeader';
import { DiffSummaryCards } from './diff/DiffSummaryCards';
import { DiffTabs } from './diff/DiffTabs';
import { useDiffData } from './diff/useDiffData';

export default function DiffView() {
  const {
    catalogDocument,
    compareMode,
    severityFilter,
    filteredChanges,
    sqlDocument,
    summary,
    comparePreset,
    setCompareMode,
    setSeverityFilter,
  } = useDiffData();

  return (
    <RouteWorkbenchFrame
      header={
        <DiffHeader
          compareMode={compareMode}
          severityFilter={severityFilter}
          comparePreset={comparePreset}
          onCompareModeChange={setCompareMode}
          onSeverityFilterChange={setSeverityFilter}
        />
      }
      bodyClassName="space-y-6"
    >
      <DiffSummaryCards summary={summary} />
      <DiffTabs
        catalogDocument={catalogDocument}
        changes={filteredChanges}
        sqlDocument={sqlDocument}
      />
    </RouteWorkbenchFrame>
  );
}
