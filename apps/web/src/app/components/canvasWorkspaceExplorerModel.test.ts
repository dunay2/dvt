import { describe, expect, it, vi } from 'vitest';

import {
  buildCanvasWorkspaceResourceGroups,
  parseCanvasWorkspaceResourceDragPayload,
} from './canvasWorkspaceExplorerModel';
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

  it('lists all project canvases and marks the active worksheet', () => {
    mockResolveNodeKindRegistration.mockImplementation(() => ({
      label: 'Model',
      minimapColor: '#22c55e',
      icon: vi.fn(),
    }));

    const groups = buildCanvasWorkspaceResourceGroups({
      nodes: [],
      activeCanvasId: 'canvas-modeling',
      canvasDocuments: [
        {
          id: 'canvas-ingest',
          kind: 'transformation',
          title: 'Ingest',
        },
        {
          id: 'canvas-modeling',
          kind: 'transformation',
          title: 'Modeling',
        },
      ],
    });

    expect(groups[0]).toMatchObject({
      id: 'canvas',
      label: 'Canvases',
    });
    expect(groups[0]?.resources).toEqual([
      expect.objectContaining({
        id: 'canvas:canvas-ingest',
        label: 'Ingest',
        isActive: false,
      }),
      expect.objectContaining({
        id: 'canvas:canvas-modeling',
        label: 'Modeling',
        isActive: true,
      }),
    ]);
  });

  it('projects schemas as existing project resources that can be attached to cards', () => {
    mockResolveNodeKindRegistration.mockImplementation(() => ({
      label: 'Model',
      minimapColor: '#22c55e',
      icon: vi.fn(),
    }));

    const groups = buildCanvasWorkspaceResourceGroups({
      nodes: [
        buildNode({
          id: 'node.raw.orders',
          name: 'raw_orders',
          metadata: {
            package: 'analytics',
            config: {
              schema: 'raw',
            },
          },
        }),
        buildNode({
          id: 'node.mart.orders',
          name: 'mart_orders',
          metadata: {
            package: 'analytics',
            dbt: {
              schemaName: 'mart',
            },
          },
        }),
      ],
    });

    const schemaGroup = groups.find((group) => group.id === 'schemas');

    expect(schemaGroup).toMatchObject({
      id: 'schemas',
      label: 'Schemas',
    });
    expect(schemaGroup?.resources).toEqual([
      expect.objectContaining({
        id: 'schema:mart',
        label: 'mart',
        resourceType: 'schema',
        badge: 'schema',
        detail: '1 node',
        projectResourceDragPayload: {
          resourceId: 'schema:mart',
          resourceType: 'schema',
          schemaName: 'mart',
          label: 'mart',
        },
      }),
      expect.objectContaining({
        id: 'schema:raw',
        label: 'raw',
        resourceType: 'schema',
        badge: 'schema',
        detail: '1 node',
        projectResourceDragPayload: {
          resourceId: 'schema:raw',
          resourceType: 'schema',
          schemaName: 'raw',
          label: 'raw',
        },
      }),
    ]);
    expect(schemaGroup?.resources[0]?.dragPayload).toBeUndefined();
    expect(
      parseCanvasWorkspaceResourceDragPayload(
        JSON.stringify(schemaGroup?.resources[0]?.projectResourceDragPayload)
      )
    ).toEqual({
      resourceId: 'schema:mart',
      resourceType: 'schema',
      schemaName: 'mart',
      label: 'mart',
    });
    expect(parseCanvasWorkspaceResourceDragPayload('{')).toBeNull();
  });
});
