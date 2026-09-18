/** Owned concern: retain revision-tagged exploratory rows through the existing protected query rail. */
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Play, RefreshCw, Table2 } from 'lucide-react';
import {
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TransformDataSampleRequestSchema,
  type TransformDataSampleResponse,
} from '@dvt/contracts';
import { Button } from '../../components/ui/button';
import { OperationalDrawerDataTable } from '../../components/shell/OperationalDrawerDataTable';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import type { CanvasDraftLifecycle } from './canvasDraftLifecycle.types';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type CanvasModelPreviewPreparation = CanvasDraftLifecycle['flushDraftForExecution'];

export function CanvasModelDataView({
  canvasId,
  nodeId,
  nodeName,
  semanticDigest,
  canEditModel = true,
  query,
  preparePreview,
  copy,
  unresolvedInputs = [],
  onReviewInputs,
  relationId,
  compact = false,
  disabledReason,
}: Readonly<{
  canvasId: string;
  nodeId: string;
  nodeName: string;
  semanticDigest: string | null;
  canEditModel?: boolean;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasModelPreviewPreparation;
  copy: CanvasSemanticEditorCopy;
  unresolvedInputs?: readonly Readonly<{ label: string; state: 'pending' | 'missing' }>[];
  onReviewInputs?: () => void;
  relationId?: string;
  compact?: boolean;
  disabledReason?: string;
}>): JSX.Element {
  const [sample, setSample] = useState<TransformDataSampleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );
  const stale =
    sample != null && (sample.semanticPlanSha256 !== semanticDigest || unresolvedInputs.length > 0);
  const available =
    query != null &&
    disabledReason == null &&
    (!canEditModel || preparePreview != null) &&
    semanticDigest != null &&
    unresolvedInputs.length === 0;
  const load = async () => {
    if (!available || loading) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      if (canEditModel) {
        const saved = await preparePreview!();
        if (requestId.current !== id) return;
        if (!saved.ok) {
          setError(copy.saveFailed);
          return;
        }
        const savedNode = saved.canonicalNodes.find((node) => node.id === nodeId);
        if (
          savedNode == null ||
          readDvtTransformAuthoringAuthority(savedNode)?.semanticDocument.semanticPlan.sha256 !==
            semanticDigest
        ) {
          setError(copy.staleHint);
          return;
        }
      }
      const next = await query.previewTransformRows(
        TransformDataSampleRequestSchema.parse({
          canvasId,
          transformNodeId: nodeId,
          limit: TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
          ...(relationId == null ? {} : { relationId, semanticPlanSha256: semanticDigest! }),
        })
      );
      if (requestId.current !== id) return;
      if (
        next.canvasId !== canvasId ||
        next.transformNodeId !== nodeId ||
        next.relationId !== relationId ||
        next.semanticPlanSha256 !== semanticDigest
      ) {
        setError(copy.staleHint);
        return;
      }
      setSample(next);
    } catch {
      if (requestId.current === id) setError(copy.failed);
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  };
  return (
    <section
      data-slot="canvas-model-data"
      className={`flex h-full min-h-0 min-w-0 flex-col ${compact ? 'gap-2 p-2' : 'gap-4 p-4'}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">{nodeName}</h2>
          <p className="text-xs text-(--text-muted)">{copy.previewHint}</p>
        </div>
        <Button
          data-slot="canvas-model-preview"
          size="sm"
          variant={compact ? 'ghost' : 'default'}
          title={sample == null ? copy.preview : copy.refresh}
          aria-label={sample == null ? copy.preview : copy.refresh}
          className={compact ? 'size-8 shrink-0 p-0' : undefined}
          disabled={!available || loading}
          onClick={() => void load()}
        >
          {sample == null ? (
            <Play className="size-4" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-4" aria-hidden="true" />
          )}
          {compact ? null : loading ? copy.loading : sample == null ? copy.preview : copy.refresh}
        </Button>
      </header>
      {unresolvedInputs.length === 0 ? null : (
        <div
          data-slot="canvas-model-unresolved-inputs"
          role="status"
          className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
        >
          {(['pending', 'missing'] as const).map((state) => {
            const labels = unresolvedInputs
              .filter((input) => input.state === state)
              .map((input) => input.label);
            return labels.length === 0 ? null : (
              <div key={state} className="space-y-1">
                <p>
                  {state === 'pending' ? copy.pendingPreview : copy.missingPreview}{' '}
                  <strong>{labels.join(', ')}</strong>
                </p>
                <p className="text-xs">
                  {state === 'pending' ? copy.pendingPreviewHint : copy.missingPreviewHint}
                </p>
              </div>
            );
          })}
          {onReviewInputs == null ? null : (
            <Button variant="outline" size="sm" onClick={onReviewInputs}>
              {copy.reviewInputs}
            </Button>
          )}
        </div>
      )}
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
          <div className="flex flex-wrap items-center gap-4 text-xs text-(--text-muted)">
            <span>
              {sample.rows.length}
              {sample.truncated ? '+' : ''} {copy.rows}
            </span>
            {compact ? null : (
              <span>
                {sample.columns.length} {copy.columns}
              </span>
            )}
            <span title={sample.semanticPlanSha256}>
              {copy.revision}: <code>{sample.draftRevision}</code>
            </span>
            {compact ? null : <time dateTime={sample.sampledAt}>{sample.sampledAt}</time>}
          </div>
          {sample.rows.length === 0 ? (
            <p>{copy.empty}</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <OperationalDrawerDataTable
                key={`${sample.draftRevision}:${sample.semanticPlanSha256}`}
                caption={nodeName}
                columns={sample.columns}
                rows={sample.rows}
                nullValueLabel="NULL"
              />
            </div>
          )}
        </>
      )}
    </section>
  );
}
