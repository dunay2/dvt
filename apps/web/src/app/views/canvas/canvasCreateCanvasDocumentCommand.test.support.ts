import type { SetStateAction } from 'react';
import { vi, type Mock } from 'vitest';

import type { WorkspaceGraphAuthoringDraft } from '@dvt/contracts';
import { canvasDraftSession } from './canvasDraftSession';
import {
  createUnknownCanvasAuthoringDraftReadModel,
  createWritableCanvasAuthoringDraftReadModel,
} from './canvasDraftReadModel';
import { buildGraphDraftAuthority } from './canvasDraftRepository.test.fixtures';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

export function buildEmptyDraft(
  overrides: Partial<WorkspaceGraphAuthoringDraft> = {}
): WorkspaceGraphAuthoringDraft {
  return {
    canvas: {
      kind: 'transformation',
      title: 'Transformation canvas',
    },
    nodeIds: [],
    nodePositions: {},
    nodes: [],
    edges: [],
    ...overrides,
  };
}

export type DraftRecordFixture = {
  revision: string;
  savedAt: string;
  draft: WorkspaceGraphAuthoringDraft;
};

export function buildRecord(
  overrides: Partial<{ revision: string; draft: WorkspaceGraphAuthoringDraft }> = {}
): DraftRecordFixture {
  return {
    revision: overrides.revision ?? 'rev-1',
    savedAt: '2026-04-24T00:00:00.000Z',
    draft: overrides.draft ?? buildEmptyDraft(),
  };
}

export function applyStateUpdater<T>(updater: SetStateAction<T>, current: T): T {
  return typeof updater === 'function' ? (updater as (value: T) => T)(current) : updater;
}

export type BuildCommandArgsResult = {
  args: CanvasCreateCanvasDocumentCommandDto;
  draftRepository: {
    readGraphDraftState: Mock;
    readGraphDraft: Mock;
    saveGraphDraft: Mock;
  };
  draftQueryCache: {
    fetchLatestRemoteDraftState: Mock;
    fetchLatestRemoteDraft: Mock;
    refreshWorkspaceFilesAfterSourceRemoval: Mock;
    replaceRemoteDraftState: Mock;
  };
  setDraftSession: Mock;
  setDraftSaveStatus: Mock;
};

export type BuildCommandOverrides = Partial<
  Omit<
    CanvasCreateCanvasDocumentCommandDto,
    'draftRepository' | 'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
  >
> &
  Partial<
    Pick<
      BuildCommandArgsResult,
      'draftRepository' | 'draftQueryCache' | 'setDraftSession' | 'setDraftSaveStatus'
    >
  >;

export function buildCommandArgs(overrides: BuildCommandOverrides = {}): BuildCommandArgsResult {
  const draftRepository = {
    readGraphDraftState: vi.fn(),
    readGraphDraft: vi.fn(),
    saveGraphDraft: vi.fn(async () => {
      const record = buildRecord({ revision: 'rev-saved' });
      return {
        outcome: 'saved' as const,
        record,
        remoteDraftState: createWritableCanvasAuthoringDraftReadModel(
          record,
          buildGraphDraftAuthority(null)
        ),
      };
    }),
  };
  const draftQueryCache = {
    fetchLatestRemoteDraftState: vi.fn(),
    fetchLatestRemoteDraft: vi.fn(),
    refreshWorkspaceFilesAfterSourceRemoval: vi.fn(),
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
      command: {
        kind: 'transformation',
        title: 'Transformation canvas',
      },
      currentDraftPayload: buildEmptyDraft(),
      draftRepository: effectiveDraftRepository,
      graphDraftQuery: {
        data: createUnknownCanvasAuthoringDraftReadModel(),
        isPending: false,
        isError: false,
      },
      draftQueryCache: effectiveDraftQueryCache,
      canPersistGraphDraft: true,
      setDraftSession: effectiveSetDraftSession,
      setDraftSaveStatus: effectiveSetDraftSaveStatus,
      invalidateInFlightSaveAttempt: vi.fn(),
      lastSavedSignatureRef: { current: null },
      ...overrides,
    },
    draftRepository: effectiveDraftRepository,
    draftQueryCache: effectiveDraftQueryCache,
    setDraftSession: effectiveSetDraftSession,
    setDraftSaveStatus: effectiveSetDraftSaveStatus,
  };
}

export function readBootstrappingSessionUpdate(setDraftSession: Mock) {
  const sessionUpdater = setDraftSession.mock.calls[0]?.[0] as SetStateAction<
    ReturnType<typeof canvasDraftSession.machine.createBootstrapping>
  >;
  return applyStateUpdater(sessionUpdater, canvasDraftSession.machine.createBootstrapping());
}
