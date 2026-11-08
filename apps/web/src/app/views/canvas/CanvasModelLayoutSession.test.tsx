// @vitest-environment jsdom
/** Model placement survives editor lifetime without authoring or execution writes. */
import React, { act, createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import { projectionTarget } from './CanvasRelationalTreeWorkbench.operation-drag.test-support';
import { CanvasModelLayoutSession, canvasModelLayoutKey } from './CanvasModelLayoutSession';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';

describe('Model layout persistence through the real Workbench', () => {
  setupWorkbenchTest();
  const source = sourceNode('customers', 'customers');
  const transform = projectionTarget(source);
  const authoring = {
    canEditNode: true,
    onApplyNodeDraft: vi.fn(() => ({ outcome: 'no_changes' as const })),
  };
  const handle = createRef<CanvasRelationalTreeWorkbenchHandle>();
  const firstKey = 'model-layout-project-a';
  const secondKey = 'model-layout-project-b';
  const render = async (layoutKey = firstKey): Promise<void> => {
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          {...{ layoutKey }}
          ref={handle}
          transformNode={transform}
          nodes={[source, transform]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={authoring}
        />
      )
    );
  };
  const positions = (): Record<string, { x: number; y: number }> =>
    Object.fromEntries(
      Array.from(container.querySelectorAll<HTMLElement>('[data-relational-card-id]')).map(
        (card) => {
          const host = card.style.left === '' ? card.parentElement! : card;
          const position = { x: parseFloat(host.style.left), y: parseFloat(host.style.top) };
          expect(Number.isFinite(position.x) && Number.isFinite(position.y)).toBe(true);
          return [card.dataset.relationalCardId!, position];
        }
      )
    );
  beforeEach(() => {
    localStorage.clear();
    authoring.onApplyNodeDraft.mockClear();
    useCanvasInteractionStore.setState({ _hasHydrated: true, canvasLayouts: {} });
  });
  it('retains source, operation and output moves after closing and reopening without Apply', async () => {
    await render();
    const before = positions();
    expect(Object.keys(before).length).toBeGreaterThanOrEqual(3);
    for (const id of Object.keys(before)) {
      await act(async () => {
        container
          .querySelector<HTMLElement>(`[data-relational-card-id="${id}"]`)!
          .dispatchEvent(
            new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight', altKey: true })
          );
      });
    }
    const moved = positions();
    expect(moved).not.toEqual(before);
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
    expect(handle.current?.hasUnappliedChanges).toBe(false);
    await render(secondKey);
    expect(positions()).toEqual(before);
    await render(firstKey);
    expect(positions()).toEqual(moved);
    await act(async () => root.render(null));
    await render();
    expect(positions()).toEqual(moved);
    await render(secondKey);
    expect(positions()).toEqual(before);
    await render(firstKey);
    expect(positions()).toEqual(moved);
    const saved = localStorage.getItem('dvt-web-canvas-interaction')!;
    await act(async () => root.render(null));
    useCanvasInteractionStore.setState({ canvasLayouts: {} });
    localStorage.setItem('dvt-web-canvas-interaction', saved);
    await useCanvasInteractionStore.persist.rehydrate();
    await render();
    expect(positions()).toEqual(moved);
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('waits for layout hydration before admitting interactive movement', async () => {
    useCanvasInteractionStore.setState({ _hasHydrated: false });
    await render();
    expect(container.querySelector('[data-relational-card-id]')).toBeNull();
    await act(async () => useCanvasInteractionStore.setState({ _hasHydrated: true }));
    expect(container.querySelector('[data-relational-card-id]')).not.toBeNull();
    expect(useCanvasInteractionStore.getState().canvasLayouts[firstKey]).toBeUndefined();
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('keeps Arrange as an explicit empty layout over later legacy positions', async () => {
    let session: ReturnType<typeof useRelationalLayout>;
    const publish = vi.fn();
    function Observe(): null {
      session = useRelationalLayout();
      return null;
    }
    const show = async (): Promise<void> => {
      await act(async () =>
        root.render(
          <CanvasModelLayoutSession
            layoutKey={firstKey}
            initialPositions={new Map([['source', { x: -100, y: 200 }]])}
            onPositionsChange={publish}
          >
            <Observe />
          </CanvasModelLayoutSession>
        )
      );
    };
    await show();
    expect(session!.positions.get('source')).toEqual({ x: -100, y: 200 });
    expect(publish).not.toHaveBeenCalled();
    await act(async () => session!.arrange());
    expect(useCanvasInteractionStore.getState().canvasLayouts[firstKey]?.nodePositions).toEqual({});
    await act(async () => root.render(null));
    await show();
    expect(session!.positions.size).toBe(0);
    expect(publish).toHaveBeenCalledOnce();
  });
  it('isolates identity boundaries and does not create an unscoped persistent key', () => {
    const scope = {
      tenantId: 'tenant',
      projectId: 'project',
      environmentId: 'dev',
      targetAdapter: 'temporal' as const,
    };
    const key = canvasModelLayoutKey(scope, 'canvas', 'model');
    for (const field of ['tenantId', 'projectId', 'environmentId'] as const) {
      expect(canvasModelLayoutKey({ ...scope, [field]: 'different' }, 'canvas', 'model')).not.toBe(
        key
      );
    }
    expect(canvasModelLayoutKey(scope, 'other', 'model')).not.toBe(key);
    expect(canvasModelLayoutKey(scope, 'canvas', 'other')).not.toBe(key);
    expect(canvasModelLayoutKey(undefined, 'canvas', 'model')).toBeUndefined();
    expect(canvasModelLayoutKey(scope, 'a:b', 'c')).not.toBe(
      canvasModelLayoutKey(scope, 'a', 'b:c')
    );
  });
});
