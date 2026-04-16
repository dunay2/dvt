import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluatePluginConnectionRules } from '../contracts/ConnectionRules';
import { dvtContributions } from './dvtContributions';

function buildNode(kind: `${string}:${string}`, role: CanonicalNode['role']): CanonicalNode {
  return {
    id: `${kind}-${role}`,
    name: `${kind}-${role}`,
    pluginId: 'dvt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

describe('dvtContributions connection rules', () => {
  it('allows sql_transform -> sink inside the dvt plugin', () => {
    const rules = dvtContributions.connectionRules ?? [];

    const transformToSink = evaluatePluginConnectionRules(
      buildNode('dvt:sql_transform', 'transform'),
      buildNode('dvt:sink', 'output'),
      rules
    );

    expect(transformToSink).toEqual({ allowed: true });
  });

  it('fails closed for unsupported dvt intra-plugin edges', () => {
    const rules = dvtContributions.connectionRules ?? [];

    const transformToTransform = evaluatePluginConnectionRules(
      buildNode('dvt:sql_transform', 'transform'),
      buildNode('dvt:sql_transform', 'transform'),
      rules
    );

    expect(transformToTransform).toEqual({
      allowed: false,
      reason: 'Connection not permitted by DVT authoring rules',
    });
  });
});
