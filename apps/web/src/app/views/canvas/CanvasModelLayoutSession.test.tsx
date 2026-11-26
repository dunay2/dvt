// @vitest-environment jsdom
/** Model placement survives editor lifetime without authoring or execution writes. */
import React, { act, createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/dom';
import { jcsCanonicalize } from '@dvt/crypto';
import type {
  CanvasRelationalTreeAuthoringContract,
  CanvasModelLayoutRetention,
} from './canvasRelationalTreeWorkbench.types';
import { applyCanvasInspectorNodeDraftToSession } from './canvasInspectorAuthoringCommand';
import { canvasDraftSession } from './canvasDraftSession';
import { resolveCanvasDraftNodes } from './canvasDraftNodeCatalog';
import { captureCanvasModelLayout } from './canvasModelLayoutReconciliation';
import * as layoutReconciliation from './canvasModelLayoutReconciliation';
import { modelSqlContext, proposal } from './model-sql/modelSqlProtocol.test-fixtures';
import { openOperationMenu } from './operation-menu/operationMenu.test-support';
import {
  connectStagedWorkbenchUnaryOperation,
  connectWorkbenchOutput,
  disconnectWorkbenchOutput,
} from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import {
  CanvasRelationalTreeWorkbench,
  type CanvasRelationalTreeWorkbenchHandle,
} from './CanvasRelationalTreeWorkbench';
import { projectionTarget } from './CanvasRelationalTreeWorkbench.operation-drag.test-support';
import { CanvasModelLayoutSession, canvasModelLayoutKey } from './CanvasModelLayoutSession';
import { useRelationalLayout } from './relational-layout/RelationalLayoutSession';
import { CANVAS_RELATIONAL_OUTPUT_POSITION_ID } from './canvasRelationalTreeGeometry';
import { readDvtTransformAuthoringAuthority } from './canvasDvtTransformAuthoringAuthority';
import { decodeDvtSubstraitSemanticDocument } from './canvasDvtSubstraitSemanticDocument';
import {
  COPY,
  container,
  edge,
  root,
  setupWorkbenchTest,
  sourceNode,
} from './CanvasRelationalTreeWorkbench.test-support';

async function stageFilterForLayout(): Promise<void> {
  await disconnectWorkbenchOutput(container);
  const producer = container
    .querySelector<HTMLElement>('[data-operator="project"]')!
    .closest('li')!
    .querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!;
  openOperationMenu(container);
  await act(async () =>
    document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-filter"]')!.click()
  );
  expect(container.querySelector('[data-pending-operation="true"]')).not.toBeNull();
  expect(producer).not.toBeNull();
  const operation = await connectStagedWorkbenchUnaryOperation(producer);
  await act(async () => {
    const form = container.querySelector<HTMLFormElement>(
      '[data-slot="canvas-relational-operator-form"]'
    )!;
    fireEvent.input(form.querySelector('input')!, { target: { value: "customer_id = 'C-001'" } });
  });
  await act(async () =>
    fireEvent.submit(container.querySelector('[data-slot="canvas-relational-operator-form"]')!)
  );
  await connectWorkbenchOutput(
    container,
    operation.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
  );
}

describe('Model layout persistence through the real Workbench', () => {
  setupWorkbenchTest();
  const source = sourceNode('customers', 'customers');
  source.metadata = { ...source.metadata, columns: [{ name: 'customer_id', type: 'text' }] };
  const transform = projectionTarget(source);
  const authoring = {
    canEditNode: true,
    onApplyNodeDraft: vi.fn(() => ({ outcome: 'no_changes' as const })),
  };
  const handle = createRef<CanvasRelationalTreeWorkbenchHandle>();
  const firstKey = 'model-layout-project-a';
  const secondKey = 'model-layout-project-b';
  const render = async (
    layoutKey = firstKey,
    target = transform,
    commands: CanvasRelationalTreeAuthoringContract = authoring
  ): Promise<void> => {
    await act(async () =>
      root.render(
        <CanvasRelationalTreeWorkbench
          {...{ layoutKey }}
          ref={handle}
          transformNode={target}
          nodes={[source, target]}
          edges={[edge(source.id)]}
          copy={COPY}
          authoring={commands}
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
  it('lets automatic Output reflow after a real Filter Apply and canonical acknowledgement', async () => {
    let accepted = transform;
    const canonicalNodesById = new Map([source, transform].map((node) => [node.id, node]));
    const draftSession = canvasDraftSession.machine.bootstrap({
      remoteDraft: null,
      canonicalNodeIds: [...canonicalNodesById.keys()],
      canonicalEdges: [edge(source.id)],
    });
    const apply = vi.fn<CanvasRelationalTreeAuthoringContract['onApplyNodeDraft']>((_id, draft) => {
      const result = applyCanvasInspectorNodeDraftToSession({
        node: transform,
        draft,
        draftSession,
        canonicalNodesById,
        workspaceScope: {
          tenantId: 'tenant',
          projectId: 'project',
          environmentId: 'dev',
          targetAdapter: 'temporal',
        },
      });
      expect(result.outcome).toBe('applied');
      if (result.outcome === 'applied')
        accepted = resolveCanvasDraftNodes(result.draftSession, canonicalNodesById).find(
          (node) => node.id === transform.id
        )!;
      return result;
    });
    const commands = { canEditNode: true, onApplyNodeDraft: apply };
    await render(firstKey, transform, commands);
    const before = positions()[CANVAS_RELATIONAL_OUTPUT_POSITION_ID]!;
    await stageFilterForLayout();
    await act(async () => {
      await handle.current!.apply();
    });
    expect(apply).toHaveBeenCalledOnce();
    expect(accepted).not.toEqual(transform);
    await render(firstKey, accepted, commands);
    expect(container.querySelector('[data-operator="filter"]')).not.toBeNull();
    expect(positions()[CANVAS_RELATIONAL_OUTPUT_POSITION_ID]!.x).toBeGreaterThan(before.x);
    expect(useCanvasInteractionStore.getState().canvasLayouts[firstKey]).toBeUndefined();
    const after = positions();
    await act(async () => root.render(null));
    await render(firstKey, accepted, commands);
    expect(positions()).toEqual(after);
    expect(apply).toHaveBeenCalledOnce();
  });
  it('keeps settled world coordinates through canonical regeneration and scoped store rehydration', async () => {
    await render();
    for (const id of Object.keys(positions())) {
      await act(async () =>
        container.querySelector<HTMLElement>(`[data-relational-card-id="${id}"]`)!.dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'ArrowDown',
            altKey: true,
            shiftKey: true,
          })
        )
      );
    }
    const before = Object.values(positions()).sort((a, b) => a.x - b.x);
    const regenerated = projectionTarget(source);
    await render(firstKey, regenerated);
    expect(Object.values(positions()).sort((a, b) => a.x - b.x)).toEqual(before);
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
    const saved = localStorage.getItem('dvt-web-canvas-interaction')!;
    await act(async () => root.render(null));
    useCanvasInteractionStore.setState({ canvasLayouts: {} });
    localStorage.setItem('dvt-web-canvas-interaction', saved);
    await useCanvasInteractionStore.persist.rehydrate();
    await render(firstKey, regenerated);
    expect(Object.values(positions()).sort((a, b) => a.x - b.x)).toEqual(before);
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
  });
  it('publishes nothing for an equivalent document copy or a different Model layout key', async () => {
    const document = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(transform)!.semanticDocument
    );
    const other = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(projectionTarget(source))!.semanticDocument
    );
    const publish = vi.fn();
    const seed = new Map([['legacy-locator', { x: 300, y: -100 }]]);
    const show = async (layoutKey: string, current = document): Promise<void> => {
      await act(async () =>
        root.render(
          <CanvasModelLayoutSession
            layoutKey={layoutKey}
            document={current}
            initialPositions={seed}
            onPositionsChange={publish}
          >
            <span>Model</span>
          </CanvasModelLayoutSession>
        )
      );
    };
    await show(firstKey);
    await show(firstKey, structuredClone(document));
    await show(secondKey, other);
    expect(publish).not.toHaveBeenCalled();
    expect(useCanvasInteractionStore.getState().canvasLayouts).toEqual({});
  });
  it('defers an early canonical acknowledgement and consumes only its matching Generate snapshot once', async () => {
    const old = decodeDvtSubstraitSemanticDocument(
      readDvtTransformAuthoringAuthority(transform)!.semanticDocument
    );
    const next = decodeDvtSubstraitSemanticDocument(
      proposal({
        canvasId: 'canvas',
        transformNodeId: 'transform',
        draftRevision: 'r1',
        contextSha256: modelSqlContext.contextSha256,
        sql: 'SELECT orders_id FROM orders',
      }).semanticDocument
    );
    const retention: CanvasModelLayoutRetention = {
      layoutKey: firstKey,
      sourceDocumentIdentity: jcsCanonicalize(old.sidecar),
      targetDocumentIdentity: jcsCanonicalize(next.sidecar),
      positions: captureCanvasModelLayout(old, new Map()),
    };
    const consume = vi.fn();
    const publish = vi.fn();
    const reconcile = vi.spyOn(layoutReconciliation, 'reconcileCanvasModelLayout');
    const seed = new Map();
    const show = async (
      document = old,
      pending = false,
      accepted: CanvasModelLayoutRetention | null = null
    ): Promise<void> => {
      await act(async () =>
        root.render(
          <CanvasModelLayoutSession
            layoutKey={firstKey}
            document={document}
            initialPositions={seed}
            onPositionsChange={publish}
            transition={{ pending, accepted, consume }}
          >
            <span>Model</span>
          </CanvasModelLayoutSession>
        )
      );
    };
    await show();
    await show(next, true, retention);
    expect(reconcile).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    await show(next, false, retention);
    expect(reconcile).toHaveBeenCalledExactlyOnceWith(old, next, retention.positions);
    expect(publish).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledExactlyOnceWith(retention);
    await show(next);
    expect(reconcile).toHaveBeenCalledOnce();
    reconcile.mockRestore();
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
  it('retains movement extent when settled positions are echoed by persistence', async () => {
    const outputId = CANVAS_RELATIONAL_OUTPUT_POSITION_ID;
    useCanvasInteractionStore.getState().setCanvasNodePositions(firstKey, {
      [outputId]: { x: 2000, y: 400 },
    });
    await render();
    const layout = container.querySelector<HTMLElement>(
      '[data-slot="canvas-relational-tree-layout"]'
    )!;
    const width = Number.parseFloat(layout.style.width);
    const before = positions()[outputId]!;
    expect(width).toBeGreaterThan(2000);
    await act(async () => {
      container
        .querySelector<HTMLElement>(`[data-relational-card-id="${outputId}"]`)!
        .dispatchEvent(
          new KeyboardEvent('keydown', {
            bubbles: true,
            key: 'ArrowLeft',
            altKey: true,
            shiftKey: true,
          })
        );
    });
    expect(positions()[outputId]).toEqual({ ...before, x: before.x - 40 });
    expect(
      useCanvasInteractionStore.getState().canvasLayouts[firstKey]?.nodePositions[outputId]
    ).toEqual({ ...before, x: before.x - 40 });
    expect(Number.parseFloat(layout.style.width)).toBe(width);
    await act(async () => {
      useCanvasInteractionStore.getState().setCanvasNodePositions(firstKey, {
        [outputId]: { x: 2200, y: 400 },
      });
    });
    expect(positions()[outputId]).toEqual({ x: 2200, y: 400 });
    expect(Number.parseFloat(layout.style.width)).toBeGreaterThan(width);
    expect(authoring.onApplyNodeDraft).not.toHaveBeenCalled();
    expect(handle.current?.hasUnappliedChanges).toBe(false);
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
