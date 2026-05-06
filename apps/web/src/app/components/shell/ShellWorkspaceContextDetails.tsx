/** Owned concern: render active workspace scope as read-only shell context details. */
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { topAppBarClasses } from './chrome';

export type ShellWorkspaceContextDetailsProps = {
  readonly badge: ProjectIdentityBadge;
};

export function ShellWorkspaceContextDetails({ badge }: ShellWorkspaceContextDetailsProps) {
  return (
    <div data-slot="shell-workspace-context-details" className="grid gap-3">
      <div data-slot="shell-workspace-tenant-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>Tenant</span>
        <div
          aria-label="Tenant scope (read only)"
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.tenantLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-project-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>Project</span>
        <div
          aria-label="Project scope (read only)"
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.projectLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-environment-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>Environment</span>
        <div
          aria-label="Environment scope (read only)"
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.environmentLabel}
        </div>
      </div>
    </div>
  );
}
