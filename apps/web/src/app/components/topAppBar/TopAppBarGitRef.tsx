import { GitBranch } from 'lucide-react';
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
        <div className="flex h-8 items-center gap-2 rounded-md border border-slate-600 bg-slate-950 px-2.5 text-xs">
          <GitBranch className="size-3.5 text-slate-300" />
          <span>{gitBranch}</span>
          <span className="text-slate-400">@</span>
          <code className="text-xs text-slate-300">{gitSha}</code>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{copy.gitTooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
