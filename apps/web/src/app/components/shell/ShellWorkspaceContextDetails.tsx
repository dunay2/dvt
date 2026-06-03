/** Owned concern: render active workspace scope as read-only shell context details. */
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellTopBarCopy } from './copy';
import { topAppBarClasses } from './chrome';

export type ShellWorkspaceContextDetailsProps = {
  readonly badge: ProjectIdentityBadge;
  readonly copy: Pick<
    ShellTopBarCopy,
    | 'tenantScope'
    | 'projectScope'
    | 'environmentScope'
    | 'tenantScopeAria'
    | 'projectScopeAria'
    | 'environmentScopeAria'
  >;
};

export function ShellWorkspaceContextDetails({ badge, copy }: ShellWorkspaceContextDetailsProps) {
  return (
    <div data-slot="shell-workspace-context-details" className="grid gap-3">
      <div data-slot="shell-workspace-tenant-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>{copy.tenantScope}</span>
        <div
          aria-label={copy.tenantScopeAria}
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.tenantLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-project-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>{copy.projectScope}</span>
        <div
          aria-label={copy.projectScopeAria}
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.projectLabel}
        </div>
      </div>
      <div data-slot="shell-workspace-environment-context" className="grid gap-1">
        <span className={topAppBarClasses.contextLabel}>{copy.environmentScope}</span>
        <div
          aria-label={copy.environmentScopeAria}
          className={`flex items-center truncate ${topAppBarClasses.readOnlyScopeField}`}
        >
          {badge.environmentLabel}
        </div>
      </div>
    </div>
  );
}
