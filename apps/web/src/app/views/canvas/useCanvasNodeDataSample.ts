/** Owned concern: project Canvas nodes onto the existing governed data-sample query. */
import { useCallback } from 'react';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasShellProps } from './canvasShell.types';
import {
  CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
  resolveCanvasSinkDataSampleTarget,
  resolveCanvasSourceDataSampleTarget,
  type CanvasSinkDataSampleTarget,
  type CanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';
import { useCanvasDataSample } from './useCanvasDataSample';

type CanvasNodeDataSampleProjection = Readonly<{
  canOpen: boolean;
  onOpen?: () => void;
  sinkResult: CanvasSinkDataSampleTarget | null;
}>;

type CanvasNodeDataSampleArgs = Pick<
  CanvasShellProps,
  | 'canvasTransformDataSampleQuery'
  | 'runMaterializationSampleQuery'
  | 'runSnapshot'
  | 'warehouseSourceDataSampleQuery'
> &
  Readonly<{ activeCanvasId: string | null }>;

export function useCanvasNodeDataSample({
  activeCanvasId,
  canvasTransformDataSampleQuery,
  runMaterializationSampleQuery,
  runSnapshot,
  warehouseSourceDataSampleQuery,
}: CanvasNodeDataSampleArgs): Readonly<{
  dataSampleTabs: ReturnType<typeof useCanvasDataSample>['dataSampleTabs'];
  projectNode: (nodeId: string, data: DbtNodeData) => CanvasNodeDataSampleProjection;
  openSource?: (nodeId: string, target: CanvasSourceDataSampleTarget) => void;
}> {
  const { dataSampleTabs, openDataSample } = useCanvasDataSample();
  const openSource = useCallback(
    (nodeId: string, target: CanvasSourceDataSampleTarget) => {
      if (warehouseSourceDataSampleQuery == null) return;
      openDataSample(nodeId, target.nodeName, () =>
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
    (nodeId: string, target: CanvasSinkDataSampleTarget) => {
      if (runMaterializationSampleQuery == null) return;
      openDataSample(nodeId, target.nodeName, () =>
        runMaterializationSampleQuery(target.runId, CANVAS_SOURCE_DATA_SAMPLE_LIMIT)
      );
    },
    [openDataSample, runMaterializationSampleQuery]
  );
  const openTransform = useCallback(
    (nodeId: string, nodeName: string) => {
      if (activeCanvasId == null || canvasTransformDataSampleQuery == null) return;
      openDataSample(nodeId, nodeName, () =>
        canvasTransformDataSampleQuery.previewTransformRows({
          canvasId: activeCanvasId,
          transformNodeId: nodeId,
          limit: CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
        })
      );
    },
    [activeCanvasId, canvasTransformDataSampleQuery, openDataSample]
  );
  const projectNode = useCallback(
    (nodeId: string, data: DbtNodeData): CanvasNodeDataSampleProjection => {
      const isNativeTransform = data.pluginKind === 'dvt:transform';
      const sourceTarget = resolveCanvasSourceDataSampleTarget(data);
      const sinkTarget = resolveCanvasSinkDataSampleTarget(data, runSnapshot);
      const onOpen = isNativeTransform
        ? activeCanvasId != null && canvasTransformDataSampleQuery != null
          ? () => openTransform(nodeId, data.name)
          : undefined
        : sourceTarget != null && warehouseSourceDataSampleQuery != null
          ? () => openSource(nodeId, sourceTarget)
          : sinkTarget != null && runMaterializationSampleQuery != null
            ? () => openSink(nodeId, sinkTarget)
            : undefined;

      return { canOpen: onOpen != null, onOpen, sinkResult: sinkTarget };
    },
    [
      activeCanvasId,
      canvasTransformDataSampleQuery,
      openSink,
      openSource,
      openTransform,
      runMaterializationSampleQuery,
      runSnapshot,
      warehouseSourceDataSampleQuery,
    ]
  );

  return {
    dataSampleTabs,
    projectNode,
    openSource: warehouseSourceDataSampleQuery == null ? undefined : openSource,
  };
}
