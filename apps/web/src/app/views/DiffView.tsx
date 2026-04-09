import { ScrollArea } from '../components/ui/scroll-area';
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
    <div className="flex h-full flex-col bg-slate-950 text-slate-50">
      <DiffHeader
        compareMode={compareMode}
        severityFilter={severityFilter}
        comparePreset={comparePreset}
        onCompareModeChange={setCompareMode}
        onSeverityFilterChange={setSeverityFilter}
      />
      <DiffSummaryCards summary={summary} />
      <ScrollArea className="flex-1">
        <div className="p-6">
          <DiffTabs
            catalogDocument={catalogDocument}
            changes={filteredChanges}
            sqlDocument={sqlDocument}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
