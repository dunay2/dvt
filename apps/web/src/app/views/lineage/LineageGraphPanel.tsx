import { ArrowRight, Table } from 'lucide-react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import type { CanonicalNode } from '../../types/canonical';
import { lineageChromeClasses, resolveLineageNodeKindClassName } from './lineageChromeTokens';
import { kindStyle } from './lineageModel';

const LEVEL_LABELS: Record<number, string> = {
  0: 'SOURCES & SEEDS',
  1: 'STAGING & DIMENSIONS',
  2: 'FACTS',
  3: 'EXPOSURES & METRICS',
};

interface LineageGraphPanelProps {
  focusNode: CanonicalNode | null;
  nodesByLevel: Array<[number, CanonicalNode[]]>;
}

export function LineageGraphPanel({ focusNode, nodesByLevel }: LineageGraphPanelProps) {
  return (
    <Card className={`${lineageChromeClasses.panel} p-6`}>
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Table className="size-5" />
        {focusNode ? `Model lineage: ${focusNode.name}` : 'Full graph'}
      </h2>

      <div className="space-y-8">
        {nodesByLevel.map(([level, nodes], index) => (
          <div key={level}>
            {index > 0 ? (
              <div className="mb-6 flex justify-center">
                <ArrowRight className={`size-6 rotate-90 ${lineageChromeClasses.subtleText}`} />
              </div>
            ) : null}
            <div className={`mb-3 text-xs ${lineageChromeClasses.mutedText}`}>
              LEVEL {level} - {LEVEL_LABELS[level] ?? `LAYER ${level}`}
            </div>
            <div className="flex flex-wrap gap-3">
              {nodes.map((node) => {
                const style = kindStyle(node.kind);
                const isFocus = node.id === focusNode?.id;
                return (
                  <Card
                    key={node.id}
                    className={`${resolveLineageNodeKindClassName(node.kind)} min-w-[140px] flex-1 p-3 ${
                      isFocus ? 'border-2' : ''
                    }`}
                  >
                    {isFocus ? (
                      <Badge className={`mb-2 text-xs ${lineageChromeClasses.focusBadge}`}>
                        FOCUS
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mb-2 text-xs">
                        {style.badge}
                      </Badge>
                    )}
                    <div className="truncate font-mono text-sm">{node.name}</div>
                    {node.description ? (
                      <div className={`mt-1 truncate text-xs ${lineageChromeClasses.mutedText}`}>
                        {node.description}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
