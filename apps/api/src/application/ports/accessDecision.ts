/**
 * Owned concern: define the canonical DVT-owned access decision vocabulary for
 * the protected API boundary.
 *
 * This port owns action names, resource discriminants, scope builders, and
 * allow/deny decision shapes. It does not own authentication, audit
 * persistence, or vendor-specific PDP integration details.
 */
import type {
  AuthenticatedPrincipal,
  EnvironmentId,
  ProjectId,
  TenantId,
} from '../../domain/auth/types.js';

export const AUTHORIZATION_ACTION_NAME = {
  runStart: 'run:start',
  runCancel: 'run:cancel',
  runRetry: 'run:retry',
  runSignal: 'run:signal',
  workspaceGraphDraftSave: 'workspace:graph-draft:save',
  adminRebuildSnapshot: 'admin:rebuild-snapshot',
  runView: 'run:view',
  runList: 'run:list',
  runLogsView: 'run:logs:view',
  workspaceGraphDraftView: 'workspace:graph-draft:view',
} as const;

export const ACCESS_SCOPE_RESOURCE = {
  tenant: 'tenant',
  project: 'project',
  environment: 'environment',
  workspaceGraphDraft: 'workspace-graph-draft',
} as const;

export type AccessScopeResource =
  (typeof ACCESS_SCOPE_RESOURCE)[keyof typeof ACCESS_SCOPE_RESOURCE];

export type CommandAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.runStart
  | typeof AUTHORIZATION_ACTION_NAME.runCancel
  | typeof AUTHORIZATION_ACTION_NAME.runRetry
  | typeof AUTHORIZATION_ACTION_NAME.runSignal
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave
  | typeof AUTHORIZATION_ACTION_NAME.adminRebuildSnapshot;

export type QueryAuthorizationActionName =
  | typeof AUTHORIZATION_ACTION_NAME.runView
  | typeof AUTHORIZATION_ACTION_NAME.runList
  | typeof AUTHORIZATION_ACTION_NAME.runLogsView
  | typeof AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView;

export type AuthorizationAction =
  | {
      readonly kind: 'command';
      readonly name: CommandAuthorizationActionName;
    }
  | {
      readonly kind: 'query';
      readonly name: QueryAuthorizationActionName;
    };

export type CommandAuthorizationAction = Extract<
  AuthorizationAction,
  { readonly kind: 'command' }
>;

export type QueryAuthorizationAction = Extract<
  AuthorizationAction,
  { readonly kind: 'query' }
>;

export const AUTHORIZATION_ACTION = {
  runStart: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runStart,
  },
  runCancel: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runCancel,
  },
  runRetry: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runRetry,
  },
  runSignal: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.runSignal,
  },
  workspaceGraphDraftSave: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.workspaceGraphDraftSave,
  },
  adminRebuildSnapshot: {
    kind: 'command',
    name: AUTHORIZATION_ACTION_NAME.adminRebuildSnapshot,
  },
  runView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runView,
  },
  runList: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runList,
  },
  runLogsView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.runLogsView,
  },
  workspaceGraphDraftView: {
    kind: 'query',
    name: AUTHORIZATION_ACTION_NAME.workspaceGraphDraftView,
  },
} as const satisfies Readonly<Record<string, AuthorizationAction>>;

export type TenantAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.tenant;
  readonly tenantId: TenantId;
  readonly projectId?: never;
  readonly environmentId?: never;
};

export type ProjectAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.project;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId?: never;
};

export type EnvironmentAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.environment;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export type WorkspaceGraphDraftAccessScope = {
  readonly resource: typeof ACCESS_SCOPE_RESOURCE.workspaceGraphDraft;
  readonly tenantId: TenantId;
  readonly projectId: ProjectId;
  readonly environmentId: EnvironmentId;
};

export type ExecutionScope =
  | TenantAccessScope
  | ProjectAccessScope
  | EnvironmentAccessScope
  | WorkspaceGraphDraftAccessScope;

export type RequestedScope<TAction extends AuthorizationAction = AuthorizationAction> = ExecutionScope & {
  readonly action: TAction;
};

export type DeniedReason =
  | 'PRINCIPAL_SUSPENDED'
  | 'TENANT_NOT_GRANTED'
  | 'PROJECT_NOT_GRANTED'
  | 'ENVIRONMENT_NOT_GRANTED'
  | 'ACTION_NOT_GRANTED'
  | 'TOKEN_ASSERTION_CONFLICT';

export function buildTenantAccessScope(tenantId: TenantId): TenantAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.tenant,
    tenantId,
  };
}

export function buildProjectAccessScope(
  tenantId: TenantId,
  projectId: ProjectId
): ProjectAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.project,
    tenantId,
    projectId,
  };
}

export function buildEnvironmentAccessScope(
  tenantId: TenantId,
  projectId: ProjectId,
  environmentId: EnvironmentId
): EnvironmentAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.environment,
    tenantId,
    projectId,
    environmentId,
  };
}

export function buildWorkspaceGraphDraftAccessScope(
  tenantId: TenantId,
  projectId: ProjectId,
  environmentId: EnvironmentId
): WorkspaceGraphDraftAccessScope {
  return {
    resource: ACCESS_SCOPE_RESOURCE.workspaceGraphDraft,
    tenantId,
    projectId,
    environmentId,
  };
}

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
