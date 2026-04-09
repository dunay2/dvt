import { ArrowRight } from 'lucide-react';

import { cn } from '../../components/ui/utils';
import { routeWorkbenchHeaderBandClassName } from '../../components/workbench/RouteWorkbenchFrame';
import type { CanonicalNode } from '../../types/canonical';
import { lineageViewCopy as copy } from './copy';

interface LineageBreadcrumbProps {
  nodes: CanonicalNode[];
  focusNodeId?: string;
}

export function LineageBreadcrumb({ nodes, focusNodeId }: LineageBreadcrumbProps) {
  if (nodes.length === 0) {
    return null;
  }
  return (
    <div className={cn(routeWorkbenchHeaderBandClassName, 'py-2')}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--text-muted)]">{copy.pathLabel}</span>
        {nodes.map((node, index) => (
          <span key={node.id} className="flex items-center gap-2">
            {index > 0 ? <ArrowRight className="size-3 text-[var(--text-subtle)]" /> : null}
            <code
              className={
                node.id === focusNodeId
                  ? 'font-semibold text-[var(--status-success)]'
                  : node.kind === 'dbt:exposure' || node.kind === 'dbt:metric'
                    ? 'text-[var(--status-warning)]'
                    : 'text-[var(--status-info)]'
              }
            >
              {node.name}
            </code>
          </span>
        ))}
      </div>
    </div>
  );
}
