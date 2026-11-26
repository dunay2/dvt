/**
 * Owned concern: coordinate the single project context and configuration entry in the shell rail.
 * @baseline GH-3765: File duplicated Code navigation and split project actions from context.
 * @decision Compose existing scope, creation and snapshot owners with one focus lifecycle.
 * @consequence The shell neither grants permissions nor owns project persistence.
 * @version 1.1.0
 */
import { useRef, useState, type MouseEvent } from 'react';
import { GitFork } from 'lucide-react';
import { NavLink } from 'react-router';
import { useApplicationLanguageStore } from '../../stores/applicationLanguageStore';
import { canvasCodeRouteEntryState } from '../../views/canvas/CanvasCodeRouteEntry';
import { useCanvasWorkspaceMenuContributionStore } from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import { ProjectCreationDialog } from '../../views/projectAdmission/ProjectCreationDialog';
import { resolveProjectOnboardingCopy } from '../../views/projectOnboardingCopy';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import navigationStyles from '../LeftNavigation.module.css';
import type { ShellTopBarCopy } from './copy';
import { ShellProjectMenuTemplate } from './ShellProjectMenu.template';
import { useShellProjectIdentity } from './useShellProjectIdentity';

export function isDirectShellLinkActivation(event: MouseEvent<HTMLAnchorElement>): boolean {
  const hasModifier = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
  const isPrimary = !event.defaultPrevented && event.button === 0;
  return isPrimary && !hasModifier;
}

export function ShellProjectCodeLink({
  to,
  label,
  onCanvasRoute,
  foreground,
  onActivate,
}: Readonly<{
  to: string;
  label: string;
  onCanvasRoute: boolean;
  foreground: boolean;
  onActivate: () => void;
}>): JSX.Element {
  const tabActive = useCanvasWorkspaceMenuContributionStore(
    (state) => state.contribution?.codeTab?.active === true
  );
  const open = useCanvasWorkspaceMenuContributionStore((state) =>
    state.contribution?.canOpenProjectCode === true
      ? state.contribution.onOpenProjectCode
      : undefined
  );
  const presentation = projectCodeLinkPresentation({ onCanvasRoute, foreground, tabActive, open });

  function handleCodeLink(event: MouseEvent<HTMLAnchorElement>): void {
    if (!onCanvasRoute || !isDirectShellLinkActivation(event)) return;
    event.preventDefault();
    if (open == null) return;
    onActivate();
    open();
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          state={canvasCodeRouteEntryState}
          id="shell-project-code-command"
          data-slot="shell-project-code-command"
          {...presentation}
          aria-label={label}
          aria-current={false}
          className={cn(navigationStyles.link, navigationStyles.linkInteractive)}
          onClick={handleCodeLink}
        >
          <GitFork aria-hidden="true" className={navigationStyles.icon} />
          <span className={navigationStyles.caption}>{label}</span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ShellProjectMenu({ copy }: Readonly<{ copy: ShellTopBarCopy }>) {
  const [open, setOpen] = useState(false);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const transferFocusRef = useRef(false);
  const { badge, gitBranch, gitSha } = useShellProjectIdentity();
  const language = useApplicationLanguageStore((state) => state.language);
  const projectCopy = resolveProjectOnboardingCopy(language);
  return (
    <>
      <ShellProjectMenuTemplate
        copy={copy}
        badge={badge}
        gitBranch={gitBranch}
        gitSha={gitSha}
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        onScopeSelected={() => setOpen(false)}
        newProjectLabel={projectCopy.newProjectActionLabel}
        onNewProject={() => {
          transferFocusRef.current = true;
          setOpen(false);
          setProjectCreationOpen(true);
        }}
        onSnapshotFileSelected={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          if (!transferFocusRef.current) return;
          event.preventDefault();
          transferFocusRef.current = false;
        }}
      />
      {projectCreationOpen ? (
        <ProjectCreationDialog
          open={projectCreationOpen}
          onOpenChange={setProjectCreationOpen}
          returnFocusRef={triggerRef}
        />
      ) : null}
    </>
  );
}

function projectCodeLinkPresentation({
  onCanvasRoute,
  foreground,
  tabActive,
  open,
}: {
  onCanvasRoute: boolean;
  foreground: boolean;
  tabActive: boolean;
  open: (() => void) | undefined;
}) {
  const active = onCanvasRoute && tabActive;
  const disabled = onCanvasRoute && open == null;
  return {
    'data-active': foreground && active,
    'aria-expanded': active,
    'aria-controls': active ? 'canvas-code-workspace-surface' : undefined,
    'aria-disabled': disabled || undefined,
  };
}
