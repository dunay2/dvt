// @vitest-environment jsdom

/** Prove explorer context propagation through the mounted Canvas route and real shell. */
import { act, type ContextType } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildController,
  createCanvasRouteHarness,
  currentCanvasRouteState,
  mockedUseCanvasController,
} from './Canvas.test.support';
import { CanvasExplorerDocumentsContext } from './canvas/explorer/CanvasExplorerDocuments';

type ExplorerContext = ContextType<typeof CanvasExplorerDocumentsContext>;
const probe = vi.hoisted(() => ({ values: [] as ExplorerContext[], renders: 0 }));

vi.mock('./canvas/CanvasShellMainPanel', async () => {
  const { memo, useContext } = await import('react');
  const { CanvasExplorerDocumentsContext } =
    await import('./canvas/explorer/CanvasExplorerDocuments');
  const Consumer = memo(function ObserveExplorerContext() {
    probe.renders += 1;
    probe.values.push(useContext(CanvasExplorerDocumentsContext));
    return null;
  });
  return { CanvasShellMainPanel: () => <Consumer /> };
});

function currentContext(): NonNullable<ExplorerContext> {
  const value = probe.values.at(-1);
  expect(value).not.toBeNull();
  if (value == null) throw new Error('The mounted Canvas explorer context is unavailable.');
  return value;
}

async function rerenderRoute(sequence: number): Promise<void> {
  const router = currentCanvasRouteState().router;
  if (router == null) throw new Error('The actual Canvas route is not mounted.');
  await act(async () => {
    await router.navigate(`/canvas?contextProof=${sequence}`);
  });
  expect(router.state.location.search).toBe(`?contextProof=${sequence}`);
}

describe('Canvas route explorer context identity', () => {
  let harness: ReturnType<typeof createCanvasRouteHarness>;
  let controller: ReturnType<typeof buildController>;

  beforeEach(() => {
    // DOM capability only: jsdom has no resize geometry for the actual shell controls.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      }
    );
    probe.values = [];
    probe.renders = 0;
    harness = createCanvasRouteHarness();
    controller = buildController({ canAddCanvasDocument: true });
    mockedUseCanvasController.mockImplementation(() => ({ ...controller }));
  });

  afterEach(() => {
    harness.cleanup();
    vi.unstubAllGlobals();
  });

  it('does not render a memoized context consumer for an unrelated route rerender', async () => {
    await harness.render();
    const first = currentContext();
    const renders = probe.renders;

    await rerenderRoute(1);

    expect(currentContext()).toBe(first);
    expect(probe.renders).toBe(renders);
  });

  it('publishes changed documents and the current active Canvas', async () => {
    await harness.render();
    const first = currentContext();
    const document = { id: 'next-canvas', kind: 'transformation', title: 'Next canvas' };
    const documents = [...controller.canvasDocuments, document];
    controller = { ...controller, canvasDocument: document, activeCanvasId: document.id };

    await rerenderRoute(1);

    expect(currentContext()).not.toBe(first);
    expect(currentContext().activeId).toBe(document.id);
    const selected = currentContext();
    controller = { ...controller, canvasDocuments: documents };
    await rerenderRoute(2);
    expect(currentContext()).not.toBe(selected);
    expect(currentContext().documents).toBe(documents);
  });

  it('invalidates changed command handlers and invokes the latest commands', async () => {
    await harness.render();
    const first = currentContext();
    const create = vi
      .fn<typeof controller.handleCreateCanvasDocument>()
      .mockResolvedValue(undefined);
    const select = vi
      .fn<typeof controller.handleSelectCanvasDocument>()
      .mockResolvedValue(undefined);
    controller = {
      ...controller,
      handleCreateCanvasDocument: create,
      handleSelectCanvasDocument: select,
    };
    await rerenderRoute(1);

    const changed = currentContext();
    expect(changed).not.toBe(first);
    await act(async () => {
      await changed.onAddCanvas?.('New worksheet');
      changed.onSelectCanvas?.('next-canvas');
    });
    expect(create).toHaveBeenCalledWith({
      kind: 'transformation',
      title: 'New worksheet',
      mode: 'create_new',
    });
    expect(select).toHaveBeenCalledWith('next-canvas');
  });

  it('withdraws and restores creation when the actual permission changes', async () => {
    await harness.render();
    expect(currentContext().onAddCanvas).toBeTypeOf('function');
    controller = {
      ...controller,
      userPermissions: { ...controller.userPermissions, canEditEdges: false },
    };
    await rerenderRoute(1);
    expect(currentContext().onAddCanvas).toBeUndefined();

    controller = {
      ...controller,
      userPermissions: { ...controller.userPermissions, canEditEdges: true },
    };
    await rerenderRoute(2);
    expect(currentContext().onAddCanvas).toBeTypeOf('function');
  });

  it('clears and restores the actual context when Canvas becomes unavailable', async () => {
    await harness.render();
    const available = controller;
    expect(currentContext().activeId).toBe(available.activeCanvasId);
    controller = { ...controller, canvasDocument: null, activeCanvasId: null };
    await rerenderRoute(1);
    expect(probe.values.at(-1)).toBeNull();

    controller = available;
    await rerenderRoute(2);
    expect(currentContext().activeId).toBe(available.activeCanvasId);
  });
});
