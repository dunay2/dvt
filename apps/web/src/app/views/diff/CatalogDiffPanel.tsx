import { Edit, Minus, Plus } from 'lucide-react';

import { MonacoDiffViewer } from '../../components/monaco/MonacoDiffViewer';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { routeWorkbenchPanelClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { cn } from '../../components/ui/utils';
import { diffViewCopy as copy } from './copy';
import type { DiffCompareContextState } from './diffWorkbenchStateModel';
import { DiffPanelStateView } from './DiffStateViews';
import type { CatalogDiffDocument, CatalogDiffSummaryRow } from './diffReviewModel';

type CatalogDiffPanelProps = {
  compareContextState: DiffCompareContextState;
  document: CatalogDiffDocument;
};

function resolveSummaryIcon(row: CatalogDiffSummaryRow) {
  if (row.kind === 'added') {
    return <Plus className="size-4 text-[var(--status-success)]" />;
  }

  if (row.kind === 'removed') {
    return <Minus className="size-4 text-[var(--status-danger)]" />;
  }

  return <Edit className="size-4 text-[var(--status-warning)]" />;
}

function resolveSummaryCardClassName(row: CatalogDiffSummaryRow): string {
  if (row.kind === 'added') {
    return 'border-[color:var(--status-success)]';
  }

  if (row.kind === 'removed') {
    return 'border-[color:var(--status-danger)]';
  }

  return 'border-[color:var(--status-warning)]';
}

function resolveSummaryBadgeClassName(row: CatalogDiffSummaryRow): string {
  if (row.kind === 'added') {
    return 'border-transparent bg-[var(--status-success)] text-[var(--surface-app)]';
  }

  if (row.kind === 'removed') {
    return 'border-transparent bg-[var(--status-danger)] text-[var(--text-strong)]';
  }

  return 'border-transparent bg-[var(--status-warning)] text-[var(--surface-app)]';
}

function resolveSummaryBadgeLabel(row: CatalogDiffSummaryRow): string {
  if (row.kind === 'added') {
    return copy.catalog.added;
  }

  if (row.kind === 'removed') {
    return copy.catalog.removed;
  }

  return copy.catalog.typeChanged;
}

export function CatalogDiffPanel({ compareContextState, document }: CatalogDiffPanelProps) {
  if (compareContextState.kind === 'loading') {
    return (
      <DiffPanelStateView
        dataSlot="diff-catalog-loading-state"
        title={copy.states.compareContextLoadingTitle}
        message={copy.states.compareContextLoadingMessage}
      />
    );
  }

  if (compareContextState.kind === 'unavailable') {
    return (
      <DiffPanelStateView
        dataSlot="diff-catalog-unavailable-state"
        title={copy.states.compareContextUnavailableTitle}
        message={copy.states.compareContextUnavailableMessage}
      />
    );
  }

  return (
    <Card className={cn(routeWorkbenchPanelClassName, 'p-4')}>
      <h3 className="mb-4 font-semibold text-[var(--text-strong)]">{copy.catalog.title}</h3>
      {document.summaryRows.length > 0 ? (
        <div data-slot="diff-catalog-summary" className="space-y-2">
          {document.summaryRows.map((row) => (
            <div
              key={row.id}
              data-slot="diff-catalog-summary-row"
              className={cn(
                'flex items-center justify-between rounded border bg-[var(--surface-elevated)] p-3',
                resolveSummaryCardClassName(row)
              )}
            >
              <div className="flex items-center gap-2">
                {resolveSummaryIcon(row)}
                <code className="text-sm text-[var(--text-strong)]">{row.columnName}</code>
                <span className="text-xs text-[var(--text-default)]">{row.detail}</span>
              </div>
              <Badge className={resolveSummaryBadgeClassName(row)}>
                {resolveSummaryBadgeLabel(row)}
              </Badge>
            </div>
          ))}
        </div>
      ) : null}
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
