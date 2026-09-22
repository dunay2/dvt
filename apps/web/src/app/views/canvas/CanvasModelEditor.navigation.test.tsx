// @vitest-environment jsdom

/** Owned concern: prove Model navigation consumes explicit Apply and durable-save outcomes. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { createMemoryRouter, RouterProvider, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConnectedSourceRef } from '@dvt/contracts';

import type { CanonicalEdge, CanonicalNode } from '../../types/canonical';
import { CanvasModelEditor } from './CanvasModelEditor';
import type { CanvasRelationalTreeAuthoringContract } from './canvasRelationalTreeWorkbench.types';
import type { CanvasDraftStatusState } from './canvasDraftStatusState';
import { useCanvasWorkspaceMenuContributionStore } from './canvasWorkspaceMenuContributionStore';
import {
  openOperationMenu,
  setupOperationMenuDom,
} from './operation-menu/operationMenu.test-support';

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
      canvasName="Canvas 1"
      transformNode={model}
      nodes={[source, model]}
      edges={edges}
      authoring={props.authoring}
      initialView="editor"
      viewRequestId={0}
      draftStatus={props.draftStatus ?? durableStatus}
      preparePreview={props.preparePreview}
      onClose={props.onClose ?? vi.fn()}
      onSelect={vi.fn()}
      onShowCanvas={vi.fn()}
    />
  );
}

function beginProjection(container: HTMLElement): void {
  act(() => {
    container
      .querySelector<HTMLButtonElement>('[data-slot="canvas-relational-tree-source"]')!
      .click();
  });
  openOperationMenu(container);
  act(() => {
    document.querySelector<HTMLElement>('[data-slot="dvt-select-operation-projection"]')!.click();
  });
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

  it('keeps the local draft and current view when Apply is rejected', async () => {
    const onApplyNodeDraft = vi.fn(
      () => ({ outcome: 'rejected', reason: 'node_unavailable' }) as const
    );
    await act(async () => {
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    beginProjection(container);

    act(() => findButton('SQL').click());
    const applyAndContinue = findButton('Apply and continue');
    applyAndContinue.focus();
    await act(async () => applyAndContinue.click());

    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(applyAndContinue);
    expect(document.querySelector('[role="alert"]')?.textContent).toContain('no longer available');
    expect(container.querySelector('[data-view="editor"]')?.getAttribute('aria-selected')).toBe(
      'true'
    );
    expect(container.querySelector('[data-slot="canvas-relational-tree-apply"]')).not.toBeNull();
  });

  it('continues once for a legitimate no-change result despite a rapid double interaction', async () => {
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    await act(async () => {
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    beginProjection(container);

    act(() => findButton('SQL').click());
    const applyAndContinue = findButton('Apply and continue');
    await act(async () => {
      applyAndContinue.click();
      applyAndContinue.click();
      await Promise.resolve();
    });

    expect(onApplyNodeDraft).toHaveBeenCalledOnce();
    expect(findButton('SQL').getAttribute('aria-selected')).toBe('true');
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('offers Stay or Discard before replacing a Model with unapplied work', async () => {
    const continuation = vi.fn();
    const onApplyNodeDraft = vi.fn(() => ({ outcome: 'no_changes' }) as const);
    await act(async () => {
      root.render(<Editor authoring={{ canEditNode: true, onApplyNodeDraft }} />);
    });
    beginProjection(container);

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
    await act(async () => root.render(<RouterProvider router={router} />));

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
