/** Owned concern: present sample state without owning commands, queries or lifecycle. */
import { AlertTriangle, Play, RefreshCw, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';
import { OperationalDrawerLivePreviewFacts } from '../../components/shell/OperationalDrawerLivePreviewFacts';
import styles from '../../components/shell/OperationalDrawerDataTable.module.css';
import { CanvasModelUnresolvedInputs } from './CanvasModelUnresolvedInputs';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { TransformDataSampleResponse } from '@dvt/contracts';

export type CanvasModelDataPanelProps = Readonly<{
  nodeName: string;
  copy: CanvasSemanticEditorCopy;
  unresolvedInputs?: readonly Readonly<{ label: string; state: 'pending' | 'missing' }>[];
  onReviewInputs?: () => void;
  compact?: boolean;
  disabledReason?: string;
}>;

export function CanvasModelDataPanel({
  nodeName,
  copy,
  unresolvedInputs = [],
  onReviewInputs,
  compact = false,
  disabledReason,
  data: { sample, loading, error, available, stale },
  actions: { load },
}: CanvasModelDataPanelProps &
  Readonly<{
    data: Readonly<{
      sample: TransformDataSampleResponse | null;
      loading: boolean;
      error: string | null;
      available: boolean;
      stale: boolean;
    }>;
    actions: Readonly<{ load: () => Promise<void> }>;
  }>): JSX.Element {
  return (
    <section
      data-slot="canvas-model-data"
      className={`${styles.modelPanel} flex h-full min-h-0 min-w-0 flex-col ${compact ? 'gap-2 p-2' : 'gap-4 p-4'}`}
    >
      <header
        className={`flex shrink-0 items-center justify-between gap-3 ${compact ? '' : 'flex-wrap'}`}
      >
        <div className={compact ? 'flex min-w-0 items-center gap-3' : 'space-y-1'}>
          <h2 className={`text-sm font-semibold ${compact ? 'truncate' : ''}`} title={nodeName}>
            {nodeName}
          </h2>
          {compact ? (
            sample == null ? null : (
              <span
                data-slot="canvas-operation-record-count"
                className="shrink-0 text-xs text-(--text-muted)"
              >
                {copy.operationPreviewRecords
                  .replace('{count}', String(sample.rows.length))
                  .replace('{limit}', String(sample.limit))}
              </span>
            )
          ) : (
            <p className="text-xs text-(--text-muted)">{copy.previewHint}</p>
          )}
        </div>
        <Button
          data-slot="canvas-model-preview"
          size="sm"
          variant={compact ? 'ghost' : 'default'}
          title={sample == null ? copy.preview : copy.refresh}
          aria-label={sample == null ? copy.preview : copy.refresh}
          className={compact ? 'size-8 shrink-0 p-0' : undefined}
          disabled={!available}
          aria-disabled={loading || !available}
          aria-busy={loading}
          onClick={loading ? undefined : () => void load()}
        >
          {sample == null ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          {compact ? null : loading ? copy.loading : sample == null ? copy.preview : copy.refresh}
        </Button>
      </header>
      <CanvasModelUnresolvedInputs
        unresolvedInputs={unresolvedInputs}
        onReviewInputs={onReviewInputs}
        copy={copy}
      />
      {stale ? (
        <p
          data-slot="canvas-model-data-stale"
          role="status"
          className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
        >
          <AlertTriangle aria-hidden="true" className="size-4" />
          <strong>{copy.stale}</strong> {copy.staleHint}
        </p>
      ) : null}
      {error == null ? null : (
        <p
          role="alert"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-xs text-(--text-muted)">
          {copy.queryInProgress}
        </p>
      ) : null}
      {sample == null ? (
        <div
          className={`grid ${compact ? 'min-h-24' : 'min-h-40'} flex-1 place-content-center gap-3 text-center text-sm text-(--text-muted)`}
        >
          <Table2 aria-hidden="true" className="mx-auto size-8 opacity-60" />
          <p>{disabledReason ?? (available ? copy.previewEmpty : copy.unavailable)}</p>
        </div>
      ) : (
        <>
          <OperationalDrawerLivePreviewFacts provenance={sample.provenance} copy={copy} />
          {compact ? null : (
            <div className="flex flex-wrap items-center gap-4 text-xs text-(--text-muted)">
              <span>
                {sample.rows.length}
                {sample.truncated ? '+' : ''} {copy.rows}
              </span>
              <span>
                {sample.columns.length} {copy.columns}
              </span>
              <span title={sample.semanticPlanSha256}>
                {copy.revision}: <code>{sample.draftRevision}</code>
              </span>
            </div>
          )}
          {sample.rows.length === 0 ? <p>{copy.empty}</p> : null}
          <OperationalDrawerDataTable
            key={`${sample.draftRevision}:${sample.semanticPlanSha256}`}
            caption={nodeName}
            columns={sample.columns}
            rows={sample.rows}
            nullValueLabel="NULL"
          />
        </>
      )}
    </section>
  );
}
