/** A save acknowledges its sent aggregate, never a newer local edit. */
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { performCanvasDraftAutosave } from './canvasDraftAutosaveExecution';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { buildAuthoringPort } from './canvasDraftRepository.test.fixtures';
import { canvasDraftSession } from './canvasDraftSession';

describe('autosave snapshot acknowledgement', () => {
  it.each(['before send', 'after send', 'no edit'] as const)(
    'preserves only changes outside the request: %s',
    async (timing) => {
      const repository = createCanvasDraftRepository(buildAuthoringPort());
      const record = (await repository.readGraphDraft())!;
      const sentNode: CanonicalNode = {
        id: record.draft.nodeIds[1]!,
        name: 'Sent version',
        kind: 'dvt:transform',
        pluginId: 'dvt',
        status: 'idle',
        tags: [],
        role: 'transform',
      };
      const sent = canvasDraftSession.workingSet.upsertNode(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: record,
          canonicalNodeIds: [],
          canonicalEdges: [],
        }),
        sentNode
      );
      const payload = buildCurrentDraftPayload(
        record.draft.nodePositions,
        sent,
        record.draft.canvas,
        record.draft,
        [],
        []
      );
      let current = sent;
      const newerNode = { ...sentNode, name: 'Newer local version' };
      const edit = (): void => {
        current = canvasDraftSession.workingSet.upsertNode(current, newerNode);
      };
      if (timing === 'before send') edit();
      const status = vi.fn();
      performCanvasDraftAutosave({
        refs: {
          saveDebounceTimerRef: { current: null },
          lastSavedSignatureRef: { current: null },
          lastFailedSignatureRef: { current: null },
          saveAttemptGenerationRef: { current: 0 },
          nextSaveAttemptIdRef: { current: 0 },
          activeSaveAttemptRef: { current: null },
        },
        draftRepository: repository,
        draftSession: sent,
        currentDraftPayload: payload,
        currentDraftPayloadSignature: JSON.stringify(payload),
        createDraftIdempotencyKey: () => 'snapshot-test',
        setDraftSession: (update) => {
          current = typeof update === 'function' ? update(current) : update;
        },
        setDraftSaveStatus: status,
        draftQueryCache: {
          fetchLatestRemoteDraftState: repository.readGraphDraftState,
          fetchLatestRemoteDraft: repository.readGraphDraft,
          replaceRemoteDraftState: vi.fn(),
          refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
        },
        refreshWorkspaceFilesAfterSave: false,
      });
      if (timing === 'after send') edit();
      await vi.waitFor(() => expect(status).toHaveBeenLastCalledWith('saved'));
      expect((await repository.readGraphDraft())!.draft).toEqual(payload);
      expect(current.localNodeCatalog?.[sentNode.id]).toEqual(
        timing === 'no edit' ? undefined : newerNode
      );
      expect(current.syncState).toBe('editing');
    }
  );
});
