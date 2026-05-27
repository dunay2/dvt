import { describe, expect, it, vi } from 'vitest';

import { buildCanvasWorkspaceResourceGroups } from './canvasWorkspaceExplorerModel';
import type { CanonicalNode } from '../types/canonical';

const mockResolveNodeKindRegistration = vi.hoisted(() => vi.fn());

vi.mock('../plugins/nodeTypeRegistry', () => ({
  resolveNodeKindRegistration: mockResolveNodeKindRegistration,
}));

function buildNode(overrides?: Partial<CanonicalNode>): CanonicalNode {
  return {
    id: 'node.orders',
    name: 'orders',
    pluginId: 'dbt',
    kind: 'dbt:model',
    role: 'transform',
    status: 'idle',
    tags: [],
    metadata: {
      package: 'analytics',
    },
    ...overrides,
  };
}

describe('buildCanvasWorkspaceResourceGroups', () => {
  it('projects canonical nodes into existing project resource groups', () => {
    const icon = vi.fn();
    mockResolveNodeKindRegistration.mockImplementation((kind: string) => ({
      label: kind === 'dbt:source' ? 'Source' : 'Model',
      minimapColor: kind === 'dbt:source' ? '#a855f7' : '#22c55e',
      icon,
    }));

    const groups = buildCanvasWorkspaceResourceGroups({
      nodes: [
        buildNode({ id: 'node.model', name: 'orders_model' }),
        buildNode({ id: 'node.source', name: 'raw_orders', kind: 'dbt:source', role: 'input' }),
      ],
    });

    expect(groups.map((group) => group.label)).toEqual(['Model', 'Source']);
    expect(groups[0]).toMatchObject({
      id: 'dbt:model',
      label: 'Model',
      color: '#22c55e',
    });
    expect(groups[0]?.resources[0]).toMatchObject({
      id: 'node.model',
      label: 'orders_model',
      badge: 'analytics',
      resourceType: 'canvas_node',
      status: 'idle',
    });
    expect(groups[0]?.resources[0]?.dragPayload).toEqual(
      expect.objectContaining({ id: 'node.model' })
    );
  });

  it('includes the active canvas as an existing non-node project resource', () => {
    mockResolveNodeKindRegistration.mockImplementation(() => ({
      label: 'Model',
      minimapColor: '#22c55e',
      icon: vi.fn(),
    }));

    const groups = buildCanvasWorkspaceResourceGroups({
      nodes: [],
      canvasDocument: {
        kind: 'transformation',
        title: 'Transformation canvas',
      },
    });

    expect(groups[0]).toMatchObject({
      id: 'canvas',
      label: 'Canvases',
      color: '#38bdf8',
    });
    expect(groups[0]?.resources[0]).toMatchObject({
      id: 'canvas:transformation',
      label: 'Transformation canvas',
      resourceType: 'canvas',
      badge: 'canvas',
      detail: 'transformation',
    });
    expect(groups[0]?.resources[0]?.dragPayload).toBeUndefined();
  });
});
