// @vitest-environment jsdom
/** Prove explicit Explorer selection, guarded Model replacement and stale owner rejection together. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useCanvasModelSelection } from './useCanvasModelSelection';
import { useCanvasModelBrowser } from './useCanvasModelBrowser';
import { useCanvasWorkspaceMenuContributionStore as store } from './canvasWorkspaceMenuContributionStore';
import { useUiLayoutStore } from '../../stores/uiLayoutStore';

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
let model: ReturnType<typeof useCanvasModelSelection>;
let browser: ReturnType<typeof useCanvasModelBrowser>;
let root: Root;
let host: HTMLDivElement;
function Harness({ canvasId, nodes }: { canvasId: string; nodes: readonly CanonicalNode[] }): null {
  model = useCanvasModelSelection(canvasId, nodes, focus);
  browser = useCanvasModelBrowser({ canvasId, nodes, model, showCanvas, onInspect: inspect });
  return null;
}
function render(canvasId = 'canvas', nodes = [first, second, source]): void {
  act(() => root.render(<Harness canvasId={canvasId} nodes={nodes} />));
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

it('reveals the Canvas and Explorer without selecting or inspecting a Model', () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  expect(model.selected).toBeNull();
  expect(model.active).toBe(false);
  expect(browser.mode).toBe('sql');
  expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('expanded');
  expect(showCanvas).toHaveBeenCalledOnce();
  expect(inspect).not.toHaveBeenCalled();
  act(() => browser.onSelect({ kind: 'canonical-node', nodeId: first.id }));
  expect(model.selected?.id).toBe(first.id);
  expect(model.initialView).toBe('sql');
  expect(model.active).toBe(true);
  expect(inspect).not.toHaveBeenCalled();
});

it('delegates an existing Model view without replacing its session or buffer', () => {
  render();
  act(() => model.open(first.id));
  const sql = vi.fn(),
    select = vi.fn();
  act(() =>
    store.getState().registerModelTab({
      canvasId: 'canvas',
      nodeId: first.id,
      label: first.name,
      active: false,
      onSelect: select,
      onCanvas: vi.fn(),
      onClose: vi.fn(),
      views: { active: 'semantic', sqlPanelId: 'sql', disabled: false, semantic: vi.fn(), sql },
    })
  );
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  act(() => browser.onSelect(first.id));
  expect(sql).toHaveBeenCalledOnce();
  expect(select).toHaveBeenCalledOnce();
  expect(model.initialView).toBe('semantic');
});

it('retains the current Model until its owner accepts replacement', () => {
  render();
  act(() => model.open(first.id));
  let resume: (() => void) | undefined;
  const close = vi.fn((continuation?: () => void) => {
    resume = continuation;
  });
  act(() =>
    store.getState().registerModelTab({
      canvasId: 'canvas',
      nodeId: first.id,
      label: first.name,
      active: true,
      onSelect: vi.fn(),
      onCanvas: vi.fn(),
      onClose: close,
    })
  );
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  act(() => browser.onSelect(second.id));
  expect(close).toHaveBeenCalledOnce();
  expect(model.selected?.id).toBe(first.id);
  expect(model.initialView).toBe('semantic');
  act(() => resume!());
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('sql');
});

it('opens the next Model in the actual active view after its toolbar changes SQL visibility', () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  act(() => browser.onSelect(first.id));
  act(() =>
    store.getState().registerModelTab({
      canvasId: 'canvas',
      nodeId: first.id,
      label: first.name,
      active: true,
      onSelect: vi.fn(),
      onCanvas: vi.fn(),
      onClose: (next) => next?.(),
      views: {
        active: 'semantic',
        sqlPanelId: 'sql',
        disabled: false,
        semantic: vi.fn(),
        sql: vi.fn(),
      },
    })
  );
  act(() => browser.onSelect(second.id));
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('semantic');
});

it('rejects obsolete browsing and delayed replacement after a Canvas change', () => {
  render();
  const obsolete = store.getState().modelBrowser!;
  act(() => model.open(first.id));
  let resume: (() => void) | undefined;
  act(() =>
    store.getState().registerModelTab({
      canvasId: 'canvas',
      nodeId: first.id,
      label: first.name,
      active: true,
      onSelect: vi.fn(),
      onCanvas: vi.fn(),
      onClose: (next) => {
        resume = next;
      },
    })
  );
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

it('keeps resource inspection and SQL capability admission with their existing owner', () => {
  render();
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  act(() => browser.onSelect({ kind: 'canonical-node', nodeId: source.id }));
  expect(model.selected).toBeNull();
  expect(inspect).toHaveBeenCalledExactlyOnceWith(
    { kind: 'canonical-node', nodeId: source.id },
    'code'
  );
});

it('opens the existing occurrence or waits for an explicit context choice without allocating one', () => {
  const instance = { ...first, id: 'placed', definitionId: first.id };
  render('canvas', [first, instance]);
  act(() => store.getState().modelBrowser!.onBrowse('sql'));
  act(() => browser.onSelect(first.id));
  expect(model.selected?.id).toBe(instance.id);
  expect(model.initialView).toBe('sql');
  const other = { ...instance, id: 'other-placement', name: 'Other Model block' };
  act(() => model.close());
  render('canvas', [first, instance, other]);
  act(() => browser.onSelect(first.id));
  expect(model.selected).toBeNull();
  expect(browser.contexts.map((item) => item.nodeId)).toEqual([instance.id, other.id]);
  act(() => browser.cancelContext());
  expect(model.selected).toBeNull();
  act(() => browser.onSelect(first.id));
  act(() => browser.selectContext(other.id));
  expect(model.selected?.id).toBe(other.id);
  expect(model.initialView).toBe('sql');
});
