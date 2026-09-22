/** Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate. */
import { useCallback } from 'react';

import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import type {
  CanvasInspectorNodeDraft,
  CanvasInspectorNodeDraftApplyResult,
} from './canvasInspectorAuthoring.types';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import type { CanvasDraftSessionCommandRunner } from './useCanvasWorkspaceDraftSession';

type UseCanvasInspectorCommandsArgs = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  inspectorNode: CanonicalNode | null;
  runDraftSessionCommand: CanvasDraftSessionCommandRunner;
  workspaceScope: WorkspaceScope;
};

export function useCanvasInspectorCommands({
  canonicalNodesById,
  inspectorNode,
  runDraftSessionCommand,
  workspaceScope,
}: UseCanvasInspectorCommandsArgs) {
  const applyNodeDraft = useCallback(
    (nodeId: string, draft: CanvasInspectorNodeDraft): CanvasInspectorNodeDraftApplyResult =>
      runDraftSessionCommand((currentSession) => {
        const node = resolveCanvasDraftNodes(currentSession, canonicalNodesById).find(
          (candidate) => candidate.id === nodeId
        );
        if (node == null) return { outcome: 'rejected', reason: 'node_unavailable' } as const;
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
  const applyInspectorNodeDraft = useCallback(
    (draft: CanvasInspectorNodeDraft): CanvasInspectorNodeDraftApplyResult =>
      inspectorNode == null
        ? { outcome: 'rejected', reason: 'node_unavailable' }
        : applyNodeDraft(inspectorNode.id, draft),
    [applyNodeDraft, inspectorNode]
  );

  return {
    applyNodeDraft,
    applyInspectorNodeDraft,
  };
}
