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
  it('keeps dbt-owned source rules inside the dbt plugin', () => {
    const rules = dbtContributions.connectionRules ?? [];

    const sourceToModel = evaluatePluginConnectionRules(
      buildNode('dbt:source', 'input'),
      buildNode('dbt:model', 'transform'),
      rules
    );
    const sourceToTest = evaluatePluginConnectionRules(
      buildNode('dbt:source', 'input'),
      buildNode('dbt:test', 'check'),
      rules
    );

    expect(sourceToModel).toEqual({ allowed: true });
    expect(sourceToTest).toEqual({ allowed: true });
  });
});
