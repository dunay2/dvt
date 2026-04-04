import { GitCompare } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ViewHeader } from '../../components/domain';
import { diffViewCopy as copy } from './copy';
import type { DiffCompareMode, DiffSeverityFilter } from './diffViewModel';

interface DiffHeaderProps {
  compareMode: DiffCompareMode;
  severityFilter: DiffSeverityFilter;
  comparePreset: { left: string; right: string };
  onCompareModeChange: (mode: DiffCompareMode) => void;
  onSeverityFilterChange: (filter: DiffSeverityFilter) => void;
}

export function DiffHeader({
  compareMode,
  severityFilter,
  comparePreset,
  onCompareModeChange,
  onSeverityFilterChange,
}: DiffHeaderProps) {
  return (
    <div className="space-y-4 border-b border-slate-700 bg-slate-900 px-6 py-4">
      <ViewHeader
        className="border-0 bg-transparent p-0"
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<GitCompare className="size-6 text-blue-400" />}
        actions={
          <Select
            value={compareMode}
            onValueChange={(value) => onCompareModeChange(value as DiffCompareMode)}
          >
            <SelectTrigger className="w-[150px] border-slate-600 bg-slate-950 text-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-600 bg-slate-900 text-slate-50">
              <SelectItem value="git">{copy.compareModes.git}</SelectItem>
              <SelectItem value="run">{copy.compareModes.run}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-300">{copy.compareLabel}</span>
          <code className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-50">
            {comparePreset.left}
          </code>
          <span className="text-slate-400">...</span>
          <code className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-slate-50">
            {comparePreset.right}
          </code>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant={severityFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSeverityFilterChange('all')}
          >
            {copy.allChanges}
          </Button>
          <Button
            variant={severityFilter === 'breaking' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSeverityFilterChange('breaking')}
          >
            {copy.breakingOnly}
          </Button>
          <Badge variant="outline">{severityFilter}</Badge>
        </div>
      </div>
    </div>
  );
}
