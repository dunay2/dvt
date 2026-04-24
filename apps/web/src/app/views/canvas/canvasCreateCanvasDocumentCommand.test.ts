import type { SetStateAction } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { WorkspaceGraphDraft } from '../../ports/workspace';
import { canvasDraftSession } from './canvasDraftSession';
import {
  createUnknownCanvasDraftReadModel,
  createWritableCanvasDraftReadModel,
} from './canvasDraftReadModel';
import { executeCreateCanvasDocumentCommand } from './canvasCreateCanvasDocumentCommand';
import type { CanvasCreateCanvasDocumentCommandDto } from './canvasDraftLifecycle.types';

const WORKSPACE_SCOPE = {
  tenantId: 'tenant',
  projectId: 'project',
  environmentId: 'env',
  targetAdapter: 'temporal' as const,
};

const PREVIEW_PROVENANCE_CONFIG = {
  gitRepo: 'repo',
  gitBranch: 'main',
  gitSha: 'abc123',
};

function buildEmptyDraft(overrides: Partial<WorkspaceGraphDraft> = {}): WorkspaceGraphDraft {
  return {
    canvas: {
      kind: 'transformation',
      title: 'Transformation canvas',
    },
    nodeIds: [],
    nodePositions: {},
    edges: [],
    ...overrides,
  };
}

type DraftRecordFixture = {
  revision: string;
  savedAt: string;
  draft: WorkspaceGraphDraft;
};

function buildRecord(
  overrides: Partial<{ revision: string; draft: WorkspaceGraphDraft }> = {}
): DraftRecordFixture {
  return {
    revision: overrides.revision ?? 'rev-1',
    savedAt: '2026-04-24T00:00:00.000Z',
    draft: overrides.draft ?? buildEmptyDraft(),
  };
}

function applyStateUpdater<T>(updater: SetStateAction<T>, current: T): T {
  return typeof updater === 'function'
    ? (updater as (value: T) => T)(current)
    : updater;
}

