// @vitest-environment jsdom

/** Owned concern: prove Model navigation consumes explicit Apply and durable-save outcomes. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/dom';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { ShellAppMenu } from '../../components/shell/ShellAppMenu';
import { resolveShellTopBarCopy } from '../../components/shell/copy';
import { buildShellNavigationModel } from '../../shell/shellNavigationModel';
import { flushRouterUpdate } from '../../routerFlushSync';
import { CanvasModelEditor } from './CanvasModelEditor';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import {
  openOperationMenu,
  setupOperationMenuDom,
} from './operation-menu/operationMenu.test-support';
import { connectWorkbenchOutput } from './CanvasRelationalTreeWorkbench.gestures.test-support';
import { dragSourceTo } from './CanvasRelationalTreeWorkbench.test-support';
import { useCanvasModelNavigation } from './useCanvasModelNavigation';
import { CanvasDraftDecisionDialog } from './CanvasDraftDecisionDialog';
import { resolveCanvasSemanticEditorCopy } from './canvasSemanticEditorCopy';
import type { CanvasRelationalTreeWorkbenchHandle } from './useCanvasRelationalTreeWorkbenchHandle';
import type { CanvasRelationalTreeApplyResult } from './canvasRelationalTreeWorkbench.types';

setupOperationMenuDom();

const NativeRequest = globalThis.Request;
class MemoryRouterRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init == null ? undefined : { ...init, signal: undefined });
  }
}

const sourceRef: ConnectedSourceRef = {
  schemaVersion: 'connected-source-ref.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-main',
    provider: 'postgres',
  },
  sourceObjectId: 'public.orders',
};
const source: CanonicalNode = {
  id: 'orders',
  name: 'orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
  metadata: {
    schema: 'public',
    tableName: 'orders',
    connectedSourceRef: sourceRef,
    columns: [{ name: 'order_id', type: 'int64' }],
  },
};
const model: CanonicalNode = {
  id: 'model-orders',
  name: 'Model orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};
const edges: readonly CanonicalEdge[] = [
  { id: 'orders-model', sourceId: source.id, targetId: model.id, relation: 'lineage' },
];
const durableStatus: CanvasDraftStatusState = {
  label: 'Draft saved',
  tone: 'neutral',
  showReloadAction: false,
  persistence: 'durable',
};

function Editor(props: {
  authoring: CanvasRelationalTreeAuthoringContract;
  draftStatus?: CanvasDraftStatusState;
  preparePreview?: React.ComponentProps<typeof CanvasModelEditor>['preparePreview'];
  onClose?: () => void;
}): React.JSX.Element {
  return (
    <CanvasModelEditor
      canvasId="canvas-1"
      transformNode={model}
      nodes={[source, model]}
      edges={edges}
      authoring={props.authoring}
      draftStatus={props.draftStatus ?? durableStatus}
      preparePreview={props.preparePreview}
      onClose={props.onClose ?? vi.fn()}
      onSelect={vi.fn()}
      onShowCanvas={vi.fn()}
    />
  );
}

async function beginProjection(container: HTMLElement): Promise<void> {
  await act(async () =>
    dragSourceTo(
      container.querySelector<HTMLElement>('[data-slot="canvas-relational-tree-source"]')!,
      container.querySelector<HTMLElement>(
        '[data-slot="canvas-relational-tree-draft-viewport"], [data-slot="canvas-relational-tree-viewport"]'
      )!
    )
  );
  openOperationMenu(container);
  await act(async () => {
    document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-projection"]')!.click();
  });
  const projection = Array.from(
    container.querySelectorAll<HTMLElement>('[data-pending-operation="true"]')
  ).find((card) => card.querySelector('[data-operator="project"]') != null)!;
  const producer = Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="canvas-relational-output-port"]')
  ).find(
    (port) =>
      port.parentElement?.querySelector('[data-pending="true"][data-operator="read"]') != null
  )!;
  await act(async () =>
    dragSourceTo(
      producer,
      projection.querySelector<HTMLElement>('[data-slot="canvas-relational-input-port"]')!
    )
  );
  await connectWorkbenchOutput(
    container,
    projection.querySelector<HTMLElement>('[data-slot="canvas-relational-output-port"]')!
  );
}

function findButton(label: string): HTMLButtonElement {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((item) =>
    item.textContent?.includes(label)
  );
  if (button == null) throw new Error(`Missing button: ${label}`);
  return button;
}

function RouteHarness(props: React.ComponentProps<typeof Editor>): React.JSX.Element {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" data-slot="leave-route" onClick={() => void navigate('/next')}>
        Leave route
      </button>
      <Editor {...props} />
    </>
  );
}

describe('CanvasModelEditor navigation', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    globalThis.Request = MemoryRouterRequest;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    act(() => root.unmount());
    useCanvasWorkspaceMenuContributionStore.setState({ modelTab: null });
    container.remove();
    globalThis.Request = NativeRequest;
  });

  it.each([
    ['canvas', 'no_changes'],
    ['route', 'no_changes'],
    ['canvas', 'rejected'],
    ['route', 'rejected'],
    ['canvas', 'throws'],
    ['canvas', 'unmounted'],
    ['route', 'unmountedSave'],
  ] as const)('waits for Apply before continuing to %s (%s)', async (target, outcome) => {
    let finishApply!: (result: CanvasRelationalTreeApplyResult) => void;
    let failApply!: (reason: unknown) => void;
    const receipt = new Promise<CanvasRelationalTreeApplyResult>((resolve, reject) => {
      finishApply = resolve;
      failApply = reject;
    });
    let finishSave!: (result: {
      ok: true;
      canonicalNodes: readonly CanonicalNode[];
      canonicalEdges: readonly CanonicalEdge[];
      workspaceNodeIds: readonly string[];
    }) => void;
    const durableSave = new Promise<{
      ok: true;
      canonicalNodes: readonly CanonicalNode[];
      canonicalEdges: readonly CanonicalEdge[];
      workspaceNodeIds: readonly string[];
    }>((resolve) => {
      finishSave = resolve;
    });
    const apply = vi.fn(() => receipt);
    const onClose = vi.fn();
    const proceed = vi.fn();
    const preparePreview = vi.fn(() => durableSave);
    const copy = resolveCanvasSemanticEditorCopy('en');
    const workbench: React.RefObject<CanvasRelationalTreeWorkbenchHandle> = {
      current: {
        hasUnappliedChanges: true,
        canApply: true,
        applyRejection: null,
        apply,
        cancel: vi.fn(),
      },
    };
    function Host(): React.JSX.Element {
      const navigation = useCanvasModelNavigation({
        workbench,
        onClose,
        preparePreview,
        draftStatus: durableStatus,
        copy,
      });
      return (
        <>
          <button
            type="button"
            data-slot="request-async-navigation"
            onClick={() =>
              target === 'canvas'
                ? navigation.requestClose()
                : navigation.onRouteBlocked({ proceed, reset: vi.fn() })
            }
          >
            Leave
          </button>
          <CanvasDraftDecisionDialog {...navigation.decision} />
        </>
      );
    }
    await act(async () => root.render(<Host />));
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-slot="request-async-navigation"]')!.click()
    );
    const submit = findButton('Apply and continue');
    await act(async () => {
      submit.click();
      submit.click();
    });
    expect(apply).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(proceed).not.toHaveBeenCalled();
    expect(preparePreview).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    expect(submit.disabled).toBe(true);
    if (outcome === 'unmounted') {
      await act(async () => root.render(<div>Another workspace</div>));
    }
    await act(async () => {
      if (outcome === 'throws') failApply(new Error('Admission failed'));
      else
        finishApply(
          outcome === 'rejected'
            ? { outcome: 'rejected', reason: 'node_unavailable' }
            : { outcome: 'no_changes' }
        );
    });
    if (outcome === 'unmounted') {
      expect(container.textContent).toBe('Another workspace');
      expect(onClose).not.toHaveBeenCalled();
      expect(proceed).not.toHaveBeenCalled();
      expect(preparePreview).not.toHaveBeenCalled();
      return;
    }
    if (outcome === 'rejected' || outcome === 'throws') {
      expect(document.querySelector('[role="alertdialog"] [role="alert"]')?.textContent).toBe(
        outcome === 'rejected' ? copy.applyNodeUnavailable : copy.applyRejected
      );
      expect(onClose).not.toHaveBeenCalled();
      expect(proceed).not.toHaveBeenCalled();
      expect(preparePreview).not.toHaveBeenCalled();
      expect(submit.disabled).toBe(false);
      apply.mockReturnValueOnce(Promise.resolve({ outcome: 'no_changes' }));
      await act(async () => submit.click());
      expect(apply).toHaveBeenCalledTimes(2);
    }
    if (target === 'route') {
      expect(preparePreview).toHaveBeenCalledOnce();
      expect(proceed).not.toHaveBeenCalled();
      if (outcome === 'unmountedSave') {
        await act(async () => root.render(<div>Another workspace</div>));
        await act(async () =>
          finishSave({
            ok: true,
            canonicalNodes: [source, model],
            canonicalEdges: edges,
            workspaceNodeIds: [source.id, model.id],
          })
        );
        expect(container.textContent).toBe('Another workspace');
        expect(proceed).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        return;
      }
      await act(async () =>
        finishSave({
          ok: true,
          canonicalNodes: [source, model],
          canonicalEdges: edges,
          workspaceNodeIds: [source.id, model.id],
        })
      );
      expect(proceed).toHaveBeenCalledOnce();
      expect(onClose).not.toHaveBeenCalled();
    } else {
      expect(onClose).toHaveBeenCalledOnce();
      expect(preparePreview).not.toHaveBeenCalled();
    }
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('keeps a rejected model output draft open and explains the dependent model', async () => {
    const onApplyNodeDraft = vi.fn(
      () =>
        ({
          outcome: 'rejected',
          reason: 'model_output_required',
          consumer: { nodeId: 'model2', name: 'Model 2' },
          fields: [{ fieldId: 'stable-order', name: 'order_id' }],
        }) as const
    );
    const onClose = vi.fn();
    await act(async () =>
      root.render(<Editor onClose={onClose} authoring={{ canEditNode: true, onApplyNodeDraft }} />)
    );
    await beginProjection(container);
    const apply = container.querySelector<HTMLButtonElement>(
      '[data-slot="canvas-relational-tree-apply"]'
    )!;
    await act(async () => apply.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Model 2');
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('order_id');
    expect(container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    act(() => useCanvasWorkspaceMenuContributionStore.getState().modelTab?.onClose());
    await act(async () => findButton('Apply and continue').click());
    expect(document.querySelector('[role="alertdialog"] [role="alert"]')?.textContent).toContain(
      'Model 2'
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the local draft and current view when Apply is rejected', async () => {
    const onApplyNodeDraft = vi.fn(
      () => ({ outcome: 'rejected', reason: 'node_unavailable' }) as const
    );
    await act(async () => {
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    await beginProjection(container);

    act(() => useCanvasWorkspaceMenuContributionStore.getState().modelTab?.onClose());
    const applyAndContinue = findButton('Apply and continue');
    applyAndContinue.focus();
    await act(async () => applyAndContinue.click());

    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(applyAndContinue);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('no longer available');
    expect(container.querySelector('[data-slot="canvas-model-editor"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).not.toBeNull();
  });

  it('continues once for a legitimate no-change result despite a rapid double interaction', async () => {
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    const onClose = vi.fn();
    await act(async () => {
      root.render(<Editor onClose={onClose} authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    await beginProjection(container);

    act(() => useCanvasWorkspaceMenuContributionStore.getState().modelTab?.onClose());
    const applyAndContinue = findButton('Apply and continue');
    await act(async () => {
      applyAndContinue.click();
      applyAndContinue.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('keeps only draft actions in the session toolbar during an unapplied composition', async () => {
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    await act(async () =>
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />)
    );
    await beginProjection(container);
    const card = container.querySelector('[data-operator="project"]');
    const toolbar = container.querySelector('[data-slot="canvas-model-toolbar"]')!;
    expect(toolbar.querySelectorAll('button')).toHaveLength(2);
    expect(toolbar.querySelector('[data-slot="canvas-relational-tree-apply"]')).not.toBeNull();
    expect(toolbar.querySelector('[data-slot="canvas-relational-tree-cancel"]')).not.toBeNull();
    expect(container.querySelector('[data-operator="project"]')).toBe(card);
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('offers Stay or Discard before replacing a Model with unapplied work', async () => {
    const continuation = vi.fn();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    await act(async () => {
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    await beginProjection(container);

    act(() => useCanvasWorkspaceMenuContributionStore.getState().modelTab?.onClose(continuation));
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
    act(() => findButton('Keep editing').click());
    expect(continuation).not.toHaveBeenCalled();
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).not.toBeNull();

    act(() => useCanvasWorkspaceMenuContributionStore.getState().modelTab?.onClose(continuation));
    act(() => findButton('Discard changes').click());
    expect(continuation).toHaveBeenCalledOnce();
    expect(onApplyNodeDraft).not.toHaveBeenCalled();
  });

  it('keeps save failure visible, omits semantic Discard after Apply, and retries the CAS flush', async () => {
    const preparePreview = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, message: 'conflict' })
      .mockResolvedValueOnce({
        ok: true,
        canonicalNodes: [source, model],
        canonicalEdges: edges,
        workspaceNodeIds: [source.id, model.id],
      });
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <RouteHarness
              authoring={{ canEditNode: true, onApplyNodeDraft: () => ({ outcome: 'no_changes' }) }}
              draftStatus={{
                label: 'Draft save failed',
                tone: 'danger',
                showReloadAction: false,
                persistence: 'failed',
              }}
              preparePreview={preparePreview}
            />
          ),
        },
        { path: '/next', element: <div>Next route</div> },
      ],
      { initialEntries: ['/'] }
    );
    await act(async () =>
      root.render(<RouterProvider router={router} flushSync={flushRouterUpdate} />)
    );

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-slot="leave-route"]')!.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(preparePreview).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain('Next route');
    expect(document.querySelector('[data-slot="canvas-model-save-status"]')?.textContent).toContain(
      'Draft save failed'
    );
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('could not be saved');
    expect(
      Array.from(document.querySelectorAll('button')).some((button) =>
        button.textContent?.includes('Discard changes')
      )
    ).toBe(false);

    await act(async () => {
      findButton('Apply and continue').click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(preparePreview).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain('Next route');
  });

  it('keeps unapplied work when Raven navigation is cancelled and discards only on an explicit decision', async () => {
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    const router = createMemoryRouter(
      [
        {
          path: '/canvas',
          element: (
            <>
              <ShellAppMenu
                copy={resolveShellTopBarCopy('en')}
                navigationModel={buildShellNavigationModel([])}
                showNavigation
              />
              <Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />
            </>
          ),
        },
        { path: '/plugins', element: <div>Plugins route</div> },
      ],
      { initialEntries: ['/canvas'] }
    );
    await act(async () =>
      root.render(<RouterProvider router={router} flushSync={flushRouterUpdate} />)
    );
    await beginProjection(container);

    for (const decision of ['Keep editing', 'Discard changes']) {
      await act(async () => {
        fireEvent.pointerDown(container.querySelector('[data-slot="shell-app-menu-trigger"]')!);
      });
      const destination = await waitFor(() => {
        const link = document.querySelector<HTMLElement>(
          '[data-slot="shell-menu-navigation-link"][href="/plugins"]'
        );
        expect(link).not.toBeNull();
        return link!;
      });
      await act(async () => destination.click());

      expect(router.state.location.pathname).toBe('/canvas');
      expect(document.querySelector('[role="menu"]')).toBeNull();
      expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
      await act(async () => findButton(decision).click());
      expect(onApplyNodeDraft).not.toHaveBeenCalled();
      if (decision === 'Keep editing') {
        expect(router.state.location.pathname).toBe('/canvas');
        expect(
          container.querySelector('[data-slot="canvas-relational-tree-apply"]')
        ).not.toBeNull();
      }
    }

    expect(router.state.location.pathname).toBe('/plugins');
    expect(container.textContent).toContain('Plugins route');
  });

  it('guards hard exits while the existing persistence lifecycle is not durable', async () => {
    const authoring = {
      canEditNode: true,
      onApplyNodeDraft: () => ({ outcome: 'no_changes' }) as const,
    };
    await act(async () => {
      root.render(
        <Editor
          authoring={authoring}
          draftStatus={{
            label: 'Saving draft',
            tone: 'neutral',
            showReloadAction: false,
            persistence: 'pending',
          }}
        />
      );
    });
    const blockedExit = new Event('beforeunload', { cancelable: true });
    expect(window.dispatchEvent(blockedExit)).toBe(false);

    await act(async () => {
      root.render(<Editor authoring={authoring} draftStatus={durableStatus} />);
    });
    const allowedExit = new Event('beforeunload', { cancelable: true });
    expect(window.dispatchEvent(allowedExit)).toBe(true);
  });
});
