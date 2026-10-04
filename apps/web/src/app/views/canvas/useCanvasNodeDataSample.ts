/** Owned concern: project Canvas nodes onto the existing governed data-sample query. */
import { useCallback, useMemo } from 'react';

import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import type { CanvasShellProps } from './canvasShell.types';
import { type CanvasSourceDataSampleTarget } from './canvasSourceDataSample';
import { useCanvasDataSample } from './useCanvasDataSample';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { useCanvasTransformDataSample } from './useCanvasTransformDataSample';
import { useCanvasSourceDataSample } from './useCanvasSourceDataSample';

export type CanvasNodeDataSampleProjection = Readonly<{
  canOpen: boolean;
  onOpen?: () => void;
  sourceMetricAvailability?: 'unavailable';
}>;

type CanvasNodeDataSampleArgs = Pick<
  CanvasShellProps,
  'canvasTransformDataSampleQuery' | 'warehouseSourceDataSampleQuery' | 'prepareModelPreview'
> &
  Readonly<{
    activeCanvasId: string | null;
    canonicalNodes: readonly CanonicalNode[];
    canonicalEdges: readonly CanonicalEdge[];
    canEditModel: boolean;
    nodes: CanvasShellProps['graph']['nodesWithImpact'];
  }>;

export function useCanvasNodeDataSample({
  activeCanvasId,
  canvasTransformDataSampleQuery,
  warehouseSourceDataSampleQuery,
  prepareModelPreview,
  canonicalNodes,
  canonicalEdges,
  canEditModel,
  nodes,
}: CanvasNodeDataSampleArgs): Readonly<{
  dataSampleTabs: ReturnType<typeof useCanvasDataSample>['dataSampleTabs'];
  projectNode: (nodeId: string, data: DbtNodeData) => CanvasNodeDataSampleProjection;
  openSource?: (
    nodeId: string,
    target: CanvasSourceDataSampleTarget,
    selectedFieldNames?: readonly string[]
  ) => void;
}> {
  const { dataSampleTabs, openDataSample, invalidateDataSample } = useCanvasDataSample();
  const { openSource, projectSource } = useCanvasSourceDataSample({
    canvasId: activeCanvasId,
    nodes,
    query: warehouseSourceDataSampleQuery,
    openDataSample,
    invalidateDataSample,
  });
  const projectTransform = useCanvasTransformDataSample({
    canvasId: activeCanvasId,
    nodes: canonicalNodes,
    edges: canonicalEdges,
    query: canvasTransformDataSampleQuery,
    preparePreview: prepareModelPreview,
    canEditModel,
    openDataSample,
    invalidateDataSample,
  });
  const projectNode = useCallback(
    (nodeId: string, data: DbtNodeData): CanvasNodeDataSampleProjection => {
      const isNativeTransform = data.pluginKind === 'dvt:transform';
      const onOpen = isNativeTransform ? projectTransform(nodeId) : projectSource(nodeId);

      const sample = dataSampleTabs.find((tab) => tab.id === `data:${nodeId}`)?.dataSample;
      const sourceMetricAvailability =
        !isNativeTransform &&
        sample != null &&
        (sample.status !== 'ready' || sample.sample.rows.length === 0)
          ? ('unavailable' as const)
          : undefined;
      return { canOpen: onOpen != null, onOpen, sourceMetricAvailability };
    },
    [projectSource, projectTransform, dataSampleTabs]
  );

  const refreshableTabs = useMemo(
    () =>
      dataSampleTabs.map((tab) => ({
        ...tab,
        onRefresh:
          projectTransform(tab.id.slice('data:'.length)) ??
          projectSource(tab.id.slice('data:'.length)),
      })),
    [dataSampleTabs, projectSource, projectTransform]
  );
  return {
    dataSampleTabs: refreshableTabs,
    projectNode,
    openSource,
  };
}
