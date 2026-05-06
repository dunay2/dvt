/** Owned concern: render shell project identity as non-mutating top-bar context. */
import { FolderKanban } from 'lucide-react';

import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import { topAppBarClasses } from './chrome';

export type ShellProjectIdentityBadgeProps = {
  readonly badge: ProjectIdentityBadge;
};

export function ShellProjectIdentityBadge({ badge }: ShellProjectIdentityBadgeProps) {
  return (
    <div
      data-slot="shell-project-identity-badge"
      className={topAppBarClasses.projectIdentityBadge}
      title={`${badge.slug} / ${badge.environmentLabel} / ${badge.draftPostureLabel}`}
    >
      <FolderKanban className={topAppBarClasses.contextChipIcon} />
      <span data-slot="shell-project-identity-title" className={topAppBarClasses.contextChipLabel}>
        {badge.projectLabel}
      </span>
      <span aria-hidden="true" className={topAppBarClasses.contextChipSeparator}>
        /
      </span>
      <span data-slot="shell-project-identity-env" className={topAppBarClasses.contextChipMeta}>
        {badge.environmentLabel}
      </span>
      <span data-slot="shell-project-identity-draft" className={topAppBarClasses.contextChipMeta}>
        {badge.draftPostureLabel}
      </span>
    </div>
  );
}
