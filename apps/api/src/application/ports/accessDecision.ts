/**
 * Owned concern: publish the canonical DVT-owned access decision port for the
 * protected API boundary.
 *
 * Action vocabulary and scope builders live in adjacent owned modules. This
 * facade keeps existing imports stable while the semantic ownership remains
 * split by concern.
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

import type { AuthorizationAction } from './accessDecisionActions.js';
import type { ExecutionScope } from './accessDecisionScopes.js';

export {
  AUTHORIZATION_ACTION,
  AUTHORIZATION_ACTION_NAME,
  type AuthorizationAction,
  type CommandAuthorizationAction,
  type CommandAuthorizationActionName,
  type QueryAuthorizationAction,
  type QueryAuthorizationActionName,
} from './accessDecisionActions.js';

export {
  ACCESS_SCOPE_RESOURCE,
  type AccessScopeResource,
  type EnvironmentAccessScope,
  type ExecutionScope,
  type ProjectAccessScope,
  type TenantAccessScope,
  type WorkspaceGraphDraftAccessScope,
  buildEnvironmentAccessScope,
  buildProjectAccessScope,
  buildTenantAccessScope,
  buildWorkspaceGraphDraftAccessScope,
} from './accessDecisionScopes.js';

export type RequestedScope<TAction extends AuthorizationAction = AuthorizationAction> =
  ExecutionScope & {
    readonly action: TAction;
  };

export type DeniedReason =
  | 'PRINCIPAL_SUSPENDED'
  | 'TENANT_NOT_GRANTED'
  | 'PROJECT_NOT_GRANTED'
  | 'ENVIRONMENT_NOT_GRANTED'
  | 'ACTION_NOT_GRANTED'
  | 'TOKEN_ASSERTION_CONFLICT';

export function toExecutionScope<TAction extends AuthorizationAction>(
  requestedScope: RequestedScope<TAction>
): ExecutionScope {
  const { action: _action, ...scope } = requestedScope;
  return scope;
}

export type AccessDecision<_TAction extends AuthorizationAction = AuthorizationAction> =
  | {
      readonly ok: true;
      readonly approvedScope: ExecutionScope;
    }
  | {
      readonly ok: false;
      readonly reason: DeniedReason;
    };

export interface IAccessDecisionService {
  decide<TAction extends AuthorizationAction>(
    principal: AuthenticatedPrincipal,
    requestedScope: RequestedScope<TAction>
  ): Promise<AccessDecision<TAction>>;
}
