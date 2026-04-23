/**
 * Owned concern: define workspace-graph-draft capability policies and
 * translate typed authorization denials into contract capability outcomes.
 *
 * This module owns capability policy materialization only. It does not
 * authenticate callers, execute authorization checks, or map HTTP responses.
 */
import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
  type WorkspaceGraphDraftCapabilityOutcome,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { DeniedReason } from '../ports/accessDecision.js';

type DeniedCapabilityPolicy = {
  readonly mode:
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly;
  readonly canRead: boolean;
  readonly fallbackReason:
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.workspaceScopeDenied
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.writeDenied;
};

type StaticCapabilityPolicy = Omit<WorkspaceGraphDraftCapabilityOutcome, 'scope' | 'reason'> & {
  readonly reason:
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.unauthenticated;
};

type FinalCapabilityPolicy = Omit<WorkspaceGraphDraftCapabilityOutcome, 'scope'>;

export const WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY = {
  forbidden: {
    mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden,
    canRead: false,
    canWrite: false,
    fallbackReason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.workspaceScopeDenied,
  },
  readOnly: {
    mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly,
    canRead: true,
    canWrite: false,
    fallbackReason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.writeDenied,
  },
  writable: {
    mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable,
    canRead: true,
    canWrite: true,
    reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized,
  },
  unauthenticated: {
    mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden,
    canRead: false,
    canWrite: false,
    reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.unauthenticated,
  },
} as const satisfies {
  readonly forbidden: DeniedCapabilityPolicy & { readonly canWrite: false };
  readonly readOnly: DeniedCapabilityPolicy & { readonly canWrite: false };
  readonly writable: StaticCapabilityPolicy;
  readonly unauthenticated: StaticCapabilityPolicy;
};

export function buildWorkspaceGraphDraftDeniedCapability(
  scope: WorkspaceGraphDraftScope,
  reason: DeniedReason,
  policy: DeniedCapabilityPolicy & { readonly canWrite: false }
): WorkspaceGraphDraftCapabilityOutcome {
  return buildWorkspaceGraphDraftCapabilityFromPolicy(scope, {
    mode: policy.mode,
    canRead: policy.canRead,
    canWrite: policy.canWrite,
    reason: resolveWorkspaceGraphDraftDeniedCapabilityReason(reason, policy.fallbackReason),
  });
}

export function buildWorkspaceGraphDraftCapabilityFromPolicy(
  scope: WorkspaceGraphDraftScope,
  capability: FinalCapabilityPolicy
): WorkspaceGraphDraftCapabilityOutcome {
  return buildWorkspaceGraphDraftCapabilityOutcome(scope, {
    mode: capability.mode,
    canRead: capability.canRead,
    canWrite: capability.canWrite,
    reason: capability.reason,
  });
}

function buildWorkspaceGraphDraftCapabilityOutcome(
  scope: WorkspaceGraphDraftScope,
  capability: Omit<WorkspaceGraphDraftCapabilityOutcome, 'scope'>
): WorkspaceGraphDraftCapabilityOutcome {
  return {
    scope,
    ...capability,
  };
}

function resolveWorkspaceGraphDraftDeniedCapabilityReason(
  reason: DeniedReason,
  fallbackReason:
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.workspaceScopeDenied
    | typeof WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.writeDenied
) {
  return reason === 'TOKEN_ASSERTION_CONFLICT'
    ? WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.tenantMismatch
    : fallbackReason;
}
