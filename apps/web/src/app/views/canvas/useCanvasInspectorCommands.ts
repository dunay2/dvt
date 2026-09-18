/** Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate. */
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';

type UseCanvasInspectorCommandsArgs = {
  canonicalNodesById: ReadonlyMap<string, CanonicalNode>;
  inspectorNode: CanonicalNode | null;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  workspaceScope: WorkspaceScope;
};

export function useCanvasInspectorCommands({
  canonicalNodesById,
  inspectorNode,
  setDraftSession,
  workspaceScope,
}: UseCanvasInspectorCommandsArgs) {
  const applyNodeDraft = useCallback(
    (nodeId: string, draft: CanvasInspectorNodeDraft) => {
      setDraftSession((currentSession) => {
        const node = resolveCanvasDraftNodes(currentSession, canonicalNodesById).find(
          (candidate) => candidate.id === nodeId
        );
        return node == null
          ? currentSession
          : applyCanvasInspectorNodeDraftToSession({
              canonicalNodesById,
              draftSession: currentSession,
              node,
              draft,
              workspaceScope,
            });
      });
    },
    [canonicalNodesById, setDraftSession, workspaceScope]
  );
  const applyInspectorNodeDraft = useCallback(
    (draft: CanvasInspectorNodeDraft) => {
      if (inspectorNode != null) applyNodeDraft(inspectorNode.id, draft);
    },
    [applyNodeDraft, inspectorNode]
  );

  return {
    applyNodeDraft,
    applyInspectorNodeDraft,
  };
}
