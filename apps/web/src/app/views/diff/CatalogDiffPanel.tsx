import { Edit, Minus } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { diffViewCopy as copy } from './copy';
import type { CatalogDiffDocument } from './diffReviewModel';

type CatalogDiffPanelProps = {
  document: CatalogDiffDocument;
};

export function CatalogDiffPanel({ document }: CatalogDiffPanelProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4 text-slate-50">
      <h3 className="mb-4 font-semibold text-slate-50">{copy.catalog.title}</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded border border-red-800 bg-red-900/20 p-3">
          <div className="flex items-center gap-2">
            <Minus className="size-4 text-red-400" />
            <code className="text-sm text-slate-50">discount_amount</code>
            <span className="text-xs text-slate-200">DECIMAL</span>
          </div>
          <Badge className="bg-red-600">{copy.catalog.removed}</Badge>
        </div>
        <div className="flex items-center justify-between rounded border border-yellow-800 bg-yellow-900/20 p-3">
          <div className="flex items-center gap-2">
            <Edit className="size-4 text-yellow-400" />
            <code className="text-sm text-slate-50">total_amount</code>
            <span className="text-xs text-slate-200">{'DECIMAL -> NUMERIC(18,2)'}</span>
          </div>
          <Badge className="bg-yellow-600">{copy.catalog.typeChanged}</Badge>
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
