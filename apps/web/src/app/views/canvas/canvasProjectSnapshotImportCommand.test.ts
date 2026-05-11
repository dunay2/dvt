/** Owned concern: prove Canvas project snapshot import command persistence and rejection semantics. */
import type { SetStateAction } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { canvasDraftSession } from './canvasDraftSession';
import {
  createUnknownCanvasAuthoringDraftReadModel,
  createWritableCanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import type { CanvasImportProjectSnapshotCommandDto } from './canvasDraftLifecycle.types';
import { canvasProjectSnapshot } from './canvasProjectSnapshot';
import { executeImportProjectSnapshotCommand } from './canvasProjectSnapshotImportCommand';
import { buildAuthoringDraft } from './canvasDraftRepository.test.fixtures';

const { toastError } = vi.hoisted(() => ({
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: toastError,
  },
}));

type DraftRecordFixture = {
  revision: string;
  savedAt: string;
  draft: WorkspaceGraphAuthoringDraft;
};

function buildRecord(
  overrides: Partial<{ revision: string; draft: WorkspaceGraphAuthoringDraft }> = {}
): DraftRecordFixture {
  return {
    revision: overrides.revision ?? 'rev-1',
    savedAt: '2026-05-11T08:00:00.000Z',
    draft: overrides.draft ?? buildAuthoringDraft(),
  };
}

function buildSnapshotFile(draft = buildAuthoringDraft()): File {
  const exported = canvasProjectSnapshot.exportFile({
    record: buildRecord({ draft }),
    workspaceScope: {
      tenantId: 'tenant-a',
      projectId: 'project-a',
      environmentId: 'dev',
      targetAdapter: 'temporal',
    },
    exportedAt: '2026-05-11T08:01:00.000Z',
  });

  return new File([exported.contents], exported.fileName, {
    type: 'application/json',
  });
}

function applyStateUpdater<T>(updater: SetStateAction<T>, current: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;
}

type BuildImportArgsResult = {
  args: CanvasImportProjectSnapshotCommandDto;
  draftRepository: {
    readGraphDraftState: ReturnType<typeof vi.fn>;
    readGraphDraft: ReturnType<typeof vi.fn>;
    saveGraphDraft: ReturnType<typeof vi.fn>;
  };
  draftQueryCache: {
    fetchLatestRemoteDraftState: ReturnType<typeof vi.fn>;
    fetchLatestRemoteDraft: ReturnType<typeof vi.fn>;
    replaceRemoteDraft: ReturnType<typeof vi.fn>;
    replaceRemoteDraftState: ReturnType<typeof vi.fn>;
  };
  setDraftSession: ReturnType<typeof vi.fn>;
  setDraftSaveStatus: ReturnType<typeof vi.fn>;
};

type BuildImportArgsOverrides = Partial<
  Omit<
    CanvasImportProjectSnapshotCommandDto,
    'draftRepository' | 'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
  >
> &
  Partial<
    Pick<
      BuildImportArgsResult,
      'draftRepository' | 'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
    >
  >;

function buildImportArgs(overrides: BuildImportArgsOverrides = {}): BuildImportArgsResult {
  const importedDraft = buildAuthoringDraft();
  const savedRecord = buildRecord({ revision: 'rev-imported', draft: importedDraft });
  const draftRepository = {
    readGraphDraftState: vi.fn(),
    readGraphDraft: vi.fn(),
    saveGraphDraft: vi.fn(async () => ({
      outcome: 'saved' as const,
      record: savedRecord,
      remoteDraftState: createWritableCanvasAuthoringDraftReadModel(savedRecord),
    })),
  };
  const draftQueryCache = {
    fetchLatestRemoteDraftState: vi.fn(),
    fetchLatestRemoteDraft: vi.fn(),
    replaceRemoteDraft: vi.fn(),
    replaceRemoteDraftState: vi.fn(),
  };
  const setDraftSession = vi.fn();
  const setDraftSaveStatus = vi.fn();
  const effectiveDraftRepository = overrides.draftRepository ?? draftRepository;
  const effectiveDraftQueryCache = overrides.draftQueryCache ?? draftQueryCache;
  const effectiveSetDraftSession = overrides.setDraftSession ?? setDraftSession;
  const effectiveSetDraftSaveStatus = overrides.setDraftSaveStatus ?? setDraftSaveStatus;

  return {
    args: {
      file: buildSnapshotFile(importedDraft),
      canImportProjectSnapshot: true,
      draftRepository: effectiveDraftRepository,
      graphDraftQuery: {
        data: createWritableCanvasAuthoringDraftReadModel(buildRecord({ revision: 'rev-current' })),
        isPending: false,
        isError: false,
      },
      draftQueryCache: effectiveDraftQueryCache,
      setDraftSession: effectiveSetDraftSession,
      setDraftSaveStatus: effectiveSetDraftSaveStatus,
      lastSavedSignatureRef: { current: null },
      ...overrides,
    },
    draftRepository: effectiveDraftRepository,
    draftQueryCache: effectiveDraftQueryCache,
    setDraftSession: effectiveSetDraftSession,
    setDraftSaveStatus: effectiveSetDraftSaveStatus,
  };
}

describe('canvasProjectSnapshotImportCommand', () => {
  beforeEach(() => {
    toastError.mockClear();
  });

  it('persists an accepted project snapshot through the authoritative draft save rail', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildImportArgs();

    await executeImportProjectSnapshotCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftRepository.saveGraphDraft).toHaveBeenCalledWith({
      expectedRevision: 'rev-current',
      idempotencyKey: expect.any(String),
      draft: buildAuthoringDraft(),
    });
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['saved']]);

    const sessionUpdater = setDraftSession.mock.calls[0]?.[0] as SetStateAction<
      ReturnType<typeof canvasDraftSession.machine.createBootstrapping>
    >;
    const nextSession = applyStateUpdater(
      sessionUpdater,
      canvasDraftSession.machine.createBootstrapping()
    );
    expect(nextSession.syncState).toBe('editing');
    expect(nextSession.draftRevision).toBe('rev-imported');
  });

  it('rejects malformed snapshot files before draft save', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildImportArgs({
        file: new File(['{not-json'], 'broken.json', { type: 'application/json' }),
      });

    await executeImportProjectSnapshotCommand(args);

    expect(draftRepository.saveGraphDraft).not.toHaveBeenCalled();
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['failed']]);
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining('Project snapshot file is not valid JSON.')
    );
  });

  it('fails closed when imports are not authorized for the current Canvas state', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildImportArgs({
        canImportProjectSnapshot: false,
        graphDraftQuery: {
          data: createUnknownCanvasAuthoringDraftReadModel(),
          isPending: true,
          isError: false,
        },
      });

    await executeImportProjectSnapshotCommand(args);

    expect(draftRepository.saveGraphDraft).not.toHaveBeenCalled();
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
    expect(setDraftSaveStatus).not.toHaveBeenCalled();
  });
});
