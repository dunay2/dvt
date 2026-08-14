/** Owned concern: render top-bar workspace navigation and view-control menus without owning route behavior. */
import {
  Activity,
  BriefcaseBusiness,
  FolderPlus,
  Languages,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router';
import { useRef, useState } from 'react';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellNavigationModel } from '../../shell/shellNavigationModel';
import { CanvasWorkspaceMenuControls } from '../../views/canvas/CanvasWorkspaceMenuControls';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { resolveProjectOnboardingCopy } from '../../views/projectOnboardingCopy';
import { ProjectCreationDialog } from '../../views/projectAdmission/ProjectCreationDialog';
import { Button } from '../ui/button';
import type { ShellViewControlsReadModel } from './shellViewControlsModel';
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
import { ShellWorkspaceContextDetails } from './ShellWorkspaceContextDetails';
import { ShellWorkspaceScopeSelector } from './ShellWorkspaceScopeSelector';

type ShellMenuProps = {
  readonly kind: 'workspace' | 'view';
  readonly viewControls: ShellViewControlsReadModel;
  readonly bottomDrawerVisible: boolean;
  readonly focusMode: boolean;
  readonly navigationModel: ShellNavigationModel;
  readonly projectIdentityBadge: ProjectIdentityBadge;
  readonly gitBranch: string;
  readonly gitSha: string;
  readonly toggleBottomDrawer: () => void;
  readonly toggleFocusMode: () => void;
  readonly copy: ShellTopBarCopy;
};

export function ShellMenu({
  kind,
  viewControls,
  bottomDrawerVisible,
  focusMode,
  navigationModel,
  projectIdentityBadge,
  gitBranch,
  gitSha,
  toggleBottomDrawer,
  toggleFocusMode,
  copy,
}: ShellMenuProps) {
  const [open, setOpen] = useState(false);
  const [projectCreationDialogOpen, setProjectCreationDialogOpen] = useState(false);
  const preventWorkspaceFocusRestoreRef = useRef(false);
  const workspaceMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const applicationLanguage = useApplicationLanguageStore((state) => state.language);
  const configureApplicationLanguage = useApplicationLanguageStore(
    (state) => state.configureApplicationLanguage
  );
  const projectCopy = resolveProjectOnboardingCopy(applicationLanguage);
  const isWorkspaceMenu = kind === 'workspace';
  const hasKnownGitContext = gitBranch !== 'detached' || gitSha !== 'unknown';

  function handleProjectCreationDialogOpenChange(nextOpen: boolean) {
    setProjectCreationDialogOpen(nextOpen);
    if (!nextOpen) {
      globalThis.setTimeout(() => workspaceMenuTriggerRef.current?.focus(), 0);
    }
  }

  return (
    <>
      <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={isWorkspaceMenu ? workspaceMenuTriggerRef : undefined}
            data-slot={isWorkspaceMenu ? 'shell-workspace-menu-trigger' : 'shell-menu-trigger'}
            variant="ghost"
            size="sm"
            className={topAppBarClasses.menuButton}
          >
            {isWorkspaceMenu ? (
              <BriefcaseBusiness className="size-4" />
            ) : (
              <SlidersHorizontal className="size-4" />
            )}
            {isWorkspaceMenu
              ? `${copy.projectScope}: ${projectIdentityBadge.projectLabel}`
              : copy.shell}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72"
          onCloseAutoFocus={(event) => {
            if (preventWorkspaceFocusRestoreRef.current) {
              event.preventDefault();
              preventWorkspaceFocusRestoreRef.current = false;
            }
          }}
        >
          {isWorkspaceMenu ? (
            <>
              <DropdownMenuLabel>{copy.globalNavigation}</DropdownMenuLabel>
              {[...navigationModel.primaryItems, ...navigationModel.footerItems].map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.to} asChild>
                    <NavLink
                      data-slot="shell-menu-navigation-link"
                      to={item.to}
                      onClick={(event) => {
                        event.preventDefault();
                        setOpen(false);
                        void navigate(item.to, { flushSync: true });
                      }}
                    >
                      <Icon className="mr-2 size-4" />
                      {item.label}
                    </NavLink>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{copy.workspaceContext}</DropdownMenuLabel>
              <div data-slot="shell-menu-workspace-context" className="px-2 py-1.5">
                <ShellWorkspaceContextDetails badge={projectIdentityBadge} copy={copy} />
                <ShellWorkspaceScopeSelector copy={copy} onScopeSelected={() => setOpen(false)} />
              </div>
              <DropdownMenuItem
                data-slot="shell-new-project-command"
                onSelect={() => {
                  preventWorkspaceFocusRestoreRef.current = true;
                  setOpen(false);
                  setProjectCreationDialogOpen(true);
                }}
              >
                <FolderPlus className="mr-2 size-4" />
                {projectCopy.newProjectActionLabel}
              </DropdownMenuItem>
              {hasKnownGitContext ? (
                <>
                  <DropdownMenuLabel>{copy.gitContext}</DropdownMenuLabel>
                  <div
                    data-slot="shell-menu-git-context"
                    className="px-2 pb-2 text-xs text-(--text-subtle)"
                  >
                    <span>{gitBranch}</span>
                    <span className="px-1">@</span>
                    <code className="text-(--text-default)">{gitSha}</code>
                  </div>
                </>
              ) : null}
              <CanvasWorkspaceMenuControls
                onProjectCodeSelected={() => {
                  preventWorkspaceFocusRestoreRef.current = true;
                  setOpen(false);
                }}
              />
            </>
          ) : (
            <>
              <DropdownMenuLabel>{copy.workspacePanels}</DropdownMenuLabel>
              {viewControls.showBottomDrawerToggle ? (
                <DropdownMenuCheckboxItem
                  checked={bottomDrawerVisible}
                  onCheckedChange={toggleBottomDrawer}
                >
                  <Activity className="mr-2 size-4" />
                  {copy.operationalDrawer}
                </DropdownMenuCheckboxItem>
              ) : null}
              {viewControls.showFocusModeToggle ? (
                <DropdownMenuCheckboxItem checked={focusMode} onCheckedChange={toggleFocusMode}>
                  {focusMode ? (
                    <Minimize2 className="mr-2 size-4" />
                  ) : (
                    <Maximize2 className="mr-2 size-4" />
                  )}
                  {copy.focusMode}
                </DropdownMenuCheckboxItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{copy.viewOptions}</DropdownMenuLabel>
              <DropdownMenuLabel data-slot="shell-language-menu" className="flex items-center">
                <Languages className="mr-2 size-4" />
                {copy.language}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={applicationLanguage}
                onValueChange={(language) => {
                  if (language === 'en' || language === 'es') {
                    configureApplicationLanguage(language);
                    setOpen(false);
                  }
                }}
              >
                <DropdownMenuRadioItem data-slot="shell-language-option-en" value="en">
                  {copy.languageEnglish}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem data-slot="shell-language-option-es" value="es">
                  {copy.languageSpanish}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {isWorkspaceMenu && projectCreationDialogOpen ? (
        <ProjectCreationDialog
          onOpenChange={handleProjectCreationDialogOpenChange}
          open={projectCreationDialogOpen}
          returnFocusRef={workspaceMenuTriggerRef}
        />
      ) : null}
    </>
  );
}
