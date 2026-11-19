/**
 * Owned concern: present Model view shortcuts from the current owner's posture.
 * @baseline ADR-0069: Shell delegates the Model lifecycle through its existing contribution.
 * @decision Reuse navigation tokens and callbacks; retain no SQL or semantic draft here.
 * @consequence Missing, busy and obsolete owners cannot issue a view action.
 * @version 1.0.0
 */
import { Workflow, SquareCode } from 'lucide-react';
import type {
  CanvasModelWorkspaceTabContribution,
  CanvasModelBrowserContribution,
} from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import type { ShellTopBarCopy } from './copy';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import styles from '../LeftNavigation.module.css';

export function ShellModelViewNavigation({
  tab,
  browser,
  available,
  foreground,
  onActivate,
  copy,
}: Readonly<{
  tab: CanvasModelWorkspaceTabContribution | null;
  browser: CanvasModelBrowserContribution | null;
  available: boolean;
  foreground: boolean;
  onActivate?: () => void;
  copy: ShellTopBarCopy;
}>) {
  const views = tab?.views;
  const disabled = !available || browser == null || views?.disabled === true;
  const active = tab?.active ? views?.active : browser?.mode;
  return (
    <>
      {(
        [
          { id: 'semantic', label: copy.semanticView, Icon: Workflow },
          { id: 'sql', label: copy.modelSqlView, Icon: SquareCode },
        ] as const
      ).map(({ id, label, Icon }) => (
        <Tooltip key={id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              data-slot={`shell-model-${id}-command`}
              data-active={available && foreground && browser != null && active === id}
              aria-label={label}
              aria-disabled={disabled}
              aria-pressed={available && foreground && browser != null && active === id}
              className={cn(styles.link, styles.linkInteractive)}
              onClick={() => {
                if (disabled) return;
                onActivate?.();
                browser?.onBrowse(id);
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
