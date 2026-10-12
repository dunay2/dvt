/** Own current-model sample admission and invalidation, independently of rendering. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasShellProps } from './canvasShell.types';
import type { useCanvasDataSample } from './useCanvasDataSample';
import { toCanvasAuthoringSerializableValue } from './canvasAuthoringMetadata';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { queryCanvasModelDataSample } from './useCanvasModelDataQuery';

export function useCanvasTransformDataSample({
  canvasId,
  nodes,
  edges,
  query,
  canEditModel,
  preparePreview,
  openDataSample,
  invalidateDataSample,
}: Readonly<{
  canvasId: string | null;
  nodes: readonly CanonicalNode[];
  edges: readonly CanonicalEdge[];
  query: CanvasShellProps['canvasTransformDataSampleQuery'];
  preparePreview: CanvasShellProps['prepareModelPreview'];
  canEditModel: boolean;
}> &
  Pick<ReturnType<typeof useCanvasDataSample>, 'openDataSample' | 'invalidateDataSample'>) {
  // Graph metadata/bindings are query inputs; positions, selection and viewport are not.
  const revision = useMemo(
    () =>
      JSON.stringify(
        toCanvasAuthoringSerializableValue([
          canvasId,
          nodes
            .map(({ id, pluginId, kind, metadata }) => ({ id, pluginId, kind, metadata }))
            .sort((a, b) => a.id.localeCompare(b.id)),
          [...edges].sort((a, b) => a.id.localeCompare(b.id)),
        ])
      ),
    [canvasId, nodes, edges]
  );
  const models = useMemo(
    () =>
      new Map(
        nodes.flatMap((node) => {
          if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return [];
          try {
            const digest =
              readDvtTransformAuthoringAuthority(node)?.semanticDocument.semanticPlan.sha256;
            return digest == null ? [] : [[node.id, { name: node.name, digest }] as const];
          } catch {
            return [];
          }
        })
      ),
    [nodes]
  );
  const current = useRef<string | null>(null);
  const sampled = useRef(new Map<string, string>());
  useEffect(() => {
    current.current = revision;
    for (const [id, previous] of sampled.current) {
      if (previous === revision && models.has(id)) continue;
      sampled.current.delete(id);
      invalidateDataSample(id);
    }
    return () => {
      current.current = null;
    };
  }, [revision, models, invalidateDataSample]);

  return useCallback(
    (nodeId: string) => {
      const model = models.get(nodeId);
      if (
        canvasId == null ||
        model == null ||
        query == null ||
        (canEditModel && preparePreview == null)
      )
        return undefined;
      return () => {
        const isCurrent = () => current.current === revision;
        if (!isCurrent()) return;
        sampled.current.set(nodeId, revision);
        openDataSample(nodeId, model.name, () =>
          queryCanvasModelDataSample(
            {
              canvasId,
              nodeId,
              semanticDigest: model.digest,
              canEditModel,
              preparePreview,
              query,
            },
            isCurrent
          )
        );
      };
    },
    [canvasId, models, revision, query, canEditModel, preparePreview, openDataSample]
  );
}
