import { Code } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Card } from '../../components/ui/card';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../components/ui/utils';
import type { SqlDiffDocument } from './diffReviewModel';

type SqlDiffPanelProps = {
  document: SqlDiffDocument;
};

export function SqlDiffPanel({ document }: SqlDiffPanelProps) {
  return (
    <Card className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 flex items-center gap-2 font-semibold text-[var(--text-strong)]">
        <Code className="size-5" />
        {document.title}
      </h3>
      <div className="mb-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span>{document.previousLabel}</span>
        <span className="text-[var(--text-subtle)]">vs</span>
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
