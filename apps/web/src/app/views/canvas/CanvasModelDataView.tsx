/** Owned concern: bind the model data view to its existing protected sample query. */
import type { ICanvasTransformDataSampleQueryPort } from '../../ports/canvasDataSample';
import type { CanvasDraftLifecycle } from './canvasDraftLifecycle.types';
import { CanvasModelDataPanel, type CanvasModelDataPanelProps } from './CanvasModelDataPanel';
import { useCanvasModelDataQuery } from './useCanvasModelDataQuery';

export type CanvasModelPreviewPreparation = CanvasDraftLifecycle['flushDraftForExecution'];

export function CanvasModelDataView({
  canvasId,
  nodeId,
  canEditModel = true,
  query,
  preparePreview,
  relationId,
  semanticDigest,
  ...presentation
}: CanvasModelDataPanelProps &
  Readonly<{
    canvasId: string;
    nodeId: string;
    canEditModel?: boolean;
    query?: ICanvasTransformDataSampleQueryPort;
    preparePreview?: CanvasModelPreviewPreparation;
    relationId?: string;
    semanticDigest: string | null;
  }>): JSX.Element {
  const data = useCanvasModelDataQuery({
    canvasId,
    nodeId,
    relationId,
    canEditModel,
    query,
    preparePreview,
    semanticDigest,
    copy: presentation.copy,
    blocked:
      presentation.disabledReason != null || (presentation.unresolvedInputs?.length ?? 0) > 0,
  });
  const stale =
    data.sample != null &&
    (data.sample.semanticPlanSha256 !== semanticDigest ||
      (presentation.unresolvedInputs?.length ?? 0) > 0);
  return (
    <CanvasModelDataPanel
      {...presentation}
      data={{ ...data, stale }}
      actions={{ load: data.load }}
    />
  );
}
