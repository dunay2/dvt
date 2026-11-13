/**
 * Owned concern: publish the existing TopBar class contract without route or session authority.
 * @baseline GH-3629: navigation and drawer consume their own stylesheets directly.
 * @decision Preserve named top-bar class contracts as bindings to the concern-owned CSS Module.
 * @consequence Controllers retain behavior; presentation owns spacing, size and color.
 * @version 1.2.0
 */
import styles from './ShellChrome.module.css';
import contextStyles from './ShellWorkspaceContext.module.css';

export const topAppBarClasses = {
  menuItemIcon: styles.menuItemIcon,
  menuTriggerIcon: styles.menuTriggerIcon,
  contextMenuContent: styles.contextMenuContent,
  menuContextBody: contextStyles.menuContextBody,
  menuGitContext: contextStyles.menuGitContext,
  menuGitSeparator: contextStyles.menuGitSeparator,
  menuLanguageLabel: styles.menuLanguageLabel,
  shellBar: styles.shellBar,
  contextCluster: styles.contextCluster,
  commandCluster: styles.commandCluster,
  readOnlyScopeField: contextStyles.readOnlyScopeField,
  contextLabel: contextStyles.contextLabel,
  gitRefSha: contextStyles.gitRefSha,
  smallStatusText: styles.smallStatusText,
  menuButton: styles.menuButton,
};
