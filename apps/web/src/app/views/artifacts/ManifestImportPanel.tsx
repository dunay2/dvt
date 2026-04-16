import { CheckCircle2, Upload, XCircle } from 'lucide-react';
import type { ChangeEvent, DragEvent, RefObject } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
import { routeWorkbenchSectionTitleClassName } from '../../components/workbench/RouteWorkbenchFrame';
import { artifactsViewCopy } from './copy';
import type { ImportState } from './types';

type ManifestImportPanelProps = {
  state: ImportState;
  fileInputRef: RefObject<HTMLInputElement>;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onOpenFilePicker: () => void;
  onClear: () => void;
  importedStats: {
    models: number;
    sources: number;
    tests: number;
    edges: number;
    dbtVersion: string | null;
  } | null;
};

export function ManifestImportPanel({
  state,
  fileInputRef,
  onInputChange,
  onDrop,
  onDragOver,
  onOpenFilePicker,
  onClear,
  importedStats,
}: ManifestImportPanelProps) {
  return (
    <div>
      <h2 className={routeWorkbenchSectionTitleClassName}>{artifactsViewCopy.importTitle}</h2>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        aria-label="Import dbt manifest.json"
        onChange={onInputChange}
      />

      {state.status !== 'success' ? (
        <Card
          className={cn(
            'border-2 border-dashed p-8 text-center transition-colors',
            'border-[color:var(--border-default)] bg-[var(--surface-panel)] hover:border-[color:var(--status-info)] hover:bg-[var(--surface-elevated)]',
            state.status === 'loading' ? 'pointer-events-none opacity-60' : 'cursor-pointer'
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={onOpenFilePicker}
        >
          <Upload className="mx-auto mb-3 size-8 text-[var(--text-muted)]" />
          <p className="mb-1 text-sm font-medium text-[var(--text-default)]">
            {state.status === 'loading'
              ? artifactsViewCopy.importDropLoading
              : artifactsViewCopy.importDropIdle}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{artifactsViewCopy.importDropHint}</p>

          {state.status === 'error' ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--status-danger)]">
              <XCircle className="size-4 shrink-0" />
              {state.message}
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className="border-[color:var(--status-success)] bg-[var(--surface-elevated)] p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[var(--status-success)]" />
              <div>
                <p className="mb-1 text-sm font-medium text-[var(--text-strong)]">
                  {state.fileName} {artifactsViewCopy.importSuccess}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--text-default)]">
                  <span>
                    <span className="font-mono text-[var(--text-strong)]">
                      {importedStats?.models ?? 0}
                    </span>{' '}
                    models
                  </span>
                  <span>
                    <span className="font-mono text-[var(--text-strong)]">
                      {importedStats?.sources ?? 0}
                    </span>{' '}
                    sources
                  </span>
                  <span>
                    <span className="font-mono text-[var(--text-strong)]">
                      {importedStats?.tests ?? 0}
                    </span>{' '}
                    tests
                  </span>
                  <span>
                    <span className="font-mono text-[var(--text-strong)]">
                      {importedStats?.edges ?? 0}
                    </span>{' '}
                    edges
                  </span>
                  {importedStats?.dbtVersion ? (
                    <span className="text-[var(--text-muted)]">dbt {importedStats.dbtVersion}</span>
                  ) : null}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onClear} className="shrink-0 text-xs">
              {artifactsViewCopy.importClear}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
