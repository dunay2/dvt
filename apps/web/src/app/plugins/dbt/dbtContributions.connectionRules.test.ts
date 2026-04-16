import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluatePluginConnectionRules } from '../contracts/ConnectionRules';
import { dbtContributions } from './dbtContributions';

function buildNode(kind: `${string}:${string}`, role: CanonicalNode['role']): CanonicalNode {
  return {
    id: `${kind}-${role}`,
    name: `${kind}-${role}`,
    pluginId: 'dbt',
    kind,
    role,
    status: 'idle',
    tags: [],
  };
}

describe('dbtContributions connection rules', () => {
  it('allows source -> sql_transform and sql_transform -> sink for canvas authoring', () => {
    const rules = dbtContributions.connectionRules ?? [];

    const sourceToTransform = evaluatePluginConnectionRules(
      buildNode('dbt:source', 'input'),
      buildNode('dvt:sql_transform', 'transform'),
      rules
    );
    const transformToSink = evaluatePluginConnectionRules(
      buildNode('dvt:sql_transform', 'transform'),
      buildNode('dvt:sink', 'output'),
      rules
    );

    expect(sourceToTransform).toEqual({ allowed: true });
    expect(transformToSink).toEqual({ allowed: true });
  });
});
