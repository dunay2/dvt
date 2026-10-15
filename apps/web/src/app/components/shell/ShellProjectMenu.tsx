/**
 * Owned concern: coordinate granted project context and scope selection in Project.
 * @baseline GH-3622: creating files or projects is not context selection.
 * @decision Compose the existing scope selector rather than copying its authorization or dispatch.
 * @consequence Selection retains its application port; no File or navigation actions appear here.
 * @version 1.0.0
 */
import { useState } from 'react';
import type { ProjectIdentityBadge } from '../../shell/projectIdentityBadge';
import type { ShellTopBarCopy } from './copy';
import { ShellProjectMenuTemplate } from './ShellMenu.templates';

export function ShellProjectMenu(
  props: Readonly<{
    copy: ShellTopBarCopy;
    badge: ProjectIdentityBadge;
    gitBranch: string;
    gitSha: string;
  }>
) {
  const [open, setOpen] = useState(false);
  return (
    <ShellProjectMenuTemplate
      {...props}
      open={open}
      onOpenChange={setOpen}
      onScopeSelected={() => setOpen(false)}
    />
  );
}
