/**
Owned concern: present sample state without owning commands, queries or lifecycle.
@baseline GH-3623: source and operation samples share compact grid presentation.
@decision Compose existing toolbar and footer slots with concern-owned appearance and density variants.
@consequence Sample identity, provenance and query fences remain owned by existing ports.
@version 1.0.0
 */
import { AlertTriangle, Play, RefreshCw, Table2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';
import { OperationalDrawerLivePreviewFacts } from '../../components/shell/OperationalDrawerLivePreviewFacts';
import gridStyles from '../../components/shell/OperationalDrawerDataTable.module.css';
import { CanvasModelUnresolvedInputs } from './CanvasModelUnresolvedInputs';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { TransformDataSampleResponse } from '@dvt/contracts';
import styles from './CanvasModelDataPanel.module.css';

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
  const previewAction = (
    <Button
      data-slot="canvas-model-preview"
      size="sm"
      variant={compact ? 'ghost' : 'default'}
      title={sample == null ? copy.preview : copy.refresh}
      aria-label={sample == null ? copy.preview : copy.refresh}
      className={styles.previewAction}
      data-compact={compact}
      disabled={!available}
      aria-disabled={loading || !available}
      aria-busy={loading}
      onClick={loading ? undefined : () => void load()}
    >
      {sample == null ? (
        <Play className={styles.icon} aria-hidden="true" />
      ) : (
        <RefreshCw className={styles.icon} aria-hidden="true" />
      )}
      {compact ? null : loading ? copy.loading : sample == null ? copy.preview : copy.refresh}
    </Button>
  );
  return (
    <section data-slot="canvas-model-data" className={styles.panel} data-compact={compact}>
      {compact ? (
        sample == null ? (
          <div className={gridStyles.actions}>{previewAction}</div>
        ) : null
      ) : (
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 className={styles.title} title={nodeName}>
              {nodeName}
            </h2>
            <p className={styles.hint}>{copy.previewHint}</p>
          </div>
          {previewAction}
        </header>
      )}
      <CanvasModelUnresolvedInputs
        unresolvedInputs={unresolvedInputs}
        onReviewInputs={onReviewInputs}
        copy={copy}
      />
      {stale ? (
        <p data-slot="canvas-model-data-stale" role="status" className={styles.stale}>
          <AlertTriangle aria-hidden="true" className={styles.icon} />
          <strong>{copy.stale}</strong> {copy.staleHint}
        </p>
      ) : null}
      {error == null ? null : (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading ? (
        <p role="status" className={styles.hint}>
          {copy.queryInProgress}
        </p>
      ) : null}
      {sample == null ? (
        <div className={styles.empty}>
          <Table2 aria-hidden="true" className={styles.emptyIcon} />
          <p>{disabledReason ?? (available ? copy.previewEmpty : copy.unavailable)}</p>
        </div>
      ) : (
        <>
          {compact ? null : (
            <OperationalDrawerLivePreviewFacts provenance={sample.provenance} copy={copy} />
          )}
          {compact ? null : (
            <div className={styles.summary}>
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
            toolbarActions={compact ? previewAction : undefined}
            footer={
              compact ? (
                <>
                  <span
                    data-slot="data-sample-summary"
                    className={gridStyles.sampleSummary}
                    title={copy.operationPreviewRecords
                      .replace('{count}', String(sample.rows.length))
                      .replace('{limit}', String(sample.limit))}
                  >
                    <span>
                      {sample.rows.length} {copy.rows}
                    </span>
                    <span>
                      {sample.columns.length} {copy.columns}
                    </span>
                  </span>
                  <OperationalDrawerLivePreviewFacts
                    provenance={sample.provenance}
                    copy={copy}
                    nodeName={nodeName}
                  />
                </>
              ) : undefined
            }
          />
        </>
      )}
    </section>
  );
}
