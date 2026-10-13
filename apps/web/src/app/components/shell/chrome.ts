/**
 * Owned concern: publish shell chrome class contracts without route or session authority.
 * @baseline GH-3629: static shell presentation belongs to its stylesheet, not utility strings.
 * @decision Preserve named top-bar class contracts as bindings to the concern-owned CSS Module.
 * @consequence Controllers retain behavior; presentation owns spacing, size and color.
 * @version 1.1.0
 */
import styles from './ShellChrome.module.css';

export const topAppBarClasses = {
  appMenuButton: styles.appMenuButton,
  applicationMenuContent: styles.applicationMenuContent,
  menuItemIcon: styles.menuItemIcon,
  menuTriggerIcon: styles.menuTriggerIcon,
  contextMenuContent: styles.contextMenuContent,
  menuContextBody: styles.menuContextBody,
  menuGitContext: styles.menuGitContext,
  menuGitSeparator: styles.menuGitSeparator,
  menuLanguageLabel: styles.menuLanguageLabel,
  shellBar: styles.shellBar,
  contextCluster: styles.contextCluster,
  commandCluster: styles.commandCluster,
  readOnlyScopeField: styles.readOnlyScopeField,
  contextLabel: styles.contextLabel,
  gitRef: styles.gitRef,
  gitRefIcon: styles.gitRefIcon,
  gitRefSeparator: styles.gitRefSeparator,
  gitRefSha: styles.gitRefSha,
  projectIdentityBadge: styles.projectIdentityBadge,
  contextChip: styles.contextChip,
  contextChipIcon: styles.contextChipIcon,
  contextChipLabel: styles.contextChipLabel,
  contextChipMeta: styles.contextChipMeta,
  contextChipSeparator: styles.contextChipSeparator,
  smallStatusText: styles.smallStatusText,
  menuButton: styles.menuButton,
};

export const leftNavigationRailClasses = {
  rail: 'h-full w-36 shrink-0 border-r border-[color:var(--border-default)] bg-[var(--surface-shell)]',
  nav: 'flex h-full flex-col items-stretch gap-2 overflow-y-auto px-2 py-4',
  link: 'grid h-10 w-full shrink-0 grid-cols-[18px_1fr] items-center gap-2 rounded-xl border border-transparent px-3 text-[var(--text-subtle)] transition-colors',
  linkInteractive:
    'hover:bg-[var(--surface-selected)] hover:text-[var(--text-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-shell)]',
  linkActive:
    'border-[color:var(--status-running)] bg-[var(--surface-selected)] text-[var(--text-strong)]',
  icon: 'size-[18px] shrink-0 justify-self-start',
  caption: 'block max-w-full truncate text-left text-[11px] leading-none text-inherit',
};

export const bottomOperationalDrawerClasses = {
  drawer:
    'flex h-full flex-col border-t border-[color:var(--border-default)] bg-[var(--surface-shell)] text-[var(--text-default)]',
  header:
    'flex items-center justify-between border-b border-[color:var(--border-default)] px-4 py-2',
  headerMain: 'flex items-center gap-2',
  titleIcon: 'size-4 text-[var(--text-subtle)]',
  title: 'text-sm font-medium text-[var(--text-strong)]',
  runBadge: 'text-xs',
  closeButton: 'size-6 text-[var(--text-subtle)] hover:text-[var(--text-strong)]',
  closeIcon: 'size-4',
  body: 'flex min-h-0 flex-1',
  bodyMessage:
    'flex h-full w-full items-center justify-center px-4 text-center text-sm text-[var(--text-subtle)]',
  logBody: 'flex h-full min-h-0 w-full flex-col',
  feedHealth:
    'flex shrink-0 flex-wrap items-center gap-2 border-b border-[color:var(--border-default)] px-4 py-2 text-xs',
  feedHealthBadge: 'shrink-0 text-[10px] uppercase',
  feedHealthMessage: 'min-w-0 flex-1 text-[var(--text-subtle)]',
  feedRetry: 'h-7 shrink-0',
  stream: 'min-h-0 w-full flex-1',
};
