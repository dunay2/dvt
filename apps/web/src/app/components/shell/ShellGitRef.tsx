import { GitBranch } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { topAppBarClasses } from './chrome';
import type { ShellTopBarCopy } from './copy';

type ShellGitRefProps = {
  readonly gitBranch: string;
  readonly gitSha: string;
  readonly copy: ShellTopBarCopy;
};

export function ShellGitRef({ gitBranch, gitSha, copy }: ShellGitRefProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div data-slot="shell-git-ref" className={topAppBarClasses.gitRef}>
          <GitBranch className={topAppBarClasses.gitRefIcon} />
          <span>{gitBranch}</span>
          <span className={topAppBarClasses.gitRefSeparator}>@</span>
          <code className={topAppBarClasses.gitRefSha}>{gitSha}</code>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{copy.gitTooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
