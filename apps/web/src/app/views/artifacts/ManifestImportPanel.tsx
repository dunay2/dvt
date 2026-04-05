import { CheckCircle2, Upload, XCircle } from 'lucide-react';
import type { ChangeEvent, DragEvent, RefObject } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { cn } from '../../components/ui/utils';
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-300">
        {artifactsViewCopy.importTitle}
      </h2>

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
            'border-slate-600 bg-slate-900 hover:border-blue-500 hover:bg-slate-800/60',
            state.status === 'loading' ? 'pointer-events-none opacity-60' : 'cursor-pointer'
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onClick={onOpenFilePicker}
        >
          <Upload className="mx-auto mb-3 size-8 text-slate-400" />
          <p className="mb-1 text-sm font-medium text-slate-200">
            {state.status === 'loading'
              ? artifactsViewCopy.importDropLoading
              : artifactsViewCopy.importDropIdle}
          </p>
          <p className="text-xs text-slate-400">{artifactsViewCopy.importDropHint}</p>

          {state.status === 'error' ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-red-400">
              <XCircle className="size-4 shrink-0" />
              {state.message}
            </div>
          ) : null}
        </Card>
      ) : (
        <Card className="border-green-700 bg-green-950/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-400" />
              <div>
                <p className="mb-1 text-sm font-medium text-green-200">
                  {state.fileName} {artifactsViewCopy.importSuccess}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                  <span>
                    <span className="font-mono text-white">{importedStats?.models ?? 0}</span> models
                  </span>
                  <span>
                    <span className="font-mono text-white">{importedStats?.sources ?? 0}</span> sources
                  </span>
                  <span>
                    <span className="font-mono text-white">{importedStats?.tests ?? 0}</span> tests
                  </span>
                  <span>
                    <span className="font-mono text-white">{importedStats?.edges ?? 0}</span> edges
                  </span>
                  {importedStats?.dbtVersion ? (
                    <span className="text-slate-400">dbt {importedStats.dbtVersion}</span>
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
