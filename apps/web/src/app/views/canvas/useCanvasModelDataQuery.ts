/** Own bounded, revision-checked row queries independently of their visual entry point. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  TRANSFORM_DATA_SAMPLE_DEFAULT_LIMIT,
  TransformDataSampleRequestSchema,
  type TransformDataSampleResponse,
} from '@dvt/contracts';
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
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
  executionRequest?: number;
}>;

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
  executionRequest,
}: CanvasModelDataQueryOptions) {
  const [sample, setSample] = useState<TransformDataSampleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const busy = useRef(false);
  const handledExecution = useRef<number>();
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
  const load = useCallback(async () => {
    if (!available || busy.current) return;
    const id = ++requestId.current;
    busy.current = true;
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
      if (requestId.current === id) {
        busy.current = false;
        setLoading(false);
      }
    }
  }, [
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
  ]);
  useEffect(() => {
    if (executionRequest == null || handledExecution.current === executionRequest) return;
    handledExecution.current = executionRequest;
    void load();
  }, [executionRequest, load]);
  return { sample, loading, error, available, load };
}
