import { Code } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Card } from '../../components/ui/card';
import type { SqlDiffDocument } from './diffReviewModel';

type SqlDiffPanelProps = {
  document: SqlDiffDocument;
};

export function SqlDiffPanel({ document }: SqlDiffPanelProps) {
  return (
    <Card className="border-slate-700 bg-slate-900 p-4 text-slate-50">
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-50">
        <Code className="size-5" />
        {document.title}
      </h3>
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-300">
        <span>{document.previousLabel}</span>
        <span className="text-slate-500">vs</span>
        <span>{document.currentLabel}</span>
      </div>
      <MonacoDiffViewer
        language="sql"
        loadingLabel="Loading SQL diff..."
        modified={document.currentSql}
        modifiedLabel={document.currentLabel}
        original={document.previousSql}
        originalLabel={document.previousLabel}
      />
    </Card>
  );
}
