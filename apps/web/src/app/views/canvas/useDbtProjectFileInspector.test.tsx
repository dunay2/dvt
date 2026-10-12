// @vitest-environment jsdom
/**
Owned concern: prove file repair continuity without retaining graph or execution authority.
@baseline InspectCanvasNode: an invalid analysis is not a confirmed file deletion.
@decision Exercise fresh, unavailable, removed, closed and cross-authority transitions.
@consequence Only the same previously admitted file inspector may survive analysis failure.
@version 1.0.0
 */
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanonicalNode } from '../../types/canonical';
import { useDbtProjectFileInspector } from './useDbtProjectFileInspector';

const FILE_NODE: CanonicalNode = {
  id: 'model.orders',
  name: 'Orders',
  pluginId: 'dvt',
  kind: 'dvt:transform',
  role: 'transform',
  status: 'idle',
  tags: [],
  path: 'models/orders.sql',
};
const OPTIONS = {
  authorityKey: 'workspace/project/canvas/files',
  inspectorNodeId: FILE_NODE.id as string | null,
  inspectorVisible: true,
  analysisFresh: true,
  nodesById: new Map([[FILE_NODE.id, FILE_NODE]]) as ReadonlyMap<string, CanonicalNode>,
};
type Options = Parameters<typeof useDbtProjectFileInspector>[0];
let root: Root;
let container: HTMLDivElement;
let latest: CanonicalNode | null;

function Harness({ options }: Readonly<{ options: Options }>): null {
  latest = useDbtProjectFileInspector(options);
  return null;
}
function render(options: Options): void {
  act(() => root.render(<Harness options={options} />));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  latest = null;
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe('scoped file inspector continuity', () => {
  it('retains the admitted file during unavailable analysis and consumes the repaired projection', () => {
    render(OPTIONS);
    expect(latest).toBe(FILE_NODE);
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBe(FILE_NODE);
    const repaired = { ...FILE_NODE, description: 'Fresh repaired projection' };
    render({ ...OPTIONS, nodesById: new Map([[repaired.id, repaired]]) });
    expect(latest).toBe(repaired);
  });
  it.each([
    { authorityKey: 'different-authority' },
    { inspectorNodeId: 'different-node' },
    { inspectorNodeId: null },
  ])('does not transfer the retained editor to %j', (change) => {
    render(OPTIONS);
    render({ ...OPTIONS, ...change, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
  });
  it('discards a fresh confirmed removal and cannot resurrect it on later failure', () => {
    render(OPTIONS);
    render({ ...OPTIONS, nodesById: new Map() });
    expect(latest).toBeNull();
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
  });
  it('discards the snapshot on real Close even when the node ID is retained', () => {
    render(OPTIONS);
    render({ ...OPTIONS, inspectorVisible: false, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
  });
  it('does not fabricate an editor without a previously admitted file', () => {
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
    const native = { ...FILE_NODE, path: undefined };
    render({ ...OPTIONS, nodesById: new Map([[native.id, native]]) });
    expect(latest).toBe(native);
    render({ ...OPTIONS, analysisFresh: false, nodesById: new Map() });
    expect(latest).toBeNull();
  });
});
