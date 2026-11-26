/**
 * Owned concern: present Model view shortcuts from the current owner's posture.
 * @baseline ADR-0069: Shell delegates the Model lifecycle through its existing contribution.
 * @decision Reuse navigation tokens and callbacks; retain no SQL or semantic draft here.
 * @consequence Missing, busy and obsolete owners cannot issue a view action.
 * @version 1.0.0
 */
import { Workflow, SquareCode } from 'lucide-react';
import { Link, NavLink, useMatch } from 'react-router';
import type {
  CanvasModelWorkspaceTabContribution,
  CanvasModelBrowserContribution,
  CanvasModelView,
} from '../../views/canvas/canvasWorkspaceMenuContributionStore';
import type { ShellTopBarCopy } from './copy';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '../ui/utils';
import styles from '../LeftNavigation.module.css';
import { isDirectShellLinkActivation } from './ShellProjectMenu';

type ModelViewNavigationProps = Readonly<{
  tab: CanvasModelWorkspaceTabContribution | null;
  browser: CanvasModelBrowserContribution | null;
  available: boolean;
  entryPath?: string;
  foreground: boolean;
  onActivate?: () => void;
  copy: ShellTopBarCopy;
}>;

type ModelViewNavigation =
  | { kind: 'route'; path: string }
  | { kind: 'blocked'; reason: string; selected: CanvasModelView | null }
  | {
      kind: 'browse';
      onBrowse: CanvasModelBrowserContribution['onBrowse'];
      selected: CanvasModelView | null;
    };

function readCurrentModelView(
  tab: CanvasModelWorkspaceTabContribution | null,
  browserMode: CanvasModelView | null,
  foreground: boolean
): CanvasModelView | null {
  if (!foreground) return null;
  const selected = tab?.active ? (tab.views?.active ?? null) : browserMode;
  return selected === 'sql' ? 'semantic' : selected;
}

function resolveModelViewNavigation({
  tab,
  browser,
  available,
  entryPath,
  foreground,
  copy,
}: ModelViewNavigationProps): ModelViewNavigation {
  if (!available && entryPath != null) return { kind: 'route', path: entryPath };

  const busy = tab?.views?.disabled === true;
  const reason = busy ? copy.modelViewBusy : copy.modelViewUnavailable;
  if (!available || browser == null) return { kind: 'blocked', reason, selected: null };

  const selected = readCurrentModelView(tab, browser.mode, foreground);
  if (busy) return { kind: 'blocked', reason, selected };
  return { kind: 'browse', onBrowse: browser.onBrowse, selected };
}

function ModelViewShortcut({
  id,
  label,
  Icon,
  navigation,
  onActivate,
}: Readonly<{
  id: CanvasModelView;
  label: string;
  Icon: typeof Workflow;
  navigation: ModelViewNavigation;
  onActivate: ModelViewNavigationProps['onActivate'];
}>) {
  const attributes = {
    'data-slot': `shell-model-${id}-command`,
    'aria-label': label,
    className: cn(styles.link, styles.linkInteractive),
  };
  const caption = (
    <>
      <Icon aria-hidden="true" className={styles.icon} />
      <span className={styles.caption}>{label}</span>
    </>
  );
  const blocked = navigation.kind === 'blocked';
  const tooltip = blocked ? `${label} · ${navigation.reason}` : label;
  const selected = navigation.kind !== 'route' && navigation.selected === id;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {navigation.kind === 'route' ? (
          <Link {...attributes} to={navigation.path} state={{ canvasWorkbench: id }}>
            {caption}
          </Link>
        ) : (
          <button
            {...attributes}
            type="button"
            data-active={selected}
            aria-disabled={blocked}
            aria-pressed={selected}
            onClick={() => {
              if (navigation.kind !== 'browse') return;
              onActivate?.();
              navigation.onBrowse(id);
            }}
          >
            {caption}
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function ShellModelViewNavigation(props: ModelViewNavigationProps) {
  const sqlActive = useMatch('/sql/*') != null;
  const navigation = resolveModelViewNavigation(props);
  const { copy, onActivate } = props;
  return (
    <>
      <ModelViewShortcut
        id="semantic"
        label={copy.semanticView}
        Icon={Workflow}
        navigation={navigation}
        onActivate={onActivate}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to="/sql"
            data-slot="shell-model-sql-command"
            aria-label={copy.modelSqlView}
            data-active={sqlActive}
            className={cn(styles.link, styles.linkInteractive)}
            onClick={(event) => {
              if (isDirectShellLinkActivation(event)) onActivate?.();
            }}
          >
            <SquareCode aria-hidden="true" className={styles.icon} />
            <span className={styles.caption}>{copy.modelSqlView}</span>
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">{copy.modelSqlView}</TooltipContent>
      </Tooltip>
    </>
  );
}
