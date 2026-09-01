import { describe, expect, it } from 'vitest';

import type { CanonicalNode } from '../../types/canonical';
import { evaluatePluginConnectionRules } from '../contracts/ConnectionRules';
import { getPluginPortMap } from '../registry';
import { dvtContributions } from './dvtContributions';
import { DVT_AUTHORING_NODE_KINDS } from './dvtNodeTypeCatalog';

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
  const dvtMatrix = [
    ['dvt:source', 'input', 'dvt:source', 'input', false],
    ['dvt:source', 'input', 'dvt:transform', 'transform', true],
    ['dvt:source', 'input', 'dvt:sink', 'output', false],
    ['dvt:transform', 'transform', 'dvt:source', 'input', false],
    ['dvt:transform', 'transform', 'dvt:transform', 'transform', false],
    ['dvt:transform', 'transform', 'dvt:sink', 'output', true],
    ['dvt:sink', 'output', 'dvt:source', 'input', false],
    ['dvt:sink', 'output', 'dvt:transform', 'transform', false],
    ['dvt:sink', 'output', 'dvt:sink', 'output', false],
  ] as const satisfies readonly (readonly [
    `${string}:${string}`,
    CanonicalNode['role'],
    `${string}:${string}`,
    CanonicalNode['role'],
    boolean,
  ])[];

  it.each(dvtMatrix)(
    'admits %s (%s) -> %s (%s) exactly when declared',
    (sourceKind, sourceRole, targetKind, targetRole, expectedAllowed) => {
      const result = evaluatePluginConnectionRules(
        buildNode(sourceKind, sourceRole),
        buildNode(targetKind, targetRole),
        dvtContributions.connectionRules ?? []
      );

      expect(result.allowed).toBe(expectedAllowed);
      if (!expectedAllowed) {
        expect(result).toEqual(
          expect.objectContaining({ allowed: false, reasonCode: 'plugin_rule_blocked' })
        );
      }
    }
  );

  it('renders an incoming or outgoing handle exactly when the matrix has a valid peer', () => {
    const rules = dvtContributions.connectionRules ?? [];

    for (const registration of DVT_AUTHORING_NODE_KINDS) {
      const node = buildNode(registration.kind, registration.role);
      const hasIncomingPeer = DVT_AUTHORING_NODE_KINDS.some(
        (source) =>
          evaluatePluginConnectionRules(buildNode(source.kind, source.role), node, rules).allowed
      );
      const hasOutgoingPeer = DVT_AUTHORING_NODE_KINDS.some(
        (target) =>
          evaluatePluginConnectionRules(node, buildNode(target.kind, target.role), rules).allowed
      );

      expect(registration.allowsIncoming, `${registration.kind} incoming handle`).toBe(
        hasIncomingPeer
      );
      expect(registration.allowsOutgoing, `${registration.kind} outgoing handle`).toBe(
        hasOutgoingPeer
      );
    }
  });

  it('registers imported warehouse source nodes as tabular input producers', () => {
    expect(getPluginPortMap().get('dvt.warehouse-source')).toEqual({
      connectionRules: [],
      produces: [{ portType: 'data.tabular', forRoles: ['input'] }],
      consumes: [],
    });
  });
});
