// @vitest-environment jsdom

import React, { act, type Dispatch, type SetStateAction } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { useCanvasWorkspaceDraftSession } from './useCanvasWorkspaceDraftSession';

describe('useCanvasWorkspaceDraftSession', () => {
  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  it('does not rerender when a reconciliation preserves the current session', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let renderCount = 0;
    let latestSession: CanvasDraftSession | null = null;
    let latestSetter: Dispatch<SetStateAction<CanvasDraftSession>> | null = null;

    function HookHost(): null {
      renderCount += 1;
      [latestSession, latestSetter] = useCanvasWorkspaceDraftSession('tenant::project-a::dev');
      return null;
    }

    await act(async () => {
      root.render(<HookHost />);
    });
    const initialSession = latestSession;

    await act(async () => {
      latestSetter?.((currentSession) => currentSession);
    });

    expect(latestSession).toBe(initialSession);
    expect(renderCount).toBe(1);

    act(() => root.unmount());
  });

  it('starts each workspace in isolation and ignores late updates from the previous scope', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    let workspaceLayoutKey = 'tenant::project-a::dev';
    const latest: {
      session: CanvasDraftSession | null;
      setter: Dispatch<SetStateAction<CanvasDraftSession>> | null;
    } = { session: null, setter: null };

    function HookHost(): null {
      [latest.session, latest.setter] = useCanvasWorkspaceDraftSession(workspaceLayoutKey);
      return null;
    }

    await act(async () => {
      root.render(<HookHost />);
    });
    const projectASetter = latest.setter;
    if (projectASetter == null) {
      throw new Error('Expected the project A draft-session setter to be mounted.');
    }

    await act(async () => {
      latest.setter?.(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: ['project-a-node'],
          canonicalEdges: [],
        })
      );
    });
    expect(latest.session).toMatchObject({
      syncState: 'editing',
      workingSet: { visibleNodeIds: ['project-a-node'] },
    });

    workspaceLayoutKey = 'tenant::project-b::dev';
    await act(async () => {
      root.render(<HookHost />);
    });

    expect(latest.session).toMatchObject({
      syncState: 'bootstrapping',
      workingSet: { visibleNodeIds: [] },
    });

    await act(async () => {
      projectASetter?.((session) => ({ ...session, draftRevision: 'late-project-a-revision' }));
    });
    expect(latest.session).toMatchObject({
      syncState: 'bootstrapping',
      draftRevision: null,
      workingSet: { visibleNodeIds: [] },
    });

    await act(async () => {
      latest.setter?.(
        canvasDraftSession.machine.bootstrap({
          remoteDraft: null,
          canonicalNodeIds: ['project-b-node'],
          canonicalEdges: [],
        })
      );
    });
    expect(latest.session).toMatchObject({
      syncState: 'editing',
      workingSet: { visibleNodeIds: ['project-b-node'] },
    });

    act(() => root.unmount());
  });
});
