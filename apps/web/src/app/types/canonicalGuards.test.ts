import { describe, expect, it } from 'vitest';

import {
  CANONICAL_EDGE_RELATIONS,
  CANONICAL_NODE_STATUSES,
  CORE_NODE_ROLES,
} from './canonical';
import {
  isCanonicalEdgeRelation,
  isCanonicalNodeStatus,
  isCoreNodeRole,
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
});
