/** Owned concern: expose active workspace scope as read-only shell context. */
import { ChevronsUpDown } from 'lucide-react';

import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import { ShellWorkspaceContextDetails } from './ShellWorkspaceContextDetails';

export type ShellWorkspaceContextMenuProps = {
  readonly badge: ProjectIdentityBadge;
  readonly copy: ShellTopBarCopy;
};

export function ShellWorkspaceContextMenu({ badge, copy }: ShellWorkspaceContextMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-slot="shell-workspace-context-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
          aria-label="Show workspace context"
        >
          <ChevronsUpDown className="size-4" />
          {copy.workspaceContext}
        </Button>
      </PopoverTrigger>
      <PopoverContent data-slot="shell-workspace-context-menu" align="start" className="w-80 p-3">
        <div className="mb-3 grid gap-1 border-b border-[color:var(--border-default)] pb-3">
          <div
            data-slot="shell-workspace-context-title"
            className="truncate text-sm font-medium text-[var(--text-strong)]"
          >
            {badge.projectLabel}
          </div>
          <div
            data-slot="shell-workspace-context-summary"
            className="truncate text-xs text-[var(--text-subtle)]"
          >
            {badge.tenantLabel} / {badge.environmentLabel} / {badge.draftPostureLabel}
          </div>
        </div>
        <ShellWorkspaceContextDetails badge={badge} copy={copy} />
      </PopoverContent>
    </Popover>
  );
}
