/**
 * Owned concern: present Model view shortcuts from the current owner's posture.
 * @baseline ADR-0069: Shell delegates the Model lifecycle through its existing contribution.
 * @decision Reuse navigation tokens and callbacks; retain no SQL or semantic draft here.
 * @consequence Missing, busy and obsolete owners cannot issue a view action.
 * @version 1.0.0
 */
import { Workflow, SquareCode } from 'lucide-react';
import type { CanvasModelWorkspaceTabContribution } from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import { canvasWorkspaceTabs } from '../../views/canvas/canvasWorkspaceTabs';
import type { ShellTopBarCopy } from './copy';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import styles from '../LeftNavigation.module.css';

export function ShellModelViewNavigation({
  tab,
  available,
  foreground,
  copy,
}: Readonly<{
  tab: CanvasModelWorkspaceTabContribution | null;
  available: boolean;
  foreground: boolean;
  copy: ShellTopBarCopy;
}>) {
  const views = tab?.views;
  const disabled = !available || views == null || views.disabled;
  return (
    <>
      {(
        [
          { id: 'semantic', label: copy.semanticView, Icon: Workflow, select: views?.semantic },
          { id: 'sql', label: copy.modelSqlView, Icon: SquareCode, select: views?.sql },
        ] as const
      ).map(({ id, label, Icon, select }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-slot={`shell-model-${id}-command`}
              data-active={available && foreground && tab?.active === true && views?.active === id}
              aria-label={label}
              aria-disabled={disabled}
              aria-pressed={available && foreground && tab?.active === true && views?.active === id}
              aria-controls={
                views == null
                  ? undefined
                  : id === 'sql'
                    ? views.sqlPanelId
                    : canvasWorkspaceTabs.model.panelId
              }
              className={cn(styles.link, styles.linkInteractive)}
              onClick={() => {
                if (disabled) return;
                tab?.onSelect();
                select?.();
              }}
            >
              <Icon aria-hidden="true" className={styles.icon} />
              <span className={styles.caption}>{label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {disabled
              ? `${label} · ${views?.disabled ? copy.modelViewBusy : copy.modelViewUnavailable}`
              : label}
          </TooltipContent>
        </Tooltip>
      ))}
    </>
  );
}
