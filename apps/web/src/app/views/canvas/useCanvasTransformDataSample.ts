/** Own current-model sample admission and invalidation, independently of rendering. */
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { projectWorkspaceNodeInstanceEdges, workspaceNodeDefinitionId } from '@dvt/contracts';
import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import type { CanvasShellProps } from './canvasShell.types';
import type { useCanvasDataSample } from './useCanvasDataSample';
import { toCanvasAuthoringSerializableValue } from './canvasAuthoringMetadata';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { queryCanvasModelDataSample } from './useCanvasModelDataQuery';
import { canvasNodeQueryMetadata } from './canvasNodeQueryMetadata';
import { resolveCanvasDbtModelSignature } from './canvasDbtModelReference';

/** Fingerprint only the target's effective upstream context, including shared definitions. */
function modelQueryRevision(
  canvasId: string | null,
  nodeId: string,
  nodes: ReadonlyMap<string, CanonicalNode>,
  incoming: ReadonlyMap<string, readonly CanonicalEdge[]>
): string {
  const visited = new Set<string>();
  const context = new Map<string, CanonicalNode>();
  const edges: CanonicalEdge[] = [];
  const pending = [nodeId];
  while (pending.length > 0) {
    const id = pending.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = nodes.get(id);
    if (node == null) throw new Error('Model sample input is no longer available.');
    context.set(id, node);
    const definitionId = workspaceNodeDefinitionId(node);
    let inputs = incoming.get(id) ?? [];
    if (definitionId != null) {
      const definition = nodes.get(definitionId);
      if (definition == null) throw new Error('Model sample definition is no longer available.');
      context.set(definitionId, definition);
      inputs = projectWorkspaceNodeInstanceEdges(
        [node, definition],
        [...inputs, ...(incoming.get(definitionId) ?? [])]
      ).filter((edge) => edge.targetId === id);
    }
    edges.push(...inputs);
    pending.push(...inputs.map((edge) => edge.sourceId));
  }
  return JSON.stringify(
    toCanvasAuthoringSerializableValue([
      canvasId,
      nodeId,
      [...context.values()]
        .map((node) => ({
          id: node.id,
          definitionId: workspaceNodeDefinitionId(node),
          pluginId: node.pluginId,
          kind: node.kind,
          role: node.role,
          metadata: canvasNodeQueryMetadata(node),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      edges.sort((a, b) => a.id.localeCompare(b.id)),
    ])
  );
}

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
  const models = useMemo(
    () =>
      new Map(
        nodes.flatMap((node) => {
          if (node.pluginId !== 'dvt' || node.kind !== 'dvt:transform') return [];
          try {
            const digest =
              resolveCanvasDbtModelSignature(node)?.document.sidecar.semanticPlanSha256 ??
              readDvtTransformAuthoringAuthority(node)?.semanticDocument.semanticPlan.sha256;
            if (digest == null) return [];
            return [[node.id, { name: node.name, digest }] as const];
          } catch {
            return [];
          }
        })
      ),
    [nodes]
  );
  const revisionFor = useMemo(() => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const incoming = new Map<string, CanonicalEdge[]>();
    for (const edge of edges) {
      if (!incoming.has(edge.targetId)) incoming.set(edge.targetId, []);
      incoming.get(edge.targetId)!.push(edge);
    }
    // Resolve only requested samples, once per target in this graph snapshot.
    const revisions = new Map<string, string | undefined>();
    return (nodeId: string): string | undefined => {
      if (!models.has(nodeId)) return undefined;
      if (!revisions.has(nodeId)) {
        try {
          revisions.set(nodeId, modelQueryRevision(canvasId, nodeId, byId, incoming));
        } catch {
          revisions.set(nodeId, undefined);
        }
      }
      return revisions.get(nodeId);
    };
  }, [canvasId, nodes, edges, models]);
  const current = useRef<typeof revisionFor | null>(null);
  const sampled = useRef(new Map<string, string>());
  useEffect(() => {
    current.current = revisionFor;
    for (const [id, previous] of sampled.current) {
      if (previous === revisionFor(id)) continue;
      sampled.current.delete(id);
      invalidateDataSample(id);
    }
    return () => {
      current.current = null;
    };
  }, [revisionFor, invalidateDataSample]);

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
        const revision = revisionFor(nodeId);
        if (revision == null) {
          if (current.current === revisionFor) openDataSample(nodeId, model.name);
          return;
        }
        const isCurrent = () => current.current?.(nodeId) === revision;
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
    [canvasId, models, revisionFor, query, canEditModel, preparePreview, openDataSample]
  );
}
