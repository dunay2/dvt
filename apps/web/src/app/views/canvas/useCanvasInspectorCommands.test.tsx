// @vitest-environment jsdom

/** Owned concern: prove Inspector commands report and commit aggregate outcomes synchronously. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { createCanvasInspectorNodeDraft } from './canvasInspectorAuthoringModel';
import type { CanvasInspectorNodeDraftApplyResult } from './canvasInspectorAuthoring.types';
import { useCanvasInspectorCommands } from './useCanvasInspectorCommands';
import { useCanvasWorkspaceDraftSession } from './useCanvasWorkspaceDraftSession';

const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders model',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
};
const workspaceScope = {
  tenantId: 'tenant-1',
  projectId: 'project-1',
  environmentId: 'environment-1',
  targetAdapter: 'temporal' as const,
};

describe('useCanvasInspectorCommands', () => {
  let container: HTMLDivElement;
  let root: Root;
  let latest: {
    session: CanvasDraftSession;
    setSession: ReturnType<typeof useCanvasWorkspaceDraftSession>[1];
    commands: ReturnType<typeof useCanvasInspectorCommands>;
  } | null;

  beforeEach(() => {
    latest = null;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function Harness(): null {
    const [session, setSession, runDraftSessionCommand] = useCanvasWorkspaceDraftSession(
      'tenant-1::project-1::dev'
    );
    const commands = useCanvasInspectorCommands({
      canonicalNodesById: new Map([[model.id, model]]),
      inspectorNode: model,
      runDraftSessionCommand,
      workspaceScope,
    });
    latest = { session, setSession, commands };
    return null;
  }

  it('commits applied once and reports no-change and unavailable-node outcomes without mutation', () => {
    act(() => root.render(<Harness />));
    act(() => {
      latest!.setSession(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: [model.id],
          canonicalEdges: [],
        })
      );
    });
    const renamed = { ...createCanvasInspectorNodeDraft(model), name: 'Orders renamed' };

    let applied: CanvasInspectorNodeDraftApplyResult | undefined;
    act(() => {
      applied = latest!.commands.applyNodeDraft(model.id, renamed);
    });
    expect(applied!.outcome).toBe('applied');
    expect(latest!.session.localNodeCatalog?.[model.id]?.name).toBe('Orders renamed');
    const committedSession = latest!.session;

    expect(latest!.commands.applyNodeDraft(model.id, renamed)).toEqual({
      outcome: 'no_changes',
    });
    expect(latest!.session).toBe(committedSession);
    expect(latest!.commands.applyNodeDraft('missing-model', renamed)).toEqual({
      outcome: 'rejected',
      reason: 'node_unavailable',
    });
    expect(latest!.session).toBe(committedSession);
  });
});
