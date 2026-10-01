/** Source sample admission and freshness; no presentation or authoring writes. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { DbtNodeData } from '../../components/canvas/DbtNodeComponent';
import { WarehouseSourceDataSampleQueryError } from '../../services/workspace/workspaceErrors';
import type { CanvasShellProps } from './canvasShell.types';
import {
  CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
  projectCanvasSourceDataSample,
  resolveCanvasSourceSamplePublication,
  type CanvasSourceDataSampleTarget,
} from './canvasSourceDataSample';
import type { useCanvasDataSample } from './useCanvasDataSample';

export function useCanvasSourceDataSample({
  canvasId,
  nodes,
  query,
  openDataSample,
  invalidateDataSample,
}: Readonly<{
  canvasId: string | null;
  nodes: CanvasShellProps['graph']['nodesWithImpact'];
  query: CanvasShellProps['warehouseSourceDataSampleQuery'];
}> &
  Pick<ReturnType<typeof useCanvasDataSample>, 'openDataSample' | 'invalidateDataSample'>) {
  const publications = useMemo(
    () =>
      new Map(
        nodes.map((node) => {
          const publication = resolveCanvasSourceSamplePublication(node.data as DbtNodeData);
          return [
            node.id,
            {
              publication,
              key: publication == null ? null : JSON.stringify([canvasId, publication]),
            },
          ] as const;
        })
      ),
    [canvasId, nodes]
  );
  const current = useRef<typeof publications | null>(null);
  const sampled = useRef(new Map<string, string>());
  useEffect(() => {
    current.current = publications;
    for (const [nodeId, key] of sampled.current) {
      if (publications.get(nodeId)?.key === key) continue;
      sampled.current.delete(nodeId);
      invalidateDataSample(nodeId);
    }
    return () => {
      current.current = null;
    };
  }, [publications, invalidateDataSample]);

  const openSource = useCallback(
    (
      nodeId: string,
      target: CanvasSourceDataSampleTarget,
      selectedFieldNames?: readonly string[],
      isCurrent: () => boolean = () => true
    ) => {
      if (query == null || selectedFieldNames?.length === 0 || !isCurrent()) return;
      openDataSample(nodeId, target.nodeName, async () => {
        const sample = await query.previewSourceObjectRows({
          connectionId: target.connectionId,
          objectId: target.objectId,
          ...(target.expectedPublicationToken == null
            ? {}
            : {
                expectedPublicationToken: target.expectedPublicationToken,
              }),
          limit: CANVAS_SOURCE_DATA_SAMPLE_LIMIT,
        });
        if (!isCurrent()) throw new WarehouseSourceDataSampleQueryError('unavailable');
        return selectedFieldNames == null
          ? sample
          : projectCanvasSourceDataSample(sample, selectedFieldNames);
      });
    },
    [query, openDataSample]
  );

  const projectSource = useCallback(
    (nodeId: string) => {
      const entry = publications.get(nodeId);
      if (query == null || entry?.publication == null || entry.key == null) return undefined;
      const { publication, key } = entry;
      return () => {
        const isCurrent = () => current.current?.get(nodeId)?.key === key;
        if (!isCurrent()) return;
        sampled.current.set(nodeId, key);
        openSource(nodeId, publication.target, publication.selectedFieldNames, isCurrent);
      };
    },
    [publications, query, openSource]
  );

  return { projectSource, openSource: query == null ? undefined : openSource };
}
