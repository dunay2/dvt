/** Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate. */
import { useCallback, useMemo, useRef } from 'react';
import { jcsCanonicalize } from '@dvt/crypto';

import {
  applyCanvasInspectorNodeDraftToSession,
  applyCanvasInspectorNodeDraftWithInputsToSession,
} from './canvasInspectorAuthoringCommand';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import {
  canConfigureNativeMaterialization,
  withDvtTransformMaterialization,
} from './canvasDvtMaterializationPolicy';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftApplyResult,
  CanvasInspectorNodeDraftInputChanges,
  CanvasApplyNodeDraft,
} from './canvasInspectorAuthoring.types';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';
import { useCanvasColumnDraftCommand } from './useCanvasColumnDraftCommand';

type UseCanvasInspectorCommandsArgs = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  inspectorNode: CanonicalNode | null;
  runDraftSessionCommand: CanvasDraftSessionCommandRunner;
  workspaceScope: WorkspaceScope;
  canEditNode?: boolean;
};

export function useCanvasInspectorCommands({
  canonicalNodesById,
  inspectorNode,
  runDraftSessionCommand,
  workspaceScope,
  canEditNode = false,
}: UseCanvasInspectorCommandsArgs) {
  const applySynchronousDraft = useCallback(
    (nodeId: string, draft: CanvasInspectorNodeDraft): CanvasInspectorNodeDraftApplyResult =>
      runDraftSessionCommand((currentSession) => {
        const node = currentSession.localNodeCatalog?.[nodeId] ?? canonicalNodesById.get(nodeId);
        if (
          node == null ||
          (node.role !== 'input' && !currentSession.workingSet.visibleNodeIds.includes(nodeId))
        )
          return { outcome: 'rejected', reason: 'node_unavailable' } as const;
        return applyCanvasInspectorNodeDraftToSession({
          canonicalNodesById,
          draftSession: currentSession,
          node,
          draft,
          workspaceScope,
        });
      }),
    [canonicalNodesById, runDraftSessionCommand, workspaceScope]
  );
  const submit = useCanvasColumnDraftCommand(runDraftSessionCommand);
  const authority = useRef({ canonicalNodesById, workspaceScope, canEditNode });
  authority.current = { canonicalNodesById, workspaceScope, canEditNode };
  const applyNodeDraft = useMemo<CanvasApplyNodeDraft>(() => {
    const apply = (
      nodeId: string,
      draft: CanvasInspectorNodeDraft,
      changes?: CanvasInspectorNodeDraftInputChanges
    ): CanvasInspectorNodeDraftApplyResult | Promise<CanvasInspectorNodeDraftApplyResult> => {
      if (changes == null) return applySynchronousDraft(nodeId, draft);
      const requestedScope = jcsCanonicalize(workspaceScope);
      return submit(
        async (draftSession, queueSignal) => {
          const current = authority.current;
          const rejected = { outcome: 'rejected', reason: 'node_unavailable' } as const;
          if (!current.canEditNode || jcsCanonicalize(current.workspaceScope) !== requestedScope)
            return rejected;
          const nodes = resolveCanvasDraftNodes(draftSession, current.canonicalNodesById);
          const node = nodes.find((candidate) => candidate.id === nodeId);
          if (node == null) return rejected;
          const identity = jcsCanonicalize(nodes);
          const signal =
            changes.signal == null ? queueSignal : AbortSignal.any([queueSignal, changes.signal]);
          const result = await applyCanvasInspectorNodeDraftWithInputsToSession({
            draftSession,
            canonicalNodesById: current.canonicalNodesById,
            node,
            draft,
            workspaceScope: current.workspaceScope,
            editable: current.canEditNode,
            changes: { ...changes, signal },
          });
          signal.throwIfAborted();
          const latest = authority.current;
          return latest.canEditNode &&
            jcsCanonicalize(latest.workspaceScope) === requestedScope &&
            jcsCanonicalize(resolveCanvasDraftNodes(draftSession, latest.canonicalNodesById)) ===
              identity
            ? result
            : rejected;
        },
        () => ({ outcome: 'rejected', reason: 'node_unavailable' }) as const
      );
    };
    return apply as CanvasApplyNodeDraft;
  }, [applySynchronousDraft, submit, workspaceScope]);
  const applyInspectorNodeDraft = useCallback(
    (draft: CanvasInspectorNodeDraft): CanvasInspectorNodeDraftApplyResult =>
      inspectorNode == null
        ? { outcome: 'rejected', reason: 'node_unavailable' }
        : applyNodeDraft(inspectorNode.id, draft),
    [applyNodeDraft, inspectorNode]
  );
  const setNodeMaterialization = useCallback(
    (nodeId: string, materialized: string): CanvasInspectorNodeDraftApplyResult =>
      runDraftSessionCommand((currentSession) => {
        const node = resolveCanvasDraftNodes(currentSession, canonicalNodesById).find(
          (candidate) => candidate.id === nodeId
        );
        if (!canEditNode || !canConfigureNativeMaterialization(node))
          return { outcome: 'rejected', reason: 'node_unavailable' } as const;
        const draft = createCanvasInspectorNodeDraft(node);
        if (draft.dvt?.kind !== 'transform')
          return { outcome: 'rejected', reason: 'invalid_draft' } as const;
        return applyCanvasInspectorNodeDraftToSession({
          canonicalNodesById,
          draftSession: currentSession,
          node,
          workspaceScope,
          draft: { ...draft, dvt: withDvtTransformMaterialization(draft.dvt, materialized) },
        });
      }),
    [canEditNode, canonicalNodesById, runDraftSessionCommand, workspaceScope]
  );

  return {
    applyNodeDraft,
    applyInspectorNodeDraft,
    setNodeMaterialization,
  };
}
