import { ArrowRight, Columns } from 'lucide-react';

import { Card } from '../../components/ui/card';
import type { CanonicalNode } from '../../types/canonical';
import { lineageViewCopy as copy } from './copy';
import { lineageChromeClasses } from './lineageChromeTokens';

interface LineageColumnPanelProps {
  focusNode: CanonicalNode | null;
  columnLineage: Array<{ from: string; to: string }>;
}

export function LineageColumnPanel({ focusNode, columnLineage }: LineageColumnPanelProps) {
  return (
    <Card className={`${lineageChromeClasses.panel} p-6`}>
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Columns className="size-5" />
        {focusNode ? `Column lineage: ${focusNode.name}` : 'Column-level lineage'}
      </h2>

      {columnLineage.length > 0 ? (
        <div className="space-y-3">
          {columnLineage.map((entry) => (
            <div
              key={`${entry.from}->${entry.to}`}
              className={`flex items-center gap-3 rounded border ${lineageChromeClasses.nestedPanel} p-3`}
            >
              <code className={`text-sm ${lineageChromeClasses.sourceColumn}`}>{entry.from}</code>
              <ArrowRight className={`size-4 shrink-0 ${lineageChromeClasses.subtleText}`} />
              <code className={`text-sm ${lineageChromeClasses.targetColumn}`}>{entry.to}</code>
            </div>
          ))}
        </div>
      ) : (
        <p className={`text-sm ${lineageChromeClasses.mutedText}`}>{copy.noColumnMatchesMessage}</p>
      )}
    </Card>
  );
}
