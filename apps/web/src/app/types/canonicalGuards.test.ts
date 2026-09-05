import { describe, expect, it } from 'vitest';

import { CANONICAL_EDGE_RELATIONS, CANONICAL_NODE_STATUSES, CORE_NODE_ROLES } from './canonical';
import {
  isPluginNodeKind,
  isCanonicalEdgeRelation,
  isCanonicalNodeStatus,
  isCoreNodeRole,
  parsePluginNodeKind,
} from './canonicalGuards';

describe('canonicalGuards', () => {
  it('accepts exactly the exported canonical role vocabulary', () => {
    expect(CORE_NODE_ROLES.every(isCoreNodeRole)).toBe(true);
    expect(isCoreNodeRole('not-a-role')).toBe(false);
  });

  it('accepts exactly the exported canonical node status vocabulary', () => {
    expect(CANONICAL_NODE_STATUSES.every(isCanonicalNodeStatus)).toBe(true);
    expect(isCanonicalNodeStatus('paused')).toBe(false);
  });

  it('accepts exactly the exported canonical edge relation vocabulary', () => {
    expect(CANONICAL_EDGE_RELATIONS.every(isCanonicalEdgeRelation)).toBe(true);
    expect(isCanonicalEdgeRelation('teleport')).toBe(false);
  });

  it('parses plugin node kinds through one canonical helper', () => {
    expect(isPluginNodeKind('dvt:transform')).toBe(true);
    expect(parsePluginNodeKind('dvt:transform')).toEqual({
      pluginId: 'dvt',
      nodeKind: 'transform',
    });
  });

  it('rejects plugin node kinds without exactly one populated separator', () => {
    expect(isPluginNodeKind('dbt')).toBe(false);
    expect(isPluginNodeKind('dbt:')).toBe(false);
    expect(isPluginNodeKind(':model')).toBe(false);
    expect(isPluginNodeKind('dvt:transform:extra')).toBe(false);
  });
});
