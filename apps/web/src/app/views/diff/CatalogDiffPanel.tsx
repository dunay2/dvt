import { Edit, Minus } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../components/ui/utils';
import { diffViewCopy as copy } from './copy';
import type { CatalogDiffDocument } from './diffReviewModel';

type CatalogDiffPanelProps = {
  document: CatalogDiffDocument;
};

export function CatalogDiffPanel({ document }: CatalogDiffPanelProps) {
  return (
    <Card className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.catalog.title}</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded border border-[color:var(--status-danger)] bg-[var(--surface-elevated)] p-3">
          <div className="flex items-center gap-2">
            <Minus className="size-4 text-[var(--status-danger)]" />
            <code className="text-sm text-[var(--text-strong)]">discount_amount</code>
            <span className="text-xs text-[var(--text-default)]">DECIMAL</span>
          </div>
          <Badge className="border-transparent bg-[var(--status-danger)] text-[var(--text-strong)]">
            {copy.catalog.removed}
          </Badge>
        </div>
        <div className="flex items-center justify-between rounded border border-[color:var(--status-warning)] bg-[var(--surface-elevated)] p-3">
          <div className="flex items-center gap-2">
            <Edit className="size-4 text-[var(--status-warning)]" />
            <code className="text-sm text-[var(--text-strong)]">total_amount</code>
            <span className="text-xs text-[var(--text-default)]">{'DECIMAL -> NUMERIC(18,2)'}</span>
          </div>
          <Badge className="border-transparent bg-[var(--status-warning)] text-[var(--surface-app)]">
            {copy.catalog.typeChanged}
          </Badge>
        </div>
      </div>
      <div className="mt-4">
        <MonacoDiffViewer
          language="json"
          loadingLabel="Loading catalog diff..."
          modified={document.currentCatalogJson}
          modifiedLabel="Current catalog"
          original={document.previousCatalogJson}
          originalLabel="Previous catalog"
        />
      </div>
    </Card>
  );
}
