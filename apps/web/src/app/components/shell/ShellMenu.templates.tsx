/**
 * Owned concern: present shell menu entries without owning navigation or command authority.
 * @baseline GH-3622: project context and global navigation have distinct owners.
 * @decision Reuse the existing Radix primitives and shell navigation read model.
 * @consequence Controllers dispatch; templates render localized labels and semantic styles.
 * @version 1.0.0
 */
import { NavLink } from 'react-router';
import type { RefObject } from 'react';
import {
  Activity,
  BriefcaseBusiness,
  Folder,
  FolderPlus,
  Languages,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellNavigationModel } from '../../shell/shellNavigationModel';
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

export function ShellNavigationEntriesTemplate({
  navigationModel,
  label,
  onNavigate,
}: Readonly<{
  navigationModel: ShellNavigationModel;
  label: string;
  onNavigate: (to: string) => void;
}>) {
  return (
    <>
      <DropdownMenuLabel>{label}</DropdownMenuLabel>
      {[...navigationModel.primaryItems, ...navigationModel.footerItems].map((item) => {
        const Icon = item.icon;
        return (
          <DropdownMenuItem key={item.to} asChild>
            <NavLink
              data-slot="shell-menu-navigation-link"
              to={item.to}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.to);
              }}
            >
              <Icon aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
              {item.label}
            </NavLink>
          </DropdownMenuItem>
        );
      })}
      <DropdownMenuSeparator />
    </>
  );
}

export function ShellProjectMenuTemplate({
  open,
  onOpenChange,
  copy,
  badge,
  gitBranch,
  gitSha,
  onScopeSelected,
}: MenuLifecycle &
  Readonly<{
    copy: ShellTopBarCopy;
    badge: ProjectIdentityBadge;
    gitBranch: string;
    gitSha: string;
    onScopeSelected: () => void;
  }>) {
  const hasKnownGitContext = gitBranch !== 'detached' || gitSha !== 'unknown';
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          data-slot="shell-workspace-menu-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          <BriefcaseBusiness aria-hidden="true" className={topAppBarClasses.menuTriggerIcon} />
          {`${copy.projectScope}: ${badge.projectLabel}`}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={topAppBarClasses.contextMenuContent}>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShellFileMenuTemplate({
  open,
  onOpenChange,
  copy,
  newProjectLabel,
  triggerRef,
  onNewProject,
  onProjectCodeSelected,
  onSnapshotFileSelected,
  onCloseAutoFocus,
}: MenuLifecycle &
  Readonly<{
    copy: ShellTopBarCopy;
    newProjectLabel: string;
    triggerRef: RefObject<HTMLButtonElement>;
    onNewProject: () => void;
    onProjectCodeSelected: () => void;
    onSnapshotFileSelected: () => void;
    onCloseAutoFocus: (event: Event) => void;
  }>) {
  return (
    <DropdownMenu modal={false} open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          ref={triggerRef}
          data-slot="shell-file-menu-trigger"
          variant="ghost"
          size="sm"
          className={topAppBarClasses.menuButton}
        >
          <Folder aria-hidden="true" className={topAppBarClasses.menuTriggerIcon} />
          {copy.fileMenu}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={topAppBarClasses.contextMenuContent}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DropdownMenuItem data-slot="shell-new-project-command" onSelect={onNewProject}>
          <FolderPlus aria-hidden="true" className={topAppBarClasses.menuItemIcon} />
          {newProjectLabel}
        </DropdownMenuItem>
        <CanvasWorkspaceMenuControls
          onProjectCodeSelected={onProjectCodeSelected}
          onSnapshotFileSelected={onSnapshotFileSelected}
        />
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
