// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Node } from '@xyflow/react';

import type { CanonicalNode } from '../../types/canonical';
import { DRAFT_SAVE_DEBOUNCE_MS } from './canvasDraftPersistenceRuntime';
import type { CanvasDraftSession } from './canvasDraftSession';
import type { CanvasCurrentDraftPayloadDto, DraftAttemptRefs } from './canvasDraftLifecycle.types';

const draftProjectionCounters = vi.hoisted(() => ({
  payload: vi.fn(),
  signature: vi.fn(),
  schemaValidation: vi.fn(),
}));

vi.mock('./canvasDraftLifecycleSnapshot', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./canvasDraftLifecycleSnapshot')>();
  return {
    ...actual,
    buildCurrentDraftPayload: (...args: Parameters<typeof actual.buildCurrentDraftPayload>) => {
      draftProjectionCounters.payload();
      return actual.buildCurrentDraftPayload(...args);
    },
  };
});

vi.mock('./canvasDraftAuthoring', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./canvasDraftAuthoring')>();
  return {
    ...actual,
    serializeCanvasDraftAuthoringSignature: (
      ...args: Parameters<typeof actual.serializeCanvasDraftAuthoringSignature>
    ) => {
      draftProjectionCounters.signature();
      return actual.serializeCanvasDraftAuthoringSignature(...args);
    },
    canPersistWorkspaceGraphAuthoringDraft: (
      ...args: Parameters<typeof actual.canPersistWorkspaceGraphAuthoringDraft>
    ) => {
      draftProjectionCounters.schemaValidation();
      return actual.canPersistWorkspaceGraphAuthoringDraft(...args);
    },
  };
});

import { useCanvasCurrentDraftPayload } from './useCanvasCurrentDraftPayload';
import { useCanvasDraftAutosave } from './useCanvasDraftAutosave';

const sourceNode = {
  id: 'source-orders',
  name: 'Orders',
  pluginId: 'dvt.warehouse-source',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: ['source'],
} satisfies CanonicalNode;

const draftSession: CanvasDraftSession = {
  syncState: 'editing',
  baseline: { record: null },
  draftRevision: 'rev-1',
  workingSet: {
    visibleNodeIds: [sourceNode.id],
    visibleEdges: [],
    pendingExplicitNodeIds: [],
  },
};

const payloadArgs = {
  persistedNodePositions: { [sourceNode.id]: { x: 0, y: 0 } },
  draftSession,
  canvasDocument: { kind: 'canvas', title: 'Canvas' },
  baselineDraft: null,
  canonicalNodes: [sourceNode],
  canonicalEdges: [],
  workspaceScope: {
    tenantId: 'tenant',
    projectId: 'project',
    environmentId: 'dev',
    targetAdapter: 'temporal',
  },
  previewProvenanceConfig: {
    gitBranch: 'main',
    gitSha: 'head',
    gitRepo: 'dvt',
  },
} satisfies CanvasCurrentDraftPayloadDto;

function createLiveNodes(): Node[] {
  return Array.from({ length: 30 }, (_, index) => ({
    id: index === 0 ? sourceNode.id : `model-${index}`,
    data: { name: `Node ${index}` },
    position: { x: index * 20, y: index * 10 },
  }));
}

let previousActEnvironment: boolean | undefined;

beforeEach(() => {
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  previousActEnvironment = globalObject.IS_REACT_ACT_ENVIRONMENT;
  globalObject.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  const globalObject = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  if (previousActEnvironment === undefined) {
    Reflect.deleteProperty(globalObject, 'IS_REACT_ACT_ENVIRONMENT');
  } else {
    globalObject.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
  }
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('Canvas geometry draft isolation', () => {
  it('does zero payload, signature, and schema work for a geometry-only parent frame', async () => {
    let result: ReturnType<typeof useCanvasCurrentDraftPayload> | undefined;

    function Probe({ liveNodes }: { liveNodes: Node[] }): null {
      void liveNodes;
      result = useCanvasCurrentDraftPayload(payloadArgs);
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const liveNodes = createLiveNodes();

    await act(async () => {
      root.render(createElement(Probe, { liveNodes }));
    });

    expect(result).toBeDefined();
    expect(draftProjectionCounters.payload).toHaveBeenCalledTimes(1);
    expect(draftProjectionCounters.signature).toHaveBeenCalledTimes(1);
    expect(draftProjectionCounters.schemaValidation).toHaveBeenCalledTimes(1);
    draftProjectionCounters.payload.mockClear();
    draftProjectionCounters.signature.mockClear();
    draftProjectionCounters.schemaValidation.mockClear();

    const movedNodes = liveNodes.map((node, index) =>
      index === 12 ? { ...node, position: { x: 920, y: 540 }, dragging: true } : node
    );
    await act(async () => {
      root.render(createElement(Probe, { liveNodes: movedNodes }));
    });

    expect(draftProjectionCounters.payload).toHaveBeenCalledTimes(0);
    expect(draftProjectionCounters.signature).toHaveBeenCalledTimes(0);
    expect(draftProjectionCounters.schemaValidation).toHaveBeenCalledTimes(0);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('keeps one pending autosave timer through geometry-only parent frames', async () => {
    vi.useFakeTimers();
    const refs: DraftAttemptRefs = {
      saveDebounceTimerRef: { current: null },
      lastSavedSignatureRef: { current: null },
      lastFailedSignatureRef: { current: null },
      saveAttemptGenerationRef: { current: 0 },
      nextSaveAttemptIdRef: { current: 0 },
      activeSaveAttemptRef: { current: null },
    };
    const saveGraphDraft = vi.fn(() => new Promise<never>(() => undefined));
    const autosaveArgs: Parameters<typeof useCanvasDraftAutosave>[0] = {
      draftRepository: { saveGraphDraft } as never,
      graphDraftQuery: { isPending: false, isError: false, data: undefined },
      graphAuthorityQuery: { isPending: false, isError: false },
      draftQueryCache: {} as never,
      draftSession,
      setDraftSession: vi.fn(),
      currentDraftPayloadSignature: 'semantic-revision-1',
      currentDraftPayload: {} as never,
      canPersistGraphDraft: true,
      canPersistCurrentDraft: true,
      refs,
      setDraftSaveStatus: vi.fn(),
      createDraftIdempotencyKey: () => 'canvas-draft-1',
    };

    function Probe({ liveNodes }: { liveNodes: Node[] }): null {
      void liveNodes;
      useCanvasDraftAutosave(autosaveArgs);
      return null;
    }

    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);
    const liveNodes = createLiveNodes();

    await act(async () => {
      root.render(createElement(Probe, { liveNodes }));
    });
    const pendingTimer = refs.saveDebounceTimerRef.current;
    expect(pendingTimer).not.toBeNull();

    const movedNodes = liveNodes.map((node, index) =>
      index === 12 ? { ...node, position: { x: 920, y: 540 }, dragging: true } : node
    );
    await act(async () => {
      root.render(createElement(Probe, { liveNodes: movedNodes }));
    });

    expect(refs.saveDebounceTimerRef.current).toBe(pendingTimer);
    expect(saveGraphDraft).toHaveBeenCalledTimes(0);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DRAFT_SAVE_DEBOUNCE_MS);
    });
    expect(saveGraphDraft).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
