import { GitGraph, Pin, Search } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { ViewHeader } from '../../components/domain';
import { lineageViewCopy as copy } from './copy';

interface LineageHeaderProps {
  searchQuery: string;
  columnLevel: boolean;
  isLoading: boolean;
  nodeCount: number;
  onSearchQueryChange: (value: string) => void;
  onColumnLevelChange: (value: boolean) => void;
}

export function LineageHeader({
  searchQuery,
  columnLevel,
  isLoading,
  nodeCount,
  onSearchQueryChange,
  onColumnLevelChange,
}: LineageHeaderProps) {
  return (
    <div className="space-y-4 border-b border-slate-700 bg-slate-900 px-6 py-4">
      <ViewHeader
        className="border-0 bg-transparent p-0"
        title={copy.title}
        icon={<GitGraph className="size-6 text-purple-400" />}
        subtitle={
          isLoading ? (
            <span className="text-xs text-slate-400">{copy.loading}</span>
          ) : (
            <span className="text-xs text-slate-500">
              {nodeCount} {copy.nodesSuffix}
            </span>
          )
        }
      />
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className="border-slate-600 bg-slate-950 pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch id="column-level" checked={columnLevel} onCheckedChange={onColumnLevelChange} />
          <Label htmlFor="column-level" className="cursor-pointer text-sm">
            {copy.columnSwitch}
          </Label>
        </div>
        <Button variant="outline" size="sm" disabled>
          <Pin className="mr-2 size-4" />
          {copy.pinToCanvas}
        </Button>
      </div>
    </div>
  );
}
