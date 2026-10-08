// @vitest-environment jsdom

import React, { act, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { canvasDraftSession, type CanvasDraftSession } from './canvasDraftSession';
import { useCanvasWorkspaceDraftSession } from './useCanvasWorkspaceDraftSession';
import { buildAuthoringDraft } from './canvasDraftRepository.test.fixtures';
import { markDraftSaving } from './canvasDraftPersistenceRuntime';

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
  it('runs a command once over the latest acknowledged session', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const latest: {
      session: CanvasDraftSession | null;
      setter: Dispatch<SetStateAction<CanvasDraftSession>> | null;
      runCommand: ReturnType<typeof useCanvasWorkspaceDraftSession>[2] | null;
    } = { session: null, setter: null, runCommand: null };

    function HookHost(): null {
      [latest.session, latest.setter, latest.runCommand] =
        useCanvasWorkspaceDraftSession('tenant::project-a::dev');
      return null;
    }

    await act(async () => root.render(<HookHost />));
    let commandCalls = 0;
    const results: Array<{
      outcome: 'applied';
      draftSession: CanvasDraftSession;
      createdFieldId: string;
    }> = [];

    await act(async () => {
      latest.setter?.((current) => ({ ...current, draftRevision: 'autosave-ack' }));
      const runCommand = latest.runCommand;
      if (runCommand == null) throw new Error('Expected the draft-session command runner.');
      results.push(
        runCommand((current) => {
          commandCalls += 1;
          return {
            outcome: 'applied' as const,
            draftSession: { ...current, draftRevision: 'authoring-command' },
            createdFieldId: 'field-1',
          };
        })
      );
    });

    const result = results[0];
    expect(commandCalls).toBe(1);
    expect(result).toMatchObject({ outcome: 'applied', createdFieldId: 'field-1' });
    expect(result?.draftSession.draftRevision).toBe('authoring-command');
    expect(latest.session?.draftRevision).toBe('authoring-command');

    act(() => root.unmount());
  });

  it('preserves a visible input removal when an unrelated render interrupts save scheduling', async () => {
    const fields = Array.from({ length: 6 }, (_, index) => ({
      inputId: `input-${index}`,
      producerFieldId: `field-${index}`,
    }));
    const draft = buildAuthoringDraft();
    draft.edges[0]!.metadata = { inputBindings: { version: 'v1', fields } };
    const record = { draft, revision: 'before-save', savedAt: '2026-10-08T00:00:00Z' };
    const sent = canvasDraftSession.machine.bootstrap({
      remoteDraft: record,
      canonicalNodeIds: [],
      canonicalEdges: [],
    });
    const container = document.createElement('div');
    const root = createRoot(container);
    let current!: ReturnType<typeof useCanvasWorkspaceDraftSession>;
    let rerender!: Dispatch<SetStateAction<number>>;
    function HookHost(): React.ReactElement {
      const [pulse, setPulse] = useState(0);
      rerender = setPulse;
      current = useCanvasWorkspaceDraftSession('tenant::project-a::dev');
      return (
        <output data-pulse={pulse}>
          {current[0].workingSet.visibleEdges[0]?.inputBindings?.fields.length ?? 0}
        </output>
      );
    }
    try {
      await act(async () => root.render(<HookHost />));
      await act(async () => current[1](sent));
      expect(container.textContent).toBe('6');
      await act(async () => {
        markDraftSaving(current[1], sent);
        // Interrupt the queued save render, as a synchronous presentation update can.
        flushSync(() => rerender((value) => value + 1));
        flushSync(() =>
          current[2]((session) => ({
            outcome: 'applied',
            draftSession: canvasDraftSession.workingSet.replaceEdges(
              session,
              session.workingSet.visibleEdges.map((edge, index) =>
                index === 0
                  ? { ...edge, inputBindings: { version: 'v1', fields: fields.slice(1) } }
                  : edge
              )
            ),
          }))
        );
        expect(container.textContent).toBe('5');
      });
      expect(container.textContent).toBe('5');
      expect(current[0].savingWorkingSet).toBe(sent.workingSet);
      await act(async () =>
        current[1]((session) =>
          canvasDraftSession.machine.applySaveSuccess(session, { ...record, revision: 'saved-six' })
        )
      );
      expect(container.textContent).toBe('5');
      expect(current[0].draftRevision).toBe('saved-six');
    } finally {
      act(() => root.unmount());
    }
  });
});
