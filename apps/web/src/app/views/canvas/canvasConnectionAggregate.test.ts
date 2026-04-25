import type { Connection, Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import type { PluginPortMap } from '../../plugins/contracts/ConnectionRules';
import type { PluginConnectionRule } from '../../plugins/contracts/PluginManifest';
import type { CanonicalNode } from '../../types/canonical';
import { confirmConnection, confirmReconnect, proposeConnection } from './canvasConnectionAggregate';

function buildCanonicalNode(id: string, role: CanonicalNode['role']): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind: role === 'input' ? 'dvt:source' : role === 'output' ? 'dvt:sink' : 'dvt:transform',
    role,
    status: 'idle',
    tags: [],
  };
}

describe('canvasConnectionAggregate', () => {
  it('rejects incomplete connections before any graph policy runs', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const canonicalNodesById = new Map([[sourceNode.id, sourceNode]]);

    const result = proposeConnection({
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: '',
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [],
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'connection_incomplete' },
    });
  });

  it('rejects connections whose canonical target is missing', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const canonicalNodesById = new Map([[sourceNode.id, sourceNode]]);

    const result = proposeConnection({
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: 'missing-node',
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [],
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'node_not_found_in_graph' },
    });
  });

  it('revalidates and rejects duplicate edges at confirmation time', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const targetNode = buildCanonicalNode('sink-node', 'output');
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const connection: Connection = {
      source: sourceNode.id,
      sourceHandle: null,
      target: targetNode.id,
      targetHandle: null,
    };
    const existingEdges: Edge[] = [
      { id: 'edge-1', source: sourceNode.id, target: targetNode.id },
    ];

    const result = confirmConnection({
      connection,
      canonicalNodesById,
      edges: existingEdges,
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'duplicate_edge' },
    });
  });

  it('rejects self-connections through shell graph invariants', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const canonicalNodesById = new Map([[sourceNode.id, sourceNode]]);

    const result = proposeConnection({
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: sourceNode.id,
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [],
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'self_connection' },
    });
  });

  it('reconnects an edge without replacing its identity and excludes the edited edge from duplicate checks', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const transformNode = buildCanonicalNode('transform-node', 'transform');
    const targetNode = buildCanonicalNode('sink-node', 'output');
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [transformNode.id, transformNode],
      [targetNode.id, targetNode],
    ]);

    const result = confirmReconnect({
      edge: { id: 'edge-1', source: sourceNode.id, target: targetNode.id },
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: transformNode.id,
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [{ id: 'edge-1', source: sourceNode.id, target: targetNode.id }],
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'reconnected',
      nextEdges: [
        {
          id: 'edge-1',
          source: sourceNode.id,
          sourceHandle: null,
          target: transformNode.id,
          targetHandle: null,
        },
      ],
    });
  });

  it('rejects reconnect when another visible edge already uses the candidate connection', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const transformNode = buildCanonicalNode('transform-node', 'transform');
    const targetNode = buildCanonicalNode('sink-node', 'output');
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [transformNode.id, transformNode],
      [targetNode.id, targetNode],
    ]);

    const result = confirmReconnect({
      edge: { id: 'edge-1', source: sourceNode.id, target: targetNode.id },
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: transformNode.id,
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [
        { id: 'edge-1', source: sourceNode.id, target: targetNode.id },
        { id: 'edge-2', source: sourceNode.id, target: transformNode.id },
      ],
      pluginPortMap: new Map(),
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'transformation_duplicate_edge' },
    });
  });

  it('preserves typed plugin-rule rejections without leaking presentation copy', () => {
    const sourceNode = buildCanonicalNode('source-node', 'input');
    const targetNode = {
      ...buildCanonicalNode('sink-node', 'output'),
      kind: 'dvt:restricted-sink' as const,
    };
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const pluginConnectionRule: PluginConnectionRule = {
      sourceKind: 'dvt:source',
      targetKind: 'dvt:restricted-sink',
      allowed: false,
      reason: 'blocked-by-plugin',
    };
    const pluginPortMap: PluginPortMap = new Map([
      [
        'dvt',
        {
          connectionRules: [pluginConnectionRule],
          produces: [],
          consumes: [],
        },
      ],
    ]);

    const result = proposeConnection({
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: targetNode.id,
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [],
      pluginPortMap,
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: { code: 'plugin_rule_blocked', reason: 'blocked-by-plugin' },
    });
  });

  it('preserves typed cross-plugin bridge failures with owner metadata', () => {
    const sourceNode = {
      ...buildCanonicalNode('source-node', 'input'),
      pluginId: 'dbt',
    };
    const targetNode = {
      ...buildCanonicalNode('sink-node', 'output'),
      pluginId: 'monitoring',
    };
    const canonicalNodesById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    const pluginPortMap: PluginPortMap = new Map([
      [
        'dbt',
        {
          connectionRules: [],
          produces: [{ portType: 'data.tabular', forRoles: ['input'] }],
          consumes: [],
        },
      ],
      [
        'monitoring',
        {
          connectionRules: [],
          produces: [],
          consumes: [{ portType: 'data.events', forRoles: ['output'] }],
        },
      ],
    ]);

    const result = proposeConnection({
      connection: {
        source: sourceNode.id,
        sourceHandle: null,
        target: targetNode.id,
        targetHandle: null,
      },
      canonicalNodesById,
      edges: [],
      pluginPortMap,
    });

    expect(result).toEqual({
      outcome: 'rejected',
      rejection: {
        code: 'cross_plugin_bridge_missing',
        sourcePluginId: 'dbt',
        sourceRole: 'input',
        targetPluginId: 'monitoring',
        targetRole: 'output',
      },
    });
  });
});
