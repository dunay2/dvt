/**
 * Owned concern: publish the existing TopBar class contract without route or session authority.
 * @baseline GH-3629: navigation and drawer consume their own stylesheets directly.
 * @decision Preserve named top-bar class contracts as bindings to the concern-owned CSS Module.
 * @consequence Controllers retain behavior; presentation owns spacing, size and color.
 * @version 1.2.0
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
