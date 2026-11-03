// @vitest-environment jsdom
/** Owned concern: prove guarded handoff between the same file Code and inspector sessions. */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useDbtProjectFileWorkbenchSession } from './useDbtProjectFileWorkbenchSession';

const node: CanonicalNode = {
  id: 'orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:source',
  role: 'input',
  status: 'idle',
  tags: [],
};
const setInspectorNode = vi.fn();
const showInspectorPanel = vi.fn();
const hideInspectorPanel = vi.fn();
let session: ReturnType<typeof useDbtProjectFileWorkbenchSession>;
let root: Root;
let container: HTMLDivElement;
function Harness(): null {
  session = useDbtProjectFileWorkbenchSession({
    nodesById: new Map([[node.id, node]]),
    setInspectorNode,
    showInspectorPanel,
    hideInspectorPanel,
  });
  return null;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
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

it('flushes both editors before opening a known resource and closes project Code', async () => {
  const nodeFlush = vi.fn(async () => true);
  const projectFlush = vi.fn(async () => true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush: nodeFlush } });
  Object.assign(session.projectCodeEditorRef, { current: { flush: projectFlush } });
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  expect(session.projectCodeWorkbenchOpen).toBe(true);
  nodeFlush.mockClear();
  await act(async () => {
    await session.openNodeWorkbench(node.id, 'columns');
  });
  expect(nodeFlush).toHaveBeenCalledOnce();
  expect(projectFlush).toHaveBeenCalledOnce();
  expect(nodeFlush.mock.invocationCallOrder[0]).toBeLessThan(
    projectFlush.mock.invocationCallOrder[0]!
  );
  expect(setInspectorNode).toHaveBeenCalledExactlyOnceWith(node.id, 'columns');
  expect(showInspectorPanel).toHaveBeenCalledOnce();
  expect(session.projectCodeWorkbenchOpen).toBe(false);
});

it.each(['node', 'project'])(
  'keeps inspection unchanged when the %s editor refuses handoff',
  async (refused) => {
    const nodeFlush = vi.fn(async () => refused !== 'node');
    const projectFlush = vi.fn(async () => refused !== 'project');
    Object.assign(session.nodeCodeEditorRef, { current: { flush: nodeFlush } });
    Object.assign(session.projectCodeEditorRef, { current: { flush: projectFlush } });
    await act(async () => {
      await session.openNodeWorkbench(node.id);
    });
    expect(setInspectorNode).not.toHaveBeenCalled();
    expect(showInspectorPanel).not.toHaveBeenCalled();
    expect(projectFlush).toHaveBeenCalledTimes(refused === 'node' ? 0 : 1);
  }
);

it('rejects an unknown identity before touching editors', async () => {
  const flush = vi.fn(async () => true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush } });
  await act(async () => {
    await session.openNodeWorkbench('other-project-node');
  });
  expect(flush).not.toHaveBeenCalled();
  expect(setInspectorNode).not.toHaveBeenCalled();
});

it('retains the requested file when already open and accepts an explicit new selection', async () => {
  await act(async () => {
    await session.openProjectCode('models/orders.sql');
  });
  await act(async () => {
    await session.openProjectCode();
  });
  expect(session.projectCodeFileSelectionRequest).toEqual({ path: 'models/orders.sql' });
  await act(async () => {
    await session.openProjectCode('models/customers.sql');
  });
  expect(session.projectCodeFileSelectionRequest).toEqual({ path: 'models/customers.sql' });
  act(() => session.closeCodeWorkbench());
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  await act(async () => {
    await session.openProjectCode();
  });
  expect(session.projectCodeFileSelectionRequest).toBeUndefined();
});

it('retains the inspector and rejects project Code while node flush is refused', async () => {
  const flush = vi
    .fn()
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(false)
    .mockResolvedValueOnce(true);
  Object.assign(session.nodeCodeEditorRef, { current: { flush } });
  await act(async () => {
    expect(await session.openProjectCode()).toBe(false);
  });
  expect(session.projectCodeWorkbenchOpen).toBe(false);
  await act(async () => {
    await session.closeNodeWorkbench();
  });
  expect(hideInspectorPanel).not.toHaveBeenCalled();
  await act(async () => {
    await session.closeNodeWorkbench();
  });
  expect(hideInspectorPanel).toHaveBeenCalledOnce();
});
