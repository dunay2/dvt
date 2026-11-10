// @vitest-environment jsdom
/** Owned concern: prove the existing facade scopes a single Inspector identity without graph writes. */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useCanvasInteractionStore } from '../../stores/canvasInteractionStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useCanvasStoreFacade } from './useCanvasStoreFacade';

const scope = { tenantId: 'tenant-a', projectId: 'project-a', environmentId: 'dev' };
const file = {
  kind: 'dbt-file-model',
  uniqueId: 'model.demo.orders',
  binding: {
    schemaVersion: 'canvas-authoring-authority-binding.v1',
    canvasId: 'files',
    authority: { kind: 'dbt-project-files', projectRoot: 'project' },
  },
} as const;
let current: ReturnType<typeof useCanvasStoreFacade>;
let root: Root;
let container: HTMLDivElement;
function Harness(): null {
  current = useCanvasStoreFacade();
  return null;
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  useSessionStore.setState(scope);
  useCanvasInteractionStore.setState({
    inspectorTarget: null,
    inspectorPreferredTabId: null,
    inspectorPreferredTabRequestId: 0,
    canvasLayouts: {},
    executionSelectionIntent: { mode: 'workspace', nodeIds: [] },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<Harness />));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it('derives canonical IDs only from the one canonical target and keeps file identity separate', () => {
  act(() => {
    current.setInspectorNode('native', 'general');
  });
  expect(current.inspectorNodeId).toBe('native');
  expect(current.inspectorTarget).toEqual({
    kind: 'canonical-node',
    nodeId: 'native',
    workspaceScope: scope,
  });
  act(() => {
    current.setInspectorNode(file, 'code');
  });
  expect(current.inspectorNodeId).toBeNull();
  expect(current.inspectorTarget).toEqual({ ...file, workspaceScope: scope });
  expect(current.persistedNodePositions).toEqual({});
  expect(current.selectedNodeIds).toEqual([]);
  act(() => {
    current.setInspectorNode(null);
  });
  expect(current.inspectorTarget).toBeNull();
});

it('masks foreign targets and rejects an old scope callback before it can replace or clear current inspection', async () => {
  // An awaited editor handoff must not publish A into a newly selected B workspace.
  const oldSetter = current.setInspectorNode;
  act(() => {
    current.setInspectorNode(file);
  });
  await act(async () => {
    useSessionStore.setState({ projectId: 'project-b' });
  });
  expect(current.inspectorTarget).toBeNull();
  expect(current.inspectorNodeId).toBeNull();
  act(() => {
    current.setInspectorNode('current-b', 'columns');
  });
  const accepted = current.inspectorTarget;
  act(() => {
    expect(oldSetter(file, 'code')).toBe(false);
    expect(oldSetter(null)).toBe(false);
  });
  expect(current.inspectorTarget).toBe(accepted);
  expect(current.inspectorNodeId).toBe('current-b');
  expect(current.inspectorPreferredTabId).toBe('columns');
});
