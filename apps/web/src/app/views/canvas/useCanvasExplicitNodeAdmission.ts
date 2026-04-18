import { useCallback } from 'react';

import { addExplicitNode } from './canvasDraftSession';
import type {
  CanvasGraphChangeHandlers,
  UseCanvasMutationHandlersArgs,
} from './canvasMutationHandlers.types';

type UseCanvasExplicitNodeAdmissionArgs = Pick<
  UseCanvasMutationHandlersArgs,
  'setDraftSession'
>;

export function useCanvasExplicitNodeAdmission({
  setDraftSession,
}: UseCanvasExplicitNodeAdmissionArgs): Pick<
  CanvasGraphChangeHandlers,
  'handleNodeAddedToCanvas'
> {
  const handleNodeAddedToCanvas = useCallback(
    (nodeId: string) => {
      setDraftSession((currentSession) => addExplicitNode(currentSession, nodeId));
    },
    [setDraftSession]
  );

  return {
    handleNodeAddedToCanvas,
  };
}
