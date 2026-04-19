import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { getPluginPortMap } from '../registry';
import { evaluateConnection } from './ConnectionRules';

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
  it('allows the dbt source -> dvt sql_transform -> dvt sink authoring path', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToTransform = evaluateConnection(
      buildNode('dbt', 'dbt:source', 'input'),
      buildNode('dvt', 'dvt:sql_transform', 'transform'),
      [],
      pluginPortMap
    );
    const transformToSink = evaluateConnection(
      buildNode('dvt', 'dvt:sql_transform', 'transform'),
      buildNode('dvt', 'dvt:sink', 'output'),
      [],
      pluginPortMap
    );

    expect(sourceToTransform).toEqual({ allowed: true });
    expect(transformToSink).toEqual({ allowed: true });
  });

  it('keeps direct source -> sink blocked when no compatible bridge exists', () => {
    const pluginPortMap = getPluginPortMap();

    const sourceToSink = evaluateConnection(
      buildNode('dbt', 'dbt:source', 'input'),
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
});
