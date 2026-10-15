import { describe, expect, it } from 'vitest';

import { WorkspaceGraphAuthoringNodeSchema } from '../src/index.js';

const connectionRef = {
  schemaVersion: 'connection-ref.v1',
  connectionId: 'warehouse-a',
  provider: 'postgres',
};
const node = {
  id: 'sink-a',
  name: 'Sink',
  pluginId: 'dvt',
  kind: 'dvt:sink',
  role: 'output',
  status: 'idle',
  tags: [],
  metadata: {
    config: {
      connectionRef,
      schema: 'analytics',
      table: 'orders',
      materialization: 'table',
      writeMode: 'replace',
    },
  },
};

describe('Sink authoring metadata contract', () => {
  it('retains an explicit PostgreSQL destination', () => {
    expect(WorkspaceGraphAuthoringNodeSchema.parse(node)).toMatchObject(node);
  });
  it('allows incomplete drafts without implicitly assigning a connection', () => {
    expect(WorkspaceGraphAuthoringNodeSchema.parse({ ...node, metadata: {} }).metadata).toEqual({});
  });
  it('rejects a non-PostgreSQL destination', () => {
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...node,
        metadata: {
          config: {
            ...node.metadata.config,
            connectionRef: { ...connectionRef, provider: 'snowflake' },
          },
        },
      }).success
    ).toBe(false);
  });
  it('rejects ephemeral disposition with a durable Transform result target', () => {
    expect(
      WorkspaceGraphAuthoringNodeSchema.safeParse({
        ...node,
        id: 'transform-a',
        kind: 'dvt:transform',
        role: 'transform',
        metadata: {
          config: {
            materialized: 'ephemeral',
            resultTarget: {
              schemaVersion: 'dvt-transform-result-target.v1',
              connectionRef,
              schema: 'analytics',
              relation: 'orders',
            },
          },
        },
      }).success
    ).toBe(false);
  });
});