type BuildCommandArgsResult = {
  args: CanvasCreateCanvasDocumentCommandDto;
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

function buildCommandArgs(
  overrides: Partial<CanvasCreateCanvasDocumentCommandDto> = {}
): BuildCommandArgsResult {
  const draftRepository = {
    readGraphDraftState: vi.fn(),
    readGraphDraft: vi.fn(),
    saveGraphDraft: vi.fn(async () => {
      const record = buildRecord({ revision: 'rev-saved' });
      return {
        outcome: 'saved' as const,
        record,
        remoteDraftState: createWritableCanvasDraftReadModel(record),
      };
    }),
  };
  const draftQueryCache = {
    fetchLatestRemoteDraftState: vi.fn(),
    fetchLatestRemoteDraft: vi.fn(),
    replaceRemoteDraft: vi.fn(),
    replaceRemoteDraftState: vi.fn(),
  };
  const setDraftSession = vi.fn();
  const setDraftSaveStatus = vi.fn();
  const effectiveDraftRepository = (overrides.draftRepository ??
    draftRepository) as BuildCommandArgsResult['draftRepository'];
  const effectiveDraftQueryCache = (overrides.draftQueryCache ??
    draftQueryCache) as BuildCommandArgsResult['draftQueryCache'];
  const effectiveSetDraftSession = (overrides.setDraftSession ??
    setDraftSession) as BuildCommandArgsResult['setDraftSession'];
  const effectiveSetDraftSaveStatus = (overrides.setDraftSaveStatus ??
    setDraftSaveStatus) as BuildCommandArgsResult['setDraftSaveStatus'];

  return {
    args: {
      command: {
        kind: 'transformation',
        title: 'Transformation canvas',
      },
      draftRepository: effectiveDraftRepository,
      graphDraftQuery: {
        data: createUnknownCanvasDraftReadModel(),
        isPending: false,
        isError: false,
      },
      draftQueryCache: effectiveDraftQueryCache,
      canPersistGraphDraft: true,
      setDraftSession: effectiveSetDraftSession,
      setDraftSaveStatus: effectiveSetDraftSaveStatus,
      lastSavedSignatureRef: { current: null },
      workspaceScope: WORKSPACE_SCOPE,
      previewProvenanceConfig: PREVIEW_PROVENANCE_CONFIG,
      ...overrides,
    },
    draftRepository: effectiveDraftRepository,
    draftQueryCache: effectiveDraftQueryCache,
    setDraftSession: effectiveSetDraftSession,
    setDraftSaveStatus: effectiveSetDraftSaveStatus,
  };
}

describe('canvasCreateCanvasDocumentCommand', () => {
  it('persists the first typed canvas document through authoritative draft truth', async () => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs();

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftRepository.saveGraphDraft).toHaveBeenCalledWith({
      expectedRevision: null,
      idempotencyKey: expect.any(String),
      draft: {
        projectedDraft: {
          canvas: {
            kind: 'transformation',
            title: 'Transformation canvas',
          },
          nodeIds: [],
          nodePositions: {},
          edges: [],
        },
        canonicalNodes: [],
        canonicalEdges: [],
        workspaceScope: WORKSPACE_SCOPE,
        previewProvenanceConfig: PREVIEW_PROVENANCE_CONFIG,
      },
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
    expect(nextSession.draftRevision).toBe('rev-saved');
    expect(args.lastSavedSignatureRef.current).toBe(
      canvasDraftSession.baseline.serialize(buildEmptyDraft())
    );
  });

  it('applies authoritative conflict truth and returns to idle when saveGraphDraft conflicts', async () => {
    const currentRecord = buildRecord({ revision: 'rev-current' });
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs({
      draftRepository: {
        readGraphDraftState: vi.fn(),
        readGraphDraft: vi.fn(),
        saveGraphDraft: vi.fn(async () => ({
          outcome: 'conflict' as const,
          current: currentRecord,
          remoteDraftState: createWritableCanvasDraftReadModel(currentRecord),
        })),
      },
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).toHaveBeenCalledTimes(1);
    expect(draftQueryCache.replaceRemoteDraftState).toHaveBeenCalledTimes(1);
    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['idle']]);

    const sessionUpdater = setDraftSession.mock.calls[0]?.[0] as SetStateAction<
      ReturnType<typeof canvasDraftSession.machine.createBootstrapping>
    >;
    const nextSession = applyStateUpdater(
      sessionUpdater,
      canvasDraftSession.machine.createBootstrapping()
    );
    expect(nextSession.syncState).toBe('conflict');
    expect(nextSession.draftRevision).toBe('rev-current');
  });

  it.each([
    {
      name: 'transport persistence is disabled',
      overrides: { canPersistGraphDraft: false },
    },
    {
      name: 'draft query is still pending',
      overrides: {
        graphDraftQuery: {
          data: createUnknownCanvasDraftReadModel(),
          isPending: true,
          isError: false,
        },
      },
    },
    {
      name: 'draft query is in error',
      overrides: {
        graphDraftQuery: {
          data: createUnknownCanvasDraftReadModel(),
          isPending: false,
          isError: true,
        },
      },
    },
    {
      name: 'an authoritative draft already exists',
      overrides: {
        graphDraftQuery: {
          data: createWritableCanvasDraftReadModel(buildRecord()),
          isPending: false,
          isError: false,
        },
      },
    },
  ])('fails closed when $name', async ({ overrides }) => {
    const { args, draftRepository, draftQueryCache, setDraftSession, setDraftSaveStatus } =
      buildCommandArgs(overrides);

    await executeCreateCanvasDocumentCommand(args);

    expect(draftRepository.saveGraphDraft).not.toHaveBeenCalled();
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
    expect(setDraftSaveStatus).not.toHaveBeenCalled();
  });

  it('returns to idle when authoritative save throws', async () => {
    const { args, draftQueryCache, setDraftSession, setDraftSaveStatus } = buildCommandArgs({
      draftRepository: {
        readGraphDraftState: vi.fn(),
        readGraphDraft: vi.fn(),
        saveGraphDraft: vi.fn(async () => {
          throw new Error('write failed');
        }),
      },
    });

    await executeCreateCanvasDocumentCommand(args);

    expect(setDraftSaveStatus.mock.calls).toEqual([['saving'], ['idle']]);
    expect(draftQueryCache.replaceRemoteDraftState).not.toHaveBeenCalled();
    expect(setDraftSession).not.toHaveBeenCalled();
  });
});
