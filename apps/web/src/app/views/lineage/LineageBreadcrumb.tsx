import { ArrowRight } from 'lucide-react';

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
    <div className="border-b border-slate-700 bg-slate-900 px-6 py-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-300">{copy.pathLabel}</span>
        {nodes.map((node, index) => (
          <span key={node.id} className="flex items-center gap-2">
            {index > 0 ? <ArrowRight className="size-3 text-slate-400" /> : null}
            <code
              className={
                node.id === focusNodeId
                  ? 'font-semibold text-green-400'
                  : node.kind === 'dbt:exposure' || node.kind === 'dbt:metric'
                    ? 'text-pink-400'
                    : 'text-blue-400'
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
