import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE,
  WorkspaceGraphAuthoringCommandSchema,
  WorkspaceGraphAuthoringDraftSchema,
} from '../src/index.js';

const target = {
  schemaVersion: 'dvt-transform-result-target.v1',
  connectionRef: {
    schemaVersion: 'connection-ref.v1',
    connectionId: 'warehouse-a',
    provider: 'postgres',
  },
  schema: 'analytics',
  relation: 'orders_enriched',
};

describe.each(['transform', 'dvt:transform'])('%s explicit result destination', (kind) => {
  const node = {
    id: 'transform-1',
    name: 'Orders',
    pluginId: 'dvt',
    kind,
    role: 'transform',
    status: 'idle',
    tags: [],
  };
  const graph = {
    canvas: { kind: 'transformation', title: 'Sales' },
    nodeIds: [node.id],
    nodePositions: { [node.id]: { x: 0, y: 0 } },
    nodes: [node],
    edges: [],
  };

  it.each([{}, { materialized: 'table' }, { materialized: 'view', resultTarget: target }])(
    'roundtrips configured or unconfigured destinations without defaults: %j',
    (config) => {
      const draft = { ...graph, nodes: [{ ...node, metadata: { config } }] };
      expect(WorkspaceGraphAuthoringDraftSchema.parse(draft)).toEqual(draft);
    }
  );

  it.each([
    null,
    {},
    false,
    { ...target, schemaVersion: 'v2' },
    { ...target, schema: '' },
    { ...target, relation: ' orders ' },
    { ...target, relation: 'é'.repeat(32) },
    { ...target, relation: 'orders\u0000' },
    { ...target, connectionRef: { ...target.connectionRef, provider: 'snowflake' } },
    { ...target, connectionRef: { ...target.connectionRef, connectionId: ' ' } },
    { ...target, connectionRef: { ...target.connectionRef, password: 'forbidden' } },
    { ...target, password: 'forbidden' },
  ])('rejects malformed targets at both graph and command boundaries: %j', (resultTarget) => {
    const metadata = { config: { resultTarget } };
    expect(
      WorkspaceGraphAuthoringDraftSchema.safeParse({
        ...graph,
        nodes: [{ ...node, metadata }],
      }).success
    ).toBe(false);
    expect(
      WorkspaceGraphAuthoringCommandSchema.safeParse({
        type: WORKSPACE_GRAPH_AUTHORING_COMMAND_TYPE.updateNode,
        nodeId: node.id,
        patch: { pluginId: node.pluginId, kind, metadata },
      }).success
    ).toBe(false);
  });

  it('does not reinterpret another plugin metadata', () => {
    const draft = {
      ...graph,
      nodes: [{ ...node, pluginId: 'dbt', metadata: { config: { resultTarget: null } } }],
    };
    expect(WorkspaceGraphAuthoringDraftSchema.parse(draft)).toEqual(draft);
  });
});
