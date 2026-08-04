import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluateConnectionPolicy } from '../contracts/ConnectionRules';
import { dbtContributions } from '../dbt/dbtContributions';
import { getAllCanvasRuntimeRegistrations, getPluginPortMap } from '../registry';
import {
  OBJECT_FILE_POSTGRES_PLUGIN_ID,
  objectFilePostgresContributions,
} from './objectFilePostgresContributions';

const objectFileNode: CanonicalNode = {
  id: 'load-orders',
  name: 'Load orders',
  pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
  kind: 'dvt:object_file_load',
  role: 'input',
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
  it('publishes one executable input node kind owned by the plugin', () => {
    expect(objectFilePostgresContributions.nodeKinds).toEqual([
      expect.objectContaining({
        kind: 'dvt:object_file_load',
        pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
        role: 'input',
        previewStepKind: 'LOAD_OBJECT_FILE_TO_POSTGRES',
        allowsIncoming: false,
        allowsOutgoing: true,
      }),
    ]);
  });

  it('composes the node into the DBT canvas without transferring plugin ownership', () => {
    const dbtCanvas = getAllCanvasRuntimeRegistrations().find(
      (registration) => registration.kind === 'dbt'
    );

    expect(dbtCanvas?.nodeKinds).toContainEqual(
      expect.objectContaining({
        kind: 'dvt:object_file_load',
        pluginId: OBJECT_FILE_POSTGRES_PLUGIN_ID,
      })
    );
    expect(dbtContributions.nodeKinds).not.toContainEqual(
      expect.objectContaining({ kind: 'dvt:object_file_load' })
    );
  });

  it('bridges its tabular output to DBT transforms and rejects the reverse direction', () => {
    const ports = getPluginPortMap();

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
});
