import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { getPluginPortMap } from '../registry';
import {
  evaluateConnection,
  evaluateConnectionPolicy,
  type PluginPortMap,
} from './ConnectionRules';

function buildNode(
  pluginId: CanonicalNode['pluginId'],
  kind: CanonicalNode['kind'],
  role: CanonicalNode['role']
): CanonicalNode {
  return {
    id: `${pluginId}-${kind}-${role}`,
    name: `${pluginId}-${kind}-${role}`,
    pluginId,
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

describe('evaluateConnection', () => {
  it('evaluates plugin policy independently after topology admission', () => {
    const pluginPortMap = getPluginPortMap();

    const connection = evaluateConnectionPolicy(
      buildNode('dvt.warehouse-source', 'dvt:source', 'input'),
      buildNode('dvt', 'dvt:transform', 'transform'),
      pluginPortMap
    );

    expect(connection).toEqual({ allowed: true });
  });

  it('rejects dbt sources as DVT inputs without changing DVT-local authoring', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToTransform = evaluateConnection(
      buildNode('dbt', 'dvt:source', 'input'),
      buildNode('dvt', 'dvt:transform', 'transform'),
      [],
      pluginPortMap
    );
    const transformToSink = evaluateConnection(
      buildNode('dvt', 'dvt:transform', 'transform'),
      buildNode('dvt', 'dvt:sink', 'output'),
      [],
      pluginPortMap
    );

    expect(sourceToTransform).toEqual({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dbt',
      sourceRole: 'input',
      targetPluginId: 'dvt',
      targetRole: 'transform',
    });
    expect(transformToSink).toEqual({ allowed: true });
  });

  it('allows imported warehouse sources to feed the DVT Transform authoring path', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToTransform = evaluateConnection(
      buildNode('dvt.warehouse-source', 'dvt:source', 'input'),
      buildNode('dvt', 'dvt:transform', 'transform'),
      [],
      pluginPortMap
    );

    expect(sourceToTransform).toEqual({ allowed: true });
  });

  it('allows imported warehouse sources to feed dbt transform nodes', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToModel = evaluateConnection(
      buildNode('dvt.warehouse-source', 'dvt:source', 'input'),
      buildNode('dbt', 'dvt:transform', 'transform'),
      [],
      pluginPortMap
    );
    const sourceToSnapshot = evaluateConnection(
      buildNode('dvt.warehouse-source', 'dvt:source', 'input'),
      buildNode('dbt', 'dbt:snapshot', 'transform'),
      [],
      pluginPortMap
    );

    expect(sourceToModel).toEqual({ allowed: true });
    expect(sourceToSnapshot).toEqual({ allowed: true });
  });

  it('rejects cross-plugin tabular bridges into dbt input resources', () => {
    const pluginPortMap = getPluginPortMap();
    const dvtTransform = buildNode('dvt', 'dvt:transform', 'transform');

    for (const target of [
      buildNode('dbt', 'dvt:source', 'input'),
      buildNode('dbt', 'dbt:seed', 'input'),
    ]) {
      expect(evaluateConnection(dvtTransform, target, [], pluginPortMap)).toEqual({
        allowed: false,
        reasonCode: 'cross_plugin_bridge_missing',
        sourcePluginId: 'dvt',
        sourceRole: 'transform',
        targetPluginId: 'dbt',
        targetRole: 'input',
      });
    }
  });

  it('rejects DVT transforms as dbt model origins without a runtime consumer', () => {
    const pluginPortMap = getPluginPortMap();

    const connection = evaluateConnection(
      buildNode('dvt', 'dvt:transform', 'transform'),
      buildNode('dbt', 'dvt:transform', 'transform'),
      [],
      pluginPortMap
    );

    expect(connection).toEqual({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dvt',
      sourceRole: 'transform',
      targetPluginId: 'dbt',
      targetRole: 'transform',
    });
  });

  it('keeps direct source -> sink blocked when no compatible bridge exists', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToSink = evaluateConnection(
      buildNode('dbt', 'dvt:source', 'input'),
      buildNode('dvt', 'dvt:sink', 'output'),
      [],
      pluginPortMap
    );

    expect(sourceToSink).toEqual({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dbt',
      sourceRole: 'input',
      targetPluginId: 'dvt',
      targetRole: 'output',
    });
  });

  it('keeps imported warehouse source -> sink blocked without a transform bridge', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToSink = evaluateConnection(
      buildNode('dvt.warehouse-source', 'dvt:source', 'input'),
      buildNode('dvt', 'dvt:sink', 'output'),
      [],
      pluginPortMap
    );

    expect(sourceToSink).toEqual({
      allowed: false,
      reasonCode: 'cross_plugin_bridge_missing',
      sourcePluginId: 'dvt.warehouse-source',
      sourceRole: 'input',
      targetPluginId: 'dvt',
      targetRole: 'output',
    });
  });

  it('fails closed when a same-plugin policy is registered without rules', () => {
    const pluginPortMap = new Map([
      [
        'example',
        {
          connectionRules: [],
          produces: [],
          consumes: [],
        },
      ],
    ]) satisfies PluginPortMap;

    const connection = evaluateConnection(
      buildNode('example', 'example:source', 'input'),
      buildNode('example', 'example:model', 'transform'),
      [],
      pluginPortMap
    );

    expect(connection).toEqual({
      allowed: false,
      reasonCode: 'plugin_policy_missing',
      pluginId: 'example',
    });
  });

  it('fails closed when same-plugin rules do not match a proposed edge', () => {
    const pluginPortMap = new Map([
      [
        'example',
        {
          connectionRules: [
            { sourceKind: 'example:seed', targetKind: 'example:model', allowed: true },
          ],
          produces: [],
          consumes: [],
        },
      ],
    ]) satisfies PluginPortMap;

    const connection = evaluateConnection(
      buildNode('example', 'example:source', 'input'),
      buildNode('example', 'example:model', 'transform'),
      [],
      pluginPortMap
    );

    expect(connection).toEqual({
      allowed: false,
      reasonCode: 'plugin_rule_blocked',
    });
  });
});
