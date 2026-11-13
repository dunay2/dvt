/**
 * Owned concern: present project properties and project commands.
 * @reason Project authority and display preferences have separate owners.
 * @consequence Render existing callbacks without owning commands or persistence.
 */
import type { RefObject } from 'react';
import { FolderCog, FolderPlus } from 'lucide-react';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { Trigger as RailMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import navigationStyles from '../LeftNavigation.module.css';
import { CanvasWorkspaceMenuControls } from '../../views/canvas/CanvasWorkspaceMenuControls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import styles from './ShellWorkspaceContext.module.css';
import { ShellWorkspaceScopeSelector } from './ShellWorkspaceScopeSelector';

export function ShellProjectMenuTemplate({
  open,
  onOpenChange,
  copy,
  badge,
  gitBranch,
  gitSha,
  onScopeSelected,
  triggerRef,
  newProjectLabel,
  onNewProject,
  onSnapshotFileSelected,
  onCloseAutoFocus,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: ShellTopBarCopy;
  badge: ProjectIdentityBadge;
  gitBranch: string;
  gitSha: string;
  onScopeSelected: () => void;
  triggerRef: RefObject<HTMLButtonElement>;
  newProjectLabel: string;
  onNewProject: () => void;
  onSnapshotFileSelected: () => void;
  onCloseAutoFocus: (event: Event) => void;
}>) {
  const hasKnownGitContext = gitBranch !== 'detached' || gitSha !== 'unknown';
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <RailMenuTrigger asChild>
            <button
              ref={triggerRef}
              type="button"
              data-slot="shell-workspace-menu-trigger"
              aria-label={`${copy.projectSettings}: ${badge.projectLabel}`}
              className={`${navigationStyles.link} ${navigationStyles.linkInteractive}`}
            >
              <FolderCog aria-hidden="true" className={navigationStyles.icon} />
            </button>
          </RailMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">{`${copy.projectSettings}: ${badge.projectLabel}`}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="right"
        align="end"
        className={topAppBarClasses.contextMenuContent}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuLabel>{copy.projectSettings}</DropdownMenuLabel>
        <div data-slot="shell-menu-workspace-context" className={topAppBarClasses.menuContextBody}>
          <div data-slot="shell-workspace-deployment-context" className={styles.workspaceField}>
            <span className={topAppBarClasses.contextLabel}>{copy.deploymentScope}</span>
            <div
              aria-label={copy.deploymentScopeAria}
              className={topAppBarClasses.readOnlyScopeField}
            >
              {badge.targetAdapter}
            </div>
          </div>
          <ShellWorkspaceScopeSelector copy={copy} onScopeSelected={onScopeSelected} />
        </div>
        {hasKnownGitContext ? (
          <>
            <DropdownMenuLabel>{copy.gitContext}</DropdownMenuLabel>
            <div data-slot="shell-menu-git-context" className={topAppBarClasses.menuGitContext}>
              <span>{gitBranch}</span>
              <span className={topAppBarClasses.menuGitSeparator}>@</span>
              <code className={topAppBarClasses.gitRefSha}>{gitSha}</code>
            </div>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem data-slot="shell-new-project-command" onSelect={onNewProject}>
          <FolderPlus aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
          {newProjectLabel}
        </DropdownMenuItem>
        <CanvasWorkspaceMenuControls onSnapshotFileSelected={onSnapshotFileSelected} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
