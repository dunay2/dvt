import { ArrowRight, Columns } from 'lucide-react';

import { Card } from '../../components/ui/card';
import type { CanonicalNode } from '../../types/canonical';
import { lineageViewCopy as copy } from './copy';

interface LineageColumnPanelProps {
  focusNode: CanonicalNode | null;
  columnLineage: Array<{ from: string; to: string }>;
}

export function LineageColumnPanel({ focusNode, columnLineage }: LineageColumnPanelProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Columns className="size-5" />
        {focusNode ? `Column lineage: ${focusNode.name}` : 'Column-level lineage'}
      </h2>

      {columnLineage.length > 0 ? (
        <div className="space-y-3">
          {columnLineage.map((entry) => (
            <div
              key={`${entry.from}->${entry.to}`}
              className="flex items-center gap-3 rounded border border-slate-700 bg-slate-950 p-3"
            >
              <code className="text-sm text-blue-400">{entry.from}</code>
              <ArrowRight className="size-4 shrink-0 text-slate-400" />
              <code className="text-sm text-green-400">{entry.to}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          {focusNode ? copy.noColumnMetadata : copy.selectNodeForColumns}
        </p>
      )}
    </Card>
  );
}
