import { Code } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Card } from '../../components/ui/card';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../components/ui/utils';
import { diffViewCopy as copy } from './copy';
import type { DiffSqlContextState } from './diffWorkbenchStateModel';
import { DiffPanelStateView } from './DiffStateViews';
import type { SqlDiffDocument } from './diffReviewModel';

type SqlDiffPanelProps = {
  document: SqlDiffDocument;
  sqlContextState: DiffSqlContextState;
};

export function SqlDiffPanel({ document, sqlContextState }: SqlDiffPanelProps) {
  if (sqlContextState.kind === 'loading') {
    return (
      <DiffPanelStateView
        dataSlot="diff-sql-loading-state"
        title={copy.states.sqlPreviewLoadingTitle}
        message={copy.states.sqlPreviewLoadingMessage}
      />
    );
  }

  if (sqlContextState.kind === 'unavailable') {
    return (
      <DiffPanelStateView
        dataSlot="diff-sql-unavailable-state"
        title={copy.states.compareContextUnavailableTitle}
        message={copy.states.compareContextUnavailableMessage}
      />
    );
  }

  if (sqlContextState.kind === 'error') {
    return (
      <DiffPanelStateView
        dataSlot="diff-sql-error-state"
        title={copy.states.sqlPreviewErrorTitle}
        message={sqlContextState.message}
      />
    );
  }

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
