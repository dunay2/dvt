/** Owned concern: expose workspace-scope commands from an on-demand shell context surface. */
import { ChevronsUpDown } from 'lucide-react';

import type { WorkspaceBootstrapConfig } from '../../services/config/workspaceConfig';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { topAppBarClasses } from './chrome';
import { ShellWorkspaceSelectors } from './ShellWorkspaceSelectors';

export type ShellWorkspaceContextMenuProps = {
  readonly badge: ProjectIdentityBadge;
  readonly workspaceBootstrap: WorkspaceBootstrapConfig;
  readonly selectedTenant: string;
  readonly selectedProject: string;
  readonly selectedEnvironment: string;
  readonly setSelectedTenant: (tenantId: string) => void;
  readonly setSelectedProject: (projectId: string) => void;
  readonly setSelectedEnvironment: (environmentId: string) => void;
};

export function ShellWorkspaceContextMenu({
  badge,
  workspaceBootstrap,
  selectedTenant,
  selectedProject,
  selectedEnvironment,
  setSelectedTenant,
  setSelectedProject,
  setSelectedEnvironment,
}: ShellWorkspaceContextMenuProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          data-slot="shell-workspace-context-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
          aria-label="Change workspace scope"
        >
          <ChevronsUpDown className="size-4" />
          Scope
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
        <ShellWorkspaceSelectors
          workspaceBootstrap={workspaceBootstrap}
          selectedTenant={selectedTenant}
          selectedProject={selectedProject}
          selectedEnvironment={selectedEnvironment}
          setSelectedTenant={setSelectedTenant}
          setSelectedProject={setSelectedProject}
          setSelectedEnvironment={setSelectedEnvironment}
        />
      </PopoverContent>
    </Popover>
  );
}
