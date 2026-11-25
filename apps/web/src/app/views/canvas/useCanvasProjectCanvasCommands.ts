/** Owned concern: adapt project Canvas create/select actions to the current guarded draft command DTO. */
import { useCallback, useMemo } from 'react';
import type {
  CanvasDraftLifecycle,
  CanvasProjectCanvasLifecycleCommandDto,
} from './canvasDraftLifecycle.types';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import { executeSelectCanvasDocumentCommand } from './canvasProjectCanvasLifecycleCommand';

export function useCanvasProjectCanvasCommands({
  currentDraftPayload,
  draftRepository,
  graphDraftQuery,
  draftQueryCache,
  canPersistGraphDraft,
  setDraftSession,
  setDraftSaveStatus,
  lastSavedSignatureRef,
  invalidateInFlightSaveAttempt,
}: CanvasProjectCanvasLifecycleCommandDto): Pick<
  CanvasDraftLifecycle,
  'handleCreateCanvasDocument' | 'handleSelectCanvasDocument'
> {
  const commandDto = useMemo(
    () => ({
      currentDraftPayload,
      draftRepository,
      graphDraftQuery: {
        data: graphDraftQuery.data,
        isPending: graphDraftQuery.isPending,
        isError: graphDraftQuery.isError,
      },
      draftQueryCache,
      canPersistGraphDraft,
      setDraftSession,
      setDraftSaveStatus,
      lastSavedSignatureRef,
      invalidateInFlightSaveAttempt,
    }),
    [
      currentDraftPayload,
      draftRepository,
      graphDraftQuery.data,
      graphDraftQuery.isPending,
      graphDraftQuery.isError,
      draftQueryCache,
      canPersistGraphDraft,
      setDraftSession,
      setDraftSaveStatus,
      lastSavedSignatureRef,
      invalidateInFlightSaveAttempt,
    ]
  );
  const handleCreateCanvasDocument = useCallback<
    CanvasDraftLifecycle['handleCreateCanvasDocument']
  >(
    async (command) => {
      await executeCreateCanvasDocumentCommand({ ...commandDto, command });
    },
    [commandDto]
  );
  const handleSelectCanvasDocument = useCallback<
    CanvasDraftLifecycle['handleSelectCanvasDocument']
  >(
    async (canvasId) => {
      await executeSelectCanvasDocumentCommand({ ...commandDto, canvasId });
    },
    [commandDto]
  );
  return { handleCreateCanvasDocument, handleSelectCanvasDocument };
}
