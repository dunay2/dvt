// @vitest-environment jsdom
/** Prove explicit Explorer selection, guarded Model replacement and stale owner rejection together. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useCanvasModelSelection } from './useCanvasModelSelection';
import { useCanvasModelBrowser } from './useCanvasModelBrowser';
import {
  useCanvasWorkspaceMenuContributionStore as store,
  type CanvasModelWorkspaceTabContribution,
} from './canvasWorkspaceMenuContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';
import type { CanvasInspectorResource } from '../../stores/canvasInspectorTarget';

const first: CanonicalNode = {
  id: 'model-1',
  name: 'Model 1',
  kind: 'dvt:transform',
  pluginId: 'dvt',
  role: 'transform',
  status: 'idle',
  tags: [],
  metadata: {},
};
const second = { ...first, id: 'model-2', name: 'Model 2' };
const source: CanonicalNode = { ...first, id: 'source', kind: 'dvt:source', role: 'input' };
const focus = { capture: vi.fn(), enter: vi.fn(), restore: vi.fn() };
const showCanvas = vi.fn();
const inspect = vi.fn();
const tabViews = {
  active: 'semantic',
  sqlPanelId: 'sql',
  disabled: false,
  semantic: vi.fn(),
  sql: vi.fn(),
} as const;
let model: ReturnType<typeof useCanvasModelSelection>;
let browser: ReturnType<typeof useCanvasModelBrowser>;
let root: Root;
let host: HTMLDivElement;
function Harness({
  canvasId,
  nodes,
  target,
}: {
  canvasId: string;
  nodes: readonly CanonicalNode[];
  target?: CanvasInspectorResource;
}): null {
  model = useCanvasModelSelection(canvasId, nodes, focus);
  browser = useCanvasModelBrowser({
    canvasId,
    nodes,
    model,
    showCanvas,
    onInspect: inspect,
    inspectorTarget: target,
  });
  return null;
}
function render(
  canvasId = 'canvas',
  nodes = [first, second, source],
  target?: CanvasInspectorResource
): void {
  act(() => root.render(<Harness canvasId={canvasId} nodes={nodes} target={target} />));
}
function registerTab(overrides: Partial<CanvasModelWorkspaceTabContribution>): void {
  act(() =>
    store.getState().registerModelTab({
      canvasId: 'canvas',
      nodeId: first.id,
      label: first.name,
      active: true,
      onSelect: vi.fn(),
      onCanvas: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    })
  );
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  store.setState({ modelTab: null, modelBrowser: null, contribution: null });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it('reveals the Canvas and Explorer without selecting or inspecting a Model', async () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  expect(model.selected).toBeNull();
  expect(model.active).toBe(false);
  expect(browser.mode).toBe('sql');
  expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('expanded');
  expect(showCanvas).toHaveBeenCalledOnce();
  expect(inspect).not.toHaveBeenCalled();
  await act(() => browser.onSelect({ kind: 'canonical-node', nodeId: first.id }));
  expect(model.selected?.id).toBe(first.id);
  expect(model.initialView).toBe('sql');
  expect(model.active).toBe(true);
  expect(inspect).not.toHaveBeenCalled();
});

it('switches the visible Model even when Canvas retained a different inspector target', () => {
  render('canvas', [first, second, source], { kind: 'canonical-node', nodeId: second.id });
  act(() => model.open(first.id));
  const select = vi.fn();
  registerTab({ onSelect: select, views: tabViews });
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  expect(tabViews.sql).toHaveBeenCalledOnce();
  expect(select).toHaveBeenCalledOnce();
  expect(model.initialView).toBe('semantic');
});

it('leaves the active view in place while its Model session is busy', () => {
  render('canvas', [first, second, source], { kind: 'canonical-node', nodeId: second.id });
  act(() => model.open(first.id));
  const close = vi.fn();
  registerTab({ onClose: close, views: { ...tabViews, disabled: true } });
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  expect(browser.mode).toBeNull();
  expect(model.selected?.id).toBe(first.id);
  expect(close).not.toHaveBeenCalled();
  expect(showCanvas).not.toHaveBeenCalled();
});

it.each(['semantic', 'sql'] as const)(
  'opens the highlighted Model directly in %s without another catalogue click',
  (view) => {
    render('canvas', [first, second, source], { kind: 'canonical-node', nodeId: first.id });
    act(() => model.open(second.id));
    act(() => store.getState().modelBrowser!.onBrowse(view));
    expect(model.selected?.id).toBe(first.id);
    expect(model.initialView).toBe(view);
    expect(model.active).toBe(true);
    expect(inspect).not.toHaveBeenCalled();
  }
);

it.each([source.id, 'missing'])(
  'does not replace an explicit %s resource with a retained Model',
  (nodeId) => {
    render('canvas', [first, second, source], { kind: 'canonical-node', nodeId });
    act(() => model.open(first.id));
    act(() => store.getState().modelBrowser!.onBrowse('sql'));
    expect(model.selected?.id).toBe(first.id);
    expect(model.active).toBe(false);
    expect(inspect).toHaveBeenCalledExactlyOnceWith({ kind: 'canonical-node', nodeId }, 'code');
  }
);

it('retains the current Model until its owner accepts replacement', async () => {
  render();
  act(() => model.open(first.id));
  let resume: (() => void) | undefined;
  const close = vi.fn((continuation?: () => void) => {
    resume = continuation;
  });
  registerTab({ onClose: close });
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  await act(() => browser.onSelect(second.id));
  expect(close).toHaveBeenCalledOnce();
  expect(model.selected?.id).toBe(first.id);
  expect(model.initialView).toBe('semantic');
  act(() => resume!());
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('sql');
});

it('opens the next Model in the actual active view after its toolbar changes SQL visibility', async () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  await act(() => browser.onSelect(first.id));
  registerTab({ onClose: (next) => next?.(), views: tabViews });
  await act(() => browser.onSelect(second.id));
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('semantic');
});

it('rejects obsolete browsing and delayed replacement after a Canvas change', () => {
  render();
  const obsolete = store.getState().modelBrowser!;
  act(() => model.open(first.id));
  let resume: (() => void) | undefined;
  registerTab({
    onClose: (next) => {
      resume = next;
    },
  });
  act(() => model.open(second.id, 'sql'));
  render('other');
  act(() => {
    obsolete.onBrowse('sql');
    resume!();
  });
  expect(model.selected).toBeNull();
  expect(browser.mode).toBeNull();
  render('canvas');
  act(() => obsolete.onBrowse('sql'));
  expect(browser.mode).toBeNull();
  expect(model.selected).toBeNull();
});

it('keeps resource inspection and SQL capability admission with their existing owner', async () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  await act(() => browser.onSelect({ kind: 'canonical-node', nodeId: source.id }));
  expect(model.selected).toBeNull();
  expect(inspect).toHaveBeenCalledExactlyOnceWith(
    { kind: 'canonical-node', nodeId: source.id },
    'code'
  );
});

it('opens the existing occurrence or waits for an explicit context choice without allocating one', async () => {
  const instance = { ...first, id: 'placed', definitionId: first.id };
  render('canvas', [first, instance]);
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  await act(() => browser.onSelect(first.id));
  expect(model.selected?.id).toBe(instance.id);
  expect(model.initialView).toBe('sql');
  const other = { ...instance, id: 'other-placement', name: 'Other Model block' };
  act(() => model.close());
  render('canvas', [first, instance, other]);
  await act(() => browser.onSelect(first.id));
  expect(model.selected).toBeNull();
  expect(browser.contexts.map((item) => item.nodeId)).toEqual([instance.id, other.id]);
  act(() => browser.cancelContext());
  expect(model.selected).toBeNull();
  await act(() => browser.onSelect(first.id));
  act(() => browser.selectContext(other.id));
  expect(model.selected?.id).toBe(other.id);
  expect(model.initialView).toBe('sql');
});
