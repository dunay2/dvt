import { GitBranch } from 'lucide-react';
import { topAppBarClasses } from '../shell/chrome';
import type { TopAppBarCopy } from './copy';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

type TopAppBarGitRefProps = {
  readonly gitBranch: string;
  readonly gitSha: string;
  readonly copy: TopAppBarCopy;
};

export function TopAppBarGitRef({ gitBranch, gitSha, copy }: TopAppBarGitRefProps) {
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
