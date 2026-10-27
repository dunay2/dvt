/** A save acknowledges its sent aggregate, never a newer local edit. */
import { describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { performCanvasDraftSave } from './canvasDraftSaveExecution';
import { createDraftAttemptRefs } from './canvasDraftPersistenceRuntime';
import { buildCurrentDraftPayload } from './canvasDraftLifecycleSnapshot';
import { createCanvasDraftRepository } from './canvasDraftRepository';
import { buildAuthoringPort } from './canvasDraftRepository.test.fixtures';
import { canvasDraftSession } from './canvasDraftSession';
import { runCanvasDraftAutosaveEffect } from './canvasDraftAutosaveScheduling';
import type { DraftSaveStatus } from './canvasDraftLifecycle.types';

describe('autosave snapshot acknowledgement', () => {
  it.each(['saved', 'conflict'] as const)(
    'publishes the actual %s receipt before queued query or session updates',
    async (outcome) => {
      const port = buildAuthoringPort();
      if (outcome === 'conflict') {
        const remote = await port.readGraphDraft();
        if (remote.kind !== 'ok' || remote.record == null) throw new Error('Missing remote draft');
        const revision = remote.record.revision;
        port.saveGraphDraft = vi.fn<typeof port.saveGraphDraft>(async () => ({
          kind: 'conflict',
          capability: remote.capability,
          auditRef: { ...remote.auditRef, action: 'draft_write', outcome: 'conflict' },
          formatMeta: remote.formatMeta,
          currentRevision: revision,
        }));
      }
      const repository = createCanvasDraftRepository(port);
      const saveGraphDraft = vi.spyOn(repository, 'saveGraphDraft');
      const record = (await repository.readGraphDraft())!;
      const session = canvasDraftSession.machine.bootstrap({
        remoteDraft: record,
        canonicalNodeIds: [],
        canonicalEdges: [],
      });
      const refs = createDraftAttemptRefs();
      const replaceRemoteDraftState = vi.fn((remoteDraftState) => {
        expect(refs.confirmedSaveReceiptRef.current).toMatchObject({
          generation: 0,
          signature: 'sent-payload',
          result: { outcome, remoteDraftState },
        });
      });
      const setDraftSession = vi.fn();
      const setDraftSaveStatus = vi.fn();
      const args: Parameters<typeof performCanvasDraftSave>[0] = {
        refs,
        draftRepository: repository,
        draftSession:
          outcome === 'conflict' ? { ...session, draftRevision: 'stale-revision' } : session,
        currentDraftPayload: record.draft,
        currentDraftPayloadSignature: 'sent-payload',
        createDraftIdempotencyKey: () => 'receipt-order-test',
        setDraftSession,
        setDraftSaveStatus,
        draftQueryCache: {
          fetchLatestRemoteDraftState: repository.readGraphDraftState,
          fetchLatestRemoteDraft: repository.readGraphDraft,
          replaceRemoteDraftState,
          refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
        },
        refreshWorkspaceFilesAfterSave: false,
      };
      const result = await performCanvasDraftSave(args);

      expect(result.outcome).toBe(outcome);
      expect(replaceRemoteDraftState).toHaveBeenCalledOnce();
      expect(refs.confirmedSaveReceiptRef.current?.result).toBe(result);
      expect(refs.activeSaveAttemptRef.current).toBeNull();
      expect(session.draftRevision).toBe(record.revision);
      const sessionUpdates = setDraftSession.mock.calls.length;
      setDraftSaveStatus.mockClear();

      const repeated = await performCanvasDraftSave({
        ...args,
        currentDraftPayloadSignature:
          outcome === 'conflict' ? 'new-intent-after-conflict' : args.currentDraftPayloadSignature,
      });

      expect(repeated).toBe(result);
      expect(saveGraphDraft).toHaveBeenCalledOnce();
      expect(replaceRemoteDraftState).toHaveBeenCalledOnce();
      expect(setDraftSession).toHaveBeenCalledTimes(sessionUpdates);
      expect(setDraftSaveStatus).toHaveBeenLastCalledWith(outcome === 'saved' ? 'saved' : 'idle');
    }
  );

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
          ...createDraftAttemptRefs(),
          lastSavedSignatureRef: {
            current: phase === 'acknowledged' ? 'edited-expression' : 'before',
          },
          lastFailedSignatureRef: { current: phase === 'failed' ? 'edited-expression' : null },
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
      const refs = createDraftAttemptRefs();
      const save = performCanvasDraftSave({
        refs,
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
      await expect(save).resolves.toMatchObject({ outcome: 'saved' });
      expect((await repository.readGraphDraft())!.draft).toEqual(payload);
      expect(refs.confirmedSaveReceiptRef.current?.result).toMatchObject({
        outcome: 'saved',
        record: { draft: payload },
      });
      expect(current.localNodeCatalog?.[sentNode.id]).toEqual(
        timing === 'no edit' ? undefined : newerNode
      );
      expect(current.syncState).toBe('editing');
    }
  );
});
