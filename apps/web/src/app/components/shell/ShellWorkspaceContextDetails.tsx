/** Owned concern: render active workspace scope as read-only shell context details. */
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellTopBarCopy } from './copy';
import { topAppBarClasses } from './chrome';
import styles from './ShellChrome.module.css';

export type ShellWorkspaceContextDetailsProps = {
  readonly badge: ProjectIdentityBadge;
  readonly copy: Pick<
    ShellTopBarCopy,
    | 'tenantScope'
    | 'projectScope'
    | 'environmentScope'
    | 'deploymentScope'
    | 'tenantScopeAria'
    | 'projectScopeAria'
    | 'environmentScopeAria'
    | 'deploymentScopeAria'
  >;
};

export function ShellWorkspaceContextDetails({ badge, copy }: ShellWorkspaceContextDetailsProps) {
  return (
    <div data-slot="shell-workspace-context-details" className={styles.workspaceDetails}>
      <div data-slot="shell-workspace-tenant-context" className={styles.workspaceField}>
        <span className={topAppBarClasses.contextLabel}>{copy.tenantScope}</span>
        <div aria-label={copy.tenantScopeAria} className={topAppBarClasses.readOnlyScopeField}>
          {badge.tenantLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-project-context" className={styles.workspaceField}>
        <span className={topAppBarClasses.contextLabel}>{copy.projectScope}</span>
        <div aria-label={copy.projectScopeAria} className={topAppBarClasses.readOnlyScopeField}>
          {badge.projectLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-environment-context" className={styles.workspaceField}>
        <span className={topAppBarClasses.contextLabel}>{copy.environmentScope}</span>
        <div aria-label={copy.environmentScopeAria} className={topAppBarClasses.readOnlyScopeField}>
          {badge.environmentLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-deployment-context" className={styles.workspaceField}>
        <span className={topAppBarClasses.contextLabel}>{copy.deploymentScope}</span>
        <div aria-label={copy.deploymentScopeAria} className={topAppBarClasses.readOnlyScopeField}>
          {badge.targetAdapter}
        </div>
      </div>
    </div>
  );
}
