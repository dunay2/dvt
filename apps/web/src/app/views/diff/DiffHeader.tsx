import { GitCompare } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchHeaderBandClassName,
  routeWorkbenchMutedTextClassName,
  routeWorkbenchPanelClassName,
  routeWorkbenchSubtleTextClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { ViewHeader } from '../../components/domain';
import { cn } from '../../components/ui/utils';
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
    <div data-slot="diff-header" className={cn('space-y-4', routeWorkbenchHeaderBandClassName)}>
      <ViewHeader
        className="border-0 bg-transparent p-0"
        title={copy.title}
        subtitle={copy.subtitle}
        icon={<GitCompare className="size-6 text-[var(--status-info)]" />}
        actions={
          <Select
            value={compareMode}
            onValueChange={(value) => onCompareModeChange(value as DiffCompareMode)}
          >
            <SelectTrigger className={cn('w-[150px]', routeWorkbenchFieldClassName)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={routeWorkbenchPanelClassName}>
              <SelectItem value="git">{copy.compareModes.git}</SelectItem>
              <SelectItem value="run">{copy.compareModes.run}</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', routeWorkbenchMutedTextClassName)}>
            {copy.compareLabel}
          </span>
          <code className={cn('rounded px-2 py-1 text-sm font-mono', routeWorkbenchFieldClassName)}>
            {comparePreset.left}
          </code>
          <span className={routeWorkbenchSubtleTextClassName}>...</span>
          <code className={cn('rounded px-2 py-1 text-sm font-mono', routeWorkbenchFieldClassName)}>
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
