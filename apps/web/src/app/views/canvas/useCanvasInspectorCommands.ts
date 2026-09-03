/** Owned concern: expose route-owned Inspector mutation commands over the Canvas draft aggregate. */
import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import type { CanvasInspectorNodeDraft } from './canvasInspectorAuthoring.types';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanonicalNode } from '../../types/canonical';
import type { WorkspaceScope } from '../../ports/sessionContext';

type UseCanvasInspectorCommandsArgs = {
  inspectorNode: CanonicalNode | null;
  setDraftSession: Dispatch<SetStateAction<CanvasDraftSession>>;
  workspaceScope: WorkspaceScope;
};

export function useCanvasInspectorCommands({
  inspectorNode,
  setDraftSession,
  workspaceScope,
}: UseCanvasInspectorCommandsArgs) {
  const applyInspectorNodeDraft = useCallback(
    (draft: CanvasInspectorNodeDraft) => {
      if (inspectorNode == null) {
        return;
      }

      setDraftSession((currentSession) =>
        applyCanvasInspectorNodeDraftToSession({
          draftSession: currentSession,
          node: inspectorNode,
          draft,
          workspaceScope,
        })
      );
    },
    [inspectorNode, setDraftSession, workspaceScope]
  );

  return {
    applyInspectorNodeDraft,
  };
}
