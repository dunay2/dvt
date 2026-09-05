import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluatePluginConnectionRules } from '../contracts/ConnectionRules';
import { DBT_NODE_KINDS } from '../nodeTypeCatalog.dbt';
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
  const allowedPairs = new Set([
    ...DBT_NODE_KINDS.map(({ kind }) => `dbt:macro->${kind}`),
    'dvt:source->dvt:transform',
    'dvt:source->dbt:test',
    'dbt:seed->dvt:transform',
    'dbt:seed->dbt:test',
    'dvt:transform->dvt:transform',
    'dvt:transform->dbt:test',
    'dvt:transform->dbt:snapshot',
    'dvt:transform->dbt:exposure',
    'dvt:transform->dbt:metric',
    'dbt:snapshot->dvt:transform',
    'dbt:snapshot->dbt:test',
  ]);
  const connectionMatrix = DBT_NODE_KINDS.flatMap((source) =>
    DBT_NODE_KINDS.map((target) => ({
      source,
      target,
      pair: `${source.kind}->${target.kind}`,
    }))
  );

  it.each(connectionMatrix)(
    'evaluates the declared policy for $pair',
    ({ source, target, pair }) => {
      const result = evaluatePluginConnectionRules(
        buildNode(source.kind, source.role),
        buildNode(target.kind, target.role),
        dbtContributions.connectionRules ?? []
      );

      if (allowedPairs.has(pair)) {
        expect(result).toEqual({ allowed: true });
        return;
      }

      expect(result).toMatchObject({ allowed: false, reasonCode: 'plugin_rule_blocked' });
    }
  );
});
