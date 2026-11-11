/**
 * Owned concern: present shell menu entries without owning navigation or command authority.
 * @baseline GH-3622: project context and global navigation have distinct owners.
 * @decision Reuse the existing Radix primitives and shell navigation read model.
 * @consequence Controllers dispatch; templates render localized labels and semantic styles.
 * @version 1.0.0
 */
import type { RefObject } from 'react';
import {
  Activity,
  FolderCog,
  FolderPlus,
  Languages,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { Trigger as RailMenuTrigger } from '@radix-ui/react-dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import navigationStyles from '../LeftNavigation.module.css';
import { CanvasWorkspaceMenuControls } from '../../views/canvas/CanvasWorkspaceMenuControls';
import { CanvasExplorerViewMenu } from '../../views/canvas/explorer/CanvasExplorerViewMenu';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';
import type { ShellViewControlsReadModel } from './shellViewControlsModel';
import { ShellWorkspaceContextDetails } from './ShellWorkspaceContextDetails';
import { ShellWorkspaceScopeSelector } from './ShellWorkspaceScopeSelector';

type MenuLifecycle = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>;

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
}: MenuLifecycle &
  Readonly<{
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
        <DropdownMenuLabel>{copy.workspaceContext}</DropdownMenuLabel>
        <div data-slot="shell-menu-workspace-context" className={topAppBarClasses.menuContextBody}>
          <ShellWorkspaceContextDetails badge={badge} copy={copy} />
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

export function ShellViewMenuTemplate({
  open,
  onOpenChange,
  copy,
  viewControls,
  bottomDrawerVisible,
  focusMode,
  applicationLanguage,
  onToggleBottomDrawer,
  onToggleFocusMode,
  onLanguageSelected,
  onCloseAutoFocus,
}: MenuLifecycle &
  Readonly<{
    copy: ShellTopBarCopy;
    viewControls: ShellViewControlsReadModel;
    bottomDrawerVisible: boolean;
    focusMode: boolean;
    applicationLanguage: 'en' | 'es';
    onToggleBottomDrawer: () => void;
    onToggleFocusMode: () => void;
    onLanguageSelected: (language: string) => void;
    onCloseAutoFocus: (event: Event) => void;
  }>) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="shell-menu-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          <SlidersHorizontal aria-hidden="true" className={topAppBarClasses.menuTriggerIcon} />
          {copy.shell}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={topAppBarClasses.contextMenuContent}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuLabel>{copy.workspacePanels}</DropdownMenuLabel>
        <CanvasExplorerViewMenu />
        {viewControls.showBottomDrawerToggle ? (
          <DropdownMenuCheckboxItem
            checked={bottomDrawerVisible}
            onCheckedChange={onToggleBottomDrawer}
          >
            <Activity aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            {copy.operationalDrawer}
          </DropdownMenuCheckboxItem>
        ) : null}
        {viewControls.showFocusModeToggle ? (
          <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={onToggleFocusMode}>
            {focusMode ? (
              <Minimize2 aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            ) : (
              <Maximize2 aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
            )}
            {copy.focusMode}
          </DropdownMenuCheckboxItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{copy.viewOptions}</DropdownMenuLabel>
        <DropdownMenuLabel
          data-slot="shell-language-menu"
          className={topAppBarClasses.menuLanguageLabel}
        >
          <Languages aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
          {copy.language}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={applicationLanguage} onValueChange={onLanguageSelected}>
          <DropdownMenuRadioItem data-slot="shell-language-option-en" value="en">
            {copy.languageEnglish}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem data-slot="shell-language-option-es" value="es">
            {copy.languageSpanish}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
