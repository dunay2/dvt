import { GitGraph, Pin, Search } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  routeWorkbenchFieldClassName,
  routeWorkbenchHeaderBandClassName,
} from '../../components/workbench/RouteWorkbenchFrame';
import { ViewHeader } from '../../components/domain';
import { cn } from '../../components/ui/utils';
import { lineageViewCopy as copy } from './copy';

interface LineageHeaderProps {
  searchQuery: string;
  isLoading: boolean;
  nodeCount: number;
  onSearchQueryChange: (value: string) => void;
}

export function LineageHeader({
  searchQuery,
  isLoading,
  nodeCount,
  onSearchQueryChange,
}: LineageHeaderProps) {
  return (
    <div className={cn('space-y-4', routeWorkbenchHeaderBandClassName)}>
      <ViewHeader
        className="border-0 bg-transparent p-0"
        title={copy.title}
        icon={<GitGraph className="size-6 text-[var(--status-info)]" />}
        subtitle={
          isLoading ? (
            <span className="text-xs text-[var(--text-muted)]">{copy.loading}</span>
          ) : (
            <span className="text-xs text-[var(--text-subtle)]">
              {nodeCount} {copy.nodesSuffix}
            </span>
          )
        }
      />
      <div className="flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className={cn(routeWorkbenchFieldClassName, 'pl-10')}
          />
        </div>
        <Button variant="outline" size="sm" disabled>
          <Pin className="mr-2 size-4" />
          {copy.pinToCanvas}
        </Button>
      </div>
    </div>
  );
}
