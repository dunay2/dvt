/** Owned concern: expose operational views and their current diagnostic count on the shell rail. */
import { CircleAlert, Terminal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import styles from '../LeftNavigation.module.css';
import type { ShellTopBarCopy } from './copy';
import { useOperationalDrawerContributionStore } from './operationalDrawerContributionStore';
import type { ShellOperationalView } from './types';

export function ShellOperationalRail({
  onCanvasRoute,
  operationalView,
  onOperationalViewChange,
  copy,
}: Readonly<{
  onCanvasRoute: boolean;
  operationalView: ShellOperationalView | null;
  onOperationalViewChange: (view: ShellOperationalView | null) => void;
  copy: ShellTopBarCopy;
}>): JSX.Element {
  const problemCount = useOperationalDrawerContributionStore((state) =>
    onCanvasRoute ? (state.contribution?.problems.items.length ?? null) : null
  );
  return (
    <div className={cn(styles.nav, styles.destinations)}>
      {(
        [
          ['log', copy.operationalDrawerLog, Terminal, null],
          ['problems', copy.operationalDrawerProblems, CircleAlert, problemCount],
        ] as const
      ).map(([id, label, Icon, count]) => {
        const hasCount = count != null && count > 0;
        const active = operationalView === id;
        const accessibleLabel = hasCount ? `${label} (${count})` : label;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                id={`shell-operational-${id}`}
                type="button"
                className={cn(styles.link, styles.linkInteractive)}
                aria-label={accessibleLabel}
                aria-pressed={active}
                aria-controls={active ? 'shell-operational-workspace' : undefined}
                data-active={active}
                onClick={() => onOperationalViewChange(active ? null : id)}
              >
                <Icon aria-hidden="true" className={styles.icon} />
                {hasCount ? (
                  <span aria-hidden="true" className={styles.count}>
                    {count}
                  </span>
                ) : null}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{accessibleLabel}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
