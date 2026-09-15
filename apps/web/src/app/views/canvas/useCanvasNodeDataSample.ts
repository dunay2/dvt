/** Owned concern: project Canvas nodes onto the existing governed data-sample query. */
import { useCallback } from 'react';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanonicalNode } from '../../types/canonical';
import type { CanvasShellProps } from './canvasShell.types';
import {
  CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
  resolveCanvasSinkDataSampleTarget,
  resolveCanvasSourceDataSampleTarget,
  type CanvasSinkDataSampleTarget,
  type CanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';
import { resolveCanvasTransformOutputSampleTarget } from './canvasTransformOutputSample';
import { useCanvasDataSample } from './useCanvasDataSample';

type CanvasNodeDataSampleProjection = Readonly<{
  canOpen: boolean;
  onOpen?: () => void;
  sinkResult: CanvasSinkDataSampleTarget | null;
}>;

type CanvasNodeDataSampleArgs = Pick<
  CanvasShellProps,
  | 'runMaterializationSampleQuery'
  | 'runOutputPreviewAuthority'
  | 'runSnapshot'
  | 'warehouseSourceDataSampleQuery'
> &
  Readonly<{ graphNodes: readonly CanonicalNode[] }>;

export function useCanvasNodeDataSample({
  graphNodes,
  runMaterializationSampleQuery,
  runOutputPreviewAuthority,
  runSnapshot,
  warehouseSourceDataSampleQuery,
}: CanvasNodeDataSampleArgs): Readonly<{
  dataSample: ReturnType<typeof useCanvasDataSample>['dataSample'];
  projectNode: (nodeId: string, data: DbtNodeData) => CanvasNodeDataSampleProjection;
}> {
  const { dataSample, openDataSample } = useCanvasDataSample();
  const openSource = useCallback(
    (target: CanvasSourceDataSampleTarget) => {
      if (warehouseSourceDataSampleQuery == null) return;
      openDataSample(target.nodeName, () =>
        warehouseSourceDataSampleQuery.previewSourceObjectRows({
          connectionId: target.connectionId,
          objectId: target.objectId,
          ...(target.expectedPublicationToken == null
            ? {}
            : { expectedPublicationToken: target.expectedPublicationToken }),
          limit: CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
        })
      );
    },
    [openDataSample, warehouseSourceDataSampleQuery]
  );
  const openSink = useCallback(
    (target: CanvasSinkDataSampleTarget) => {
      if (runMaterializationSampleQuery == null) return;
      openDataSample(target.nodeName, () =>
        runMaterializationSampleQuery(target.runId, CANVAS_SOURCE_DATA_SAMPLE_LIMIT)
      );
    },
    [openDataSample, runMaterializationSampleQuery]
  );
  const projectNode = useCallback(
    (nodeId: string, data: DbtNodeData): CanvasNodeDataSampleProjection => {
      const isNativeTransform = data.pluginKind === 'dvt:transform';
      const sourceTarget = resolveCanvasSourceDataSampleTarget(data);
      const transform = graphNodes.find((node) => node.id === nodeId);
      const transformTarget =
        isNativeTransform && transform != null && runOutputPreviewAuthority != null
          ? resolveCanvasTransformOutputSampleTarget({
              transform,
              graphNodes,
              currentPlan: runOutputPreviewAuthority.currentPlan,
              isCurrentPlanStale: runOutputPreviewAuthority.isCurrentPlanStale,
              runSnapshot,
            })
          : null;
      const sinkTarget = resolveCanvasSinkDataSampleTarget(data, runSnapshot);
      const onOpen = isNativeTransform
        ? transformTarget == null
          ? () => openDataSample(data.name)
          : () => openSource(transformTarget)
        : sourceTarget != null && warehouseSourceDataSampleQuery != null
          ? () => openSource(sourceTarget)
          : sinkTarget != null && runMaterializationSampleQuery != null
            ? () => openSink(sinkTarget)
            : undefined;

      return { canOpen: onOpen != null, onOpen, sinkResult: sinkTarget };
    },
    [
      graphNodes,
      openDataSample,
      openSink,
      openSource,
      runMaterializationSampleQuery,
      runOutputPreviewAuthority,
      runSnapshot,
      warehouseSourceDataSampleQuery,
    ]
  );

  return { dataSample, projectNode };
}
