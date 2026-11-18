// @vitest-environment jsdom
/** Prove explicit Explorer selection, guarded Model replacement and stale owner rejection together. */
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useCanvasModelSelection } from './useCanvasModelSelection';
import { useCanvasModelBrowser } from './useCanvasModelBrowser';
import {
  useCanvasWorkspaceMenuContributionStore as store,
  type CanvasModelView,
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
function Harness({
  canvasId = 'canvas',
  nodes = [first, second, source],
  projectId = 'project',
  target,
  unavailable,
}: {
  canvasId?: string;
  projectId?: string;
  unavailable?: boolean;
  nodes?: readonly CanonicalNode[];
  target?: CanvasInspectorResource;
}): null {
  model = useCanvasModelSelection(
    canvasId,
    nodes,
    focus,
    { tenantId: 'tenant', projectId, environmentId: 'dev', targetAdapter: 'temporal' },
    'root'
  );
  browser = useCanvasModelBrowser({
    canvasId,
    catalogueUnavailable: unavailable,
    nodes,
    model,
    showCanvas,
    onInspect: inspect,
    inspectorTarget: target,
  });
  return null;
}
function render(props: ComponentProps<typeof Harness> = {}): void {
  act(() => root.render(<Harness {...props} />));
}
function browse(view: CanvasModelView): void {
  act(() => store.getState().modelBrowser!.onBrowse(view));
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
function deferReplacement(nodeId = first.id): () => void {
  const onClose = vi.fn<CanvasModelWorkspaceTabContribution['onClose']>();
  registerTab({ nodeId, onClose });
  return () => {
    expect(onClose).toHaveBeenCalledOnce();
    act(() => onClose.mock.calls[0]![0]!());
  };
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.clearAllMocks();
  sessionStorage.clear();
  root = createRoot(document.createElement('div'));
  store.setState({ modelTab: null, modelBrowser: null, contribution: null });
});
afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

it.each(['semantic', 'sql'] as const)(
  'opens the first eligible catalog Model directly in %s',
  (view) => {
    render({ nodes: [source, first, second] });
    expect(model.selected).toBeNull();
    browse(view);
    expect(model.selected?.id).toBe(first.id);
    expect(model.initialView).toBe(view);
    expect(model.active).toBe(true);
    expect(browser.mode).toBe(view);
    expect(useUiLayoutStore.getState().canvasExplorer.mode).toBe('expanded');
    expect(inspect).not.toHaveBeenCalled();
  }
);

it('switches the visible Model even when Canvas retained a different inspector target', () => {
  render({ target: { kind: 'canonical-node', nodeId: second.id } });
  act(() => model.open(first.id));
  const select = vi.fn();
  registerTab({ onSelect: select, views: tabViews });
  browse('sql');
  expect(tabViews.sql).toHaveBeenCalledOnce();
  expect(select).toHaveBeenCalledOnce();
  expect(model.initialView).toBe('semantic');
});

it('leaves the active view in place while its Model session is busy', () => {
  render({ target: { kind: 'canonical-node', nodeId: second.id } });
  act(() => model.open(first.id));
  const close = vi.fn();
  registerTab({ onClose: close, views: { ...tabViews, disabled: true } });
  browse('sql');
  expect(browser.mode).toBeNull();
  expect(model.selected?.id).toBe(first.id);
  expect(close).not.toHaveBeenCalled();
  expect(showCanvas).not.toHaveBeenCalled();
});

it.each(['semantic', 'sql'] as const)(
  'opens the highlighted Model directly in %s without another catalogue click',
  (view) => {
    render();
    act(() => model.open(second.id));
    render({ target: { kind: 'canonical-node', nodeId: first.id } });
    browse(view);
    expect(model.selected?.id).toBe(first.id);
    expect(model.initialView).toBe(view);
    expect(model.active).toBe(true);
    expect(inspect).not.toHaveBeenCalled();
  }
);

it('inspects an explicitly selected Source even when a Model was remembered', () => {
  const resource = { kind: 'canonical-node', nodeId: source.id } as const;
  render();
  act(() => model.open(first.id));
  render({ target: resource });
  browse('sql');
  expect(model.active).toBe(false);
  expect(inspect).toHaveBeenCalledExactlyOnceWith(resource, 'code');
});

it('ignores unavailable catalog callbacks and waits for a new rail click when ready', () => {
  render();
  const stale = store.getState().modelBrowser!;
  render({ nodes: [], unavailable: true });
  expect(store.getState().modelBrowser).toBeNull();
  act(() => stale.onBrowse('sql'));
  render();
  expect(model.selected).toBeNull();
  expect(inspect).not.toHaveBeenCalled();
  browse('sql');
  expect(model.selected?.id).toBe(first.id);
});

it('rejects a remembered identity from another project even when both catalogs contain that id', () => {
  render();
  act(() => model.open(second.id));
  render({ projectId: 'another-project' });
  browse('sql');
  expect(model.selected?.id).toBe(first.id);
});

it('rejects a pending replacement after its owner unmounts', () => {
  render();
  act(() => model.open(second.id));
  const resume = deferReplacement(second.id);
  act(() => model.open(first.id));
  act(() => root.render(null));
  store.setState({ modelTab: null });
  render();
  resume();
  browse('semantic');
  expect(model.selected?.id).toBe(second.id);
});

it('recovers a missing target through the remembered Model, then the first available if removed', () => {
  const missing = { kind: 'canonical-node', nodeId: 'missing' } as const;
  render({ target: missing });
  act(() => model.open(second.id));
  browse('sql');
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('sql');
  render({ nodes: [first], target: missing });
  browse('semantic');
  expect(model.selected?.id).toBe(first.id);
  expect(inspect).not.toHaveBeenCalled();
});

it('retains the current Model until its owner accepts replacement', async () => {
  render();
  act(() => model.open(first.id));
  const resume = deferReplacement();
  browse('sql');
  await act(() => browser.onSelect(second.id));
  expect(model.selected?.id).toBe(first.id);
  expect(model.initialView).toBe('semantic');
  resume();
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('sql');
});

it('opens the next Model in the actual active view after its toolbar changes SQL visibility', async () => {
  render();
  browse('sql');
  registerTab({ onClose: (next) => next?.(), views: tabViews });
  await act(() => browser.onSelect(second.id));
  expect(model.selected?.id).toBe(second.id);
  expect(model.initialView).toBe('semantic');
});

it('rejects obsolete browsing and delayed replacement after a Canvas change', () => {
  render();
  const obsolete = store.getState().modelBrowser!;
  act(() => model.open(first.id));
  const resume = deferReplacement();
  act(() => model.open(second.id, 'sql'));
  render({ canvasId: 'other' });
  act(() => obsolete.onBrowse('sql'));
  resume();
  expect(model.selected).toBeNull();
  expect(browser.mode).toBeNull();
  render();
  act(() => obsolete.onBrowse('sql'));
  expect(browser.mode).toBeNull();
  expect(model.selected).toBeNull();
});

it('keeps resource inspection and SQL capability admission with their existing owner', async () => {
  render({ nodes: [source] });
  browse('sql');
  await act(() => browser.onSelect({ kind: 'canonical-node', nodeId: source.id }));
  expect(model.selected).toBeNull();
  expect(inspect).toHaveBeenCalledExactlyOnceWith(
    { kind: 'canonical-node', nodeId: source.id },
    'code'
  );
});

it('opens the existing occurrence or waits for an explicit context choice without allocating one', async () => {
  const instance = { ...first, id: 'placed', definitionId: first.id };
  render({ nodes: [first, instance] });
  browse('sql');
  expect(model.selected?.id).toBe(instance.id);
  expect(model.initialView).toBe('sql');
  const other = { ...instance, id: 'other-placement', name: 'Other Model block' };
  act(() => model.close());
  render({ nodes: [first, instance, other] });
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
