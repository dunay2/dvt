import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluateConnectionPolicy } from '../contracts/ConnectionRules';
import { getAllNodeKinds, getPluginPortMap } from '../registry';
import {
  OBJECT_FILE_POSTGRES_PLUGIN_ID,
  objectFilePostgresContributions,
} from './objectFilePostgresContributions';

const objectFileNode: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders',
  pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
  kind: 'dvt:object_file_load',
  role: 'transform',
  status: 'idle',
  tags: [],
};

const dbtModelNode: CanonicalNode = {
  id: 'model-orders',
  name: 'Orders',
  pluginId: 'dbt',
  kind: 'dbt:model',
  role: 'transform',
  status: 'idle',
  tags: [],
};

describe('object-file PostgreSQL plugin contributions', () => {
  const availableCapabilities = {
    plugins: {
      [OBJECT_FILE_POSTGRES_PLUGIN_ID]: { available: true },
    },
  } as const;

  it('publishes one executable artifact-to-tabular transform kind owned by the plugin', () => {
    expect(objectFilePostgresContributions.backendPluginId).toBe(OBJECT_FILE_POSTGRES_PLUGIN_ID);
    expect(objectFilePostgresContributions.nodeKinds).toEqual([
      expect.objectContaining({
        kind: 'dvt:object_file_load',
        pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
        role: 'transform',
        allowsIncoming: true,
        allowsOutgoing: true,
      }),
    ]);
    expect(
      getAllNodeKinds(availableCapabilities).some(
        (kind) =>
          kind.kind === 'dvt:object_file_load' && kind.pluginId === OBJECT_FILE_POSTGRES_PLUGIN_ID
      )
    ).toBe(true);
  });

  it('removes the executable node kind when the backend capability is unavailable', () => {
    const nodeKinds = getAllNodeKinds({
      plugins: {
        [OBJECT_FILE_POSTGRES_PLUGIN_ID]: {
          available: false,
          reason: 'disabled in test',
        },
      },
    });

    expect(nodeKinds).not.toContainEqual(
      expect.objectContaining({ pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID })
    );
  });

  it('bridges its tabular output to DBT transforms and rejects the reverse direction', () => {
    const ports = getPluginPortMap(availableCapabilities);

    expect(evaluateConnectionPolicy(objectFileNode, dbtModelNode, ports)).toEqual({
      allowed: true,
    });
    expect(evaluateConnectionPolicy(dbtModelNode, objectFileNode, ports)).toEqual(
      expect.objectContaining({
        allowed: false,
        reasonCode: 'cross_plugin_bridge_missing',
      })
    );
  });

  it('rejects object-file to object-file edges through its registered plugin policy', () => {
    const anotherObjectFileNode: CanonicalNode = {
      ...objectFileNode,
      id: 'load-customers',
      name: 'Load customers',
    };

    expect(
      evaluateConnectionPolicy(
        objectFileNode,
        anotherObjectFileNode,
        getPluginPortMap(availableCapabilities)
      )
    ).toEqual({
      allowed: false,
      reasonCode: 'plugin_rule_blocked',
      reason: 'Object-file loads do not accept incoming object-file load edges',
    });
  });
});
