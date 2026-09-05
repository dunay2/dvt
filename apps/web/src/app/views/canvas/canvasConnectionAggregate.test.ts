import type { Connection, Edge } from '@xyflow/react';
import { describe, expect, it } from 'vitest';

import { getPluginPortMap } from '../../plugins/registry';
import type { CanonicalNode } from '../../types/canonical';
import { createConnection, proposeConnection } from './canvasConnectionAggregate';

function node(
  id: string,
  role: CanonicalNode['role'],
  kind?: CanonicalNode['kind']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dvt',
    kind:
      kind ?? (role === 'input' ? 'dvt:source' : role === 'output' ? 'dvt:sink' : 'dvt:transform'),
    role,
    status: 'idle',
    tags: [],
  };
}

function dbtNode(
  id: string,
  role: CanonicalNode['role'],
  kind: CanonicalNode['kind']
): CanonicalNode {
  return {
    id,
    name: id,
    pluginId: 'dbt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

function link(source: string, target: string): Connection {
  return { source, sourceHandle: null, target, targetHandle: null };
}

function byId(nodes: readonly CanonicalNode[]): Map<string, CanonicalNode> {
  return new Map(nodes.map((candidate) => [candidate.id, candidate]));
}

describe('canvasConnectionAggregate', () => {
  it('rejects incomplete and missing-node connections before edge creation', () => {
    const source = node('source-node', 'input');

    expect(
      proposeConnection({
        connection: { source: source.id, sourceHandle: null, target: '', targetHandle: null },
        canonicalNodesById: byId([source]),
        edges: [],
        pluginPortMap: new Map(),
      })
    ).toEqual({ outcome: 'rejected', rejection: { code: 'connection_incomplete' } });

    expect(
      proposeConnection({
        connection: link(source.id, 'missing-node'),
        canonicalNodesById: byId([source]),
        edges: [],
        pluginPortMap: new Map(),
      })
    ).toEqual({ outcome: 'rejected', rejection: { code: 'node_not_found_in_graph' } });
  });

  it('allows realistic dbt authoring graph connections through registered plugin policy', () => {
    const source = dbtNode('source-node', 'input', 'dvt:source');
    const firstModel = dbtNode('first-model', 'transform', 'dvt:transform');
    const secondModel = dbtNode('second-model', 'transform', 'dvt:transform');
    const modelTest = dbtNode('model-test', 'check', 'dbt:test');
    const exposure = dbtNode('exposure', 'output', 'dbt:exposure');
    const canonicalNodesById = byId([source, firstModel, secondModel, modelTest, exposure]);
    const pluginPortMap = getPluginPortMap();

    expect(
      proposeConnection({
        connection: link(source.id, firstModel.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'source' });

    expect(
      proposeConnection({
        connection: link(firstModel.id, secondModel.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'ref' });

    expect(
      proposeConnection({
        connection: link(firstModel.id, modelTest.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'test' });

    expect(
      proposeConnection({
        connection: link(firstModel.id, exposure.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'exposure' });
  });

  it('allows dbt input resources to connect to dbt tests through plugin rules', () => {
    const source = dbtNode('source-node', 'input', 'dvt:source');
    const seed = dbtNode('seed-node', 'input', 'dbt:seed');
    const sourceTest = dbtNode('source-test', 'check', 'dbt:test');
    const seedTest = dbtNode('seed-test', 'check', 'dbt:test');
    const canonicalNodesById = byId([source, seed, sourceTest, seedTest]);
    const pluginPortMap = getPluginPortMap();

    expect(
      proposeConnection({
        connection: link(source.id, sourceTest.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'test' });

    expect(
      proposeConnection({
        connection: link(seed.id, seedTest.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toMatchObject({ outcome: 'allowed', edgeType: 'test' });
  });

  it('rejects same-plugin authoring connections when the plugin policy is unavailable', () => {
    const firstModel = dbtNode('first-model', 'transform', 'dvt:transform');
    const secondModel = dbtNode('second-model', 'transform', 'dvt:transform');

    expect(
      proposeConnection({
        connection: link(firstModel.id, secondModel.id),
        canonicalNodesById: byId([firstModel, secondModel]),
        edges: [],
        pluginPortMap: new Map(),
      })
    ).toEqual({
      outcome: 'rejected',
      rejection: { code: 'plugin_policy_missing', pluginId: 'dbt' },
    });
  });

  it('rejects cross-plugin bridges into input nodes before evaluating tabular ports', () => {
    const dvtTransform = node('dvt-transform', 'transform', 'dvt:transform');
    const dbtSource = dbtNode('dbt-source', 'input', 'dvt:source');

    expect(
      proposeConnection({
        connection: link(dvtTransform.id, dbtSource.id),
        canonicalNodesById: byId([dvtTransform, dbtSource]),
        edges: [],
        pluginPortMap: getPluginPortMap(),
      })
    ).toEqual({
      outcome: 'rejected',
      rejection: {
        code: 'cross_plugin_bridge_missing',
        sourcePluginId: 'dvt',
        sourceRole: 'transform',
        targetPluginId: 'dbt',
        targetRole: 'input',
      },
    });
  });

  it('rejects policy-incompatible, duplicate, self, and cyclic edges', () => {
    const source = node('source-node', 'input', 'warehouse:source');
    const sink = node('sink-node', 'output', 'dvt:sink');
    const firstModel = node('first-model', 'transform');
    const secondModel = node('second-model', 'transform');
    const canonicalNodesById = byId([source, sink, firstModel, secondModel]);
    const duplicateEdges: Edge[] = [{ id: 'edge-1', source: source.id, target: firstModel.id }];
    const pluginPortMap = getPluginPortMap();

    expect(
      proposeConnection({
        connection: link(source.id, sink.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toEqual({
      outcome: 'rejected',
      rejection: {
        code: 'plugin_rule_blocked',
        reason: 'Connection not permitted by DVT authoring rules',
      },
    });

    expect(
      createConnection({
        connection: link(source.id, firstModel.id),
        canonicalNodesById,
        edges: duplicateEdges,
        pluginPortMap,
      })
    ).toEqual({ outcome: 'rejected', rejection: { code: 'duplicate_edge' } });

    expect(
      proposeConnection({
        connection: link(source.id, source.id),
        canonicalNodesById,
        edges: [],
        pluginPortMap,
      })
    ).toEqual({ outcome: 'rejected', rejection: { code: 'self_connection' } });

    expect(
      proposeConnection({
        connection: link(firstModel.id, secondModel.id),
        canonicalNodesById,
        edges: [{ id: 'edge-2', source: secondModel.id, target: firstModel.id }],
        pluginPortMap,
      })
    ).toEqual({ outcome: 'rejected', rejection: { code: 'cycle_detected' } });
  });
});
