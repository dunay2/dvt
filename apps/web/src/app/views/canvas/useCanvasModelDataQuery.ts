/** Own bounded, revision-checked row queries independently of their visual entry point. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TransformDataSampleRequestSchema,
  type TransformDataSampleResponse,
} from '@dvt/contracts';
import {
  CanvasTransformDataSampleQueryError,
  type ICanvasTransformDataSampleQueryPort,
} from '../../ports/canvasDataSample';
import type { CanvasDraftLifecycle } from './canvasDraftLifecycle.types';
import type { CanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

export type CanvasModelDataQueryOptions = Readonly<{
  canvasId: string;
  nodeId: string;
  semanticDigest: string | null;
  relationId?: string;
  canEditModel: boolean;
  query?: ICanvasTransformDataSampleQueryPort;
  preparePreview?: CanvasDraftLifecycle['flushDraftForExecution'];
  copy: CanvasSemanticEditorCopy;
  blocked: boolean;
}>;

export class CanvasModelDataQueryError extends CanvasTransformDataSampleQueryError {
  constructor(readonly reason: 'save-failed' | 'stale') {
    super();
  }
}

/** Shared lifecycle for whole-Model and selected-relation samples, independent of presentation. */
export async function queryCanvasModelDataSample(
  options: Pick<
    CanvasModelDataQueryOptions,
    'canvasId' | 'nodeId' | 'relationId' | 'canEditModel' | 'preparePreview'
  > &
    Readonly<{ semanticDigest: string; query: ICanvasTransformDataSampleQueryPort }>,
  isCurrent: () => boolean
): Promise<TransformDataSampleResponse> {
  const { canvasId, nodeId, relationId, semanticDigest, canEditModel, preparePreview, query } =
    options;
  const request = TransformDataSampleRequestSchema.parse({
    canvasId,
    transformNodeId: nodeId,
    limit: TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
    semanticPlanSha256: semanticDigest,
    ...(relationId == null ? {} : { relationId }),
  });
  if (!isCurrent()) throw new CanvasModelDataQueryError('stale');
  if (canEditModel) {
    const saved = await preparePreview?.();
    if (saved?.ok !== true) throw new CanvasModelDataQueryError('save-failed');
    const savedNode = saved.canonicalNodes.find((node) => node.id === nodeId);
    if (
      savedNode == null ||
      readDvtTransformAuthoringAuthority(savedNode)?.semanticDocument.semanticPlan.sha256 !==
        semanticDigest
    ) {
      throw new CanvasModelDataQueryError('stale');
    }
  }
  if (!isCurrent()) throw new CanvasModelDataQueryError('stale');
  const sample = await query.previewTransformRows(request);
  if (
    !isCurrent() ||
    sample.canvasId !== canvasId ||
    sample.transformNodeId !== nodeId ||
    sample.relationId !== relationId ||
    sample.semanticPlanSha256 !== semanticDigest
  ) {
    throw new CanvasModelDataQueryError('stale');
  }
  return sample;
}

export function useCanvasModelDataQuery({
  canvasId,
  nodeId,
  semanticDigest,
  relationId,
  canEditModel,
  query,
  preparePreview,
  copy,
  blocked,
}: CanvasModelDataQueryOptions) {
  const [sample, setSample] = useState<TransformDataSampleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const busy = useRef(false);
  const activeRelation = useRef<string>();
  const reset = useCallback(() => {
    requestId.current += 1;
    busy.current = false;
    setSample(null);
    setLoading(false);
    setError(null);
  }, []);
  useEffect(
    () => () => {
      requestId.current += 1;
    },
    []
  );
  const available =
    query != null &&
    !blocked &&
    (!canEditModel || preparePreview != null) &&
    semanticDigest != null;
  const load = useCallback(
    async (selectedRelationId = relationId) => {
      if (
        !available ||
        semanticDigest == null ||
        (busy.current && activeRelation.current === selectedRelationId)
      )
        return;
      const id = ++requestId.current;
      busy.current = true;
      activeRelation.current = selectedRelationId;
      setLoading(true);
      setError(null);
      setSample((previous) => (previous?.relationId === selectedRelationId ? previous : null));
      try {
        const next = await queryCanvasModelDataSample(
          {
            canvasId,
            nodeId,
            semanticDigest,
            relationId: selectedRelationId,
            canEditModel,
            preparePreview,
            query,
          },
          () => requestId.current === id
        );
        if (requestId.current !== id) return;
        setSample(next);
      } catch (failure) {
        if (requestId.current === id)
          setError(
            failure instanceof CanvasModelDataQueryError
              ? { 'save-failed': copy.saveFailed, stale: copy.staleHint }[failure.reason]
              : copy.failed
          );
      } finally {
        if (requestId.current === id) {
          busy.current = false;
          setLoading(false);
        }
      }
    },
    [
      available,
      canEditModel,
      preparePreview,
      query,
      canvasId,
      nodeId,
      semanticDigest,
      relationId,
      copy.saveFailed,
      copy.staleHint,
      copy.failed,
    ]
  );
  return { sample, loading, error, available, load, reset };
}
