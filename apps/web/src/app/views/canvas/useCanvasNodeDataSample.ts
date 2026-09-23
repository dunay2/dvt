/** Owned concern: project Canvas nodes onto the existing governed data-sample query. */
import { useCallback, useEffect, useRef } from 'react';

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
import type { CanonicalNode } from '../../types/canonical';
import { queryCanvasModelDataSample } from './useCanvasModelDataQuery';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';

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
  | 'prepareModelPreview'
> &
  Readonly<{
    activeCanvasId: string | null;
    canonicalNodes: readonly CanonicalNode[];
    canEditModel: boolean;
  }>;

export function useCanvasNodeDataSample({
  activeCanvasId,
  canvasTransformDataSampleQuery,
  runMaterializationSampleQuery,
  runSnapshot,
  warehouseSourceDataSampleQuery,
  prepareModelPreview,
  canonicalNodes,
  canEditModel,
}: CanvasNodeDataSampleArgs): Readonly<{
  dataSampleTabs: ReturnType<typeof useCanvasDataSample>['dataSampleTabs'];
  projectNode: (nodeId: string, data: DbtNodeData) => CanvasNodeDataSampleProjection;
  openSource?: (nodeId: string, target: CanvasSourceDataSampleTarget) => void;
}> {
  const { dataSampleTabs, openDataSample } = useCanvasDataSample();
  const current = useRef<{ canvasId: string | null; nodes: readonly CanonicalNode[] } | null>(null);
  useEffect(() => {
    current.current = { canvasId: activeCanvasId, nodes: canonicalNodes };
    return () => {
      current.current = null;
    };
  }, [activeCanvasId, canonicalNodes]);
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
    (nodeId: string, nodeName: string, semanticDigest: string) => {
      if (activeCanvasId == null || canvasTransformDataSampleQuery == null) return;
      openDataSample(nodeId, nodeName, () =>
        queryCanvasModelDataSample(
          {
            canvasId: activeCanvasId,
            nodeId,
            semanticDigest,
            canEditModel,
            preparePreview: prepareModelPreview,
            query: canvasTransformDataSampleQuery,
          },
          () => {
            const node = current.current?.nodes.find((entry) => entry.id === nodeId);
            return (
              current.current?.canvasId === activeCanvasId &&
              node != null &&
              readDvtTransformAuthoringAuthority(node)?.semanticDocument.semanticPlan.sha256 ===
                semanticDigest
            );
          }
        )
      );
    },
    [
      activeCanvasId,
      canvasTransformDataSampleQuery,
      canEditModel,
      prepareModelPreview,
      openDataSample,
    ]
  );
  const projectNode = useCallback(
    (nodeId: string, data: DbtNodeData): CanvasNodeDataSampleProjection => {
      const isNativeTransform = data.pluginKind === 'dvt:transform';
      const node = isNativeTransform ? canonicalNodes.find((entry) => entry.id === nodeId) : null;
      const semanticDigest =
        node == null
          ? null
          : readDvtTransformAuthoringAuthority(node)?.semanticDocument.semanticPlan.sha256;
      const sourceTarget = resolveCanvasSourceDataSampleTarget(data);
      const sinkTarget = resolveCanvasSinkDataSampleTarget(data, runSnapshot);
      const onOpen = isNativeTransform
        ? activeCanvasId != null &&
          canvasTransformDataSampleQuery != null &&
          semanticDigest != null &&
          (!canEditModel || prepareModelPreview != null)
          ? () => openTransform(nodeId, data.name, semanticDigest)
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
      canonicalNodes,
      canEditModel,
      prepareModelPreview,
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
