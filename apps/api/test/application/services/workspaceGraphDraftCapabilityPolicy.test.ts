import { describe, expect, it } from 'vitest';

import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY,
  buildWorkspaceGraphDraftCapabilityFromPolicy,
  buildWorkspaceGraphDraftDeniedCapability,
} from '../../../src/application/services/workspaceGraphDraftCapabilityPolicy.js';

describe('workspaceGraphDraftCapabilityPolicy', () => {
  const scope = {
    tenantId: 'tenant-a',
    projectId: 'project-a',
    environmentId: 'env-a',
  };

  it('materializes writable capability from static policy', () => {
    expect(
      buildWorkspaceGraphDraftCapabilityFromPolicy(
        scope,
        WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.writable
      )
    ).toEqual({
      scope,
      mode: 'writable',
      canRead: true,
      canWrite: true,
      reason: 'authorized',
    });
  });

  it('maps token assertion conflicts to tenant_mismatch for denied policies', () => {
    expect(
      buildWorkspaceGraphDraftDeniedCapability(
        scope,
        'TOKEN_ASSERTION_CONFLICT',
        WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.forbidden
      )
    ).toEqual({
      scope,
      mode: 'forbidden',
      canRead: false,
      canWrite: false,
      reason: 'tenant_mismatch',
    });
  });

  it('uses the policy fallback reason for non-conflict denials', () => {
    expect(
      buildWorkspaceGraphDraftDeniedCapability(
        scope,
        'ACTION_NOT_GRANTED',
        WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.readOnly
      )
    ).toEqual({
      scope,
      mode: 'read_only',
      canRead: true,
      canWrite: false,
      reason: 'write_denied',
    });
  });
});
