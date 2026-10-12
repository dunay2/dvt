/** A save acknowledges its sent aggregate, never a newer local edit. */
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { performCanvasDraftAutosave } from './canvasDraftAutosaveExecution';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { buildAuthoringPort } from './canvasDraftRepository.test.fixtures';
import { canvasDraftSession } from './canvasDraftSession';
import { runCanvasDraftAutosaveEffect } from './canvasDraftAutosaveScheduling';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

describe('autosave snapshot acknowledgement', () => {
  it.each(['debounce', 'in flight', 'acknowledged', 'failed'] as const)(
    'reports durability truthfully during %s',
    async (phase) => {
      const repository = createCanvasDraftRepository(buildAuthoringPort());
      const record = (await repository.readGraphDraft())!;
      const session = canvasDraftSession.machine.bootstrap({
        remoteDraft: record,
        canonicalNodeIds: [],
        canonicalEdges: [],
      });
      let status: DraftSaveStatus = phase === 'in flight' ? 'saving' : 'idle';
      const cleanup = runCanvasDraftAutosaveEffect({
        draftRepository: repository,
        graphAuthorityQuery: { isPending: false, isError: false },
        graphDraftQuery: { isPending: false, isError: false, data: undefined },
        draftQueryCache: {
          fetchLatestRemoteDraftState: repository.readGraphDraftState,
          fetchLatestRemoteDraft: repository.readGraphDraft,
          replaceRemoteDraftState: vi.fn(),
          refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
        },
        draftSession:
          phase === 'in flight' ? canvasDraftSession.machine.markSaving(session) : session,
        setDraftSession: vi.fn(),
        currentDraftPayloadSignature: 'edited-expression',
        currentDraftPayload: record.draft,
        canPersistGraphDraft: true,
        canPersistCurrentDraft: true,
        refs: {
          saveDebounceTimerRef: { current: null },
          lastSavedSignatureRef: {
            current: phase === 'acknowledged' ? 'edited-expression' : 'before',
          },
          lastFailedSignatureRef: { current: phase === 'failed' ? 'edited-expression' : null },
          saveAttemptGenerationRef: { current: 0 },
          nextSaveAttemptIdRef: { current: 0 },
          activeSaveAttemptRef: { current: null },
        },
        setDraftSaveStatus: (update) => {
          status = typeof update === 'function' ? update(status) : update;
        },
        createDraftIdempotencyKey: () => 'status-test',
      });
      cleanup?.();
      expect(status).toBe(
        phase === 'acknowledged' ? 'idle' : phase === 'failed' ? 'failed' : 'saving'
      );
    }
  );

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
