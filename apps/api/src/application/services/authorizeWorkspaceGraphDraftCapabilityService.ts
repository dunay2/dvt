/**
 * Owned concern: authenticate the caller and derive the protected workspace
 * graph draft capability decision for read/write application flows.
 *
 * This service owns capability posture only. It does not read drafts, save
 * drafts, translate HTTP outcomes, or assemble runtime dependencies.
 */
import { randomUUID } from 'node:crypto';

import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE,
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON,
  type WorkspaceGraphDraftCapabilityOutcome,
  type WorkspaceGraphDraftScope,
} from '@dvt/contracts';

import type { IAuthenticator } from '../ports/auth.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTION,
  type WorkspaceGraphDraftDecisionContext,
  type WorkspaceGraphDraftRequestedScope,
} from '../ports/workspaceGraphDraft.js';

import { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';

type AuthorizationFailureReason = 'ACTION_NOT_GRANTED' | 'TOKEN_ASSERTION_CONFLICT' | string;

export class AuthorizeWorkspaceGraphDraftCapabilityService {
  public constructor(
    private readonly authenticator: IAuthenticator,
    private readonly authorizer: AuthorizeCommandScopeService,
    private readonly clock: () => Date
  ) {}

  public async authorize(input: {
    readonly token: string | undefined;
    readonly requestId: string;
    readonly requestedScope: WorkspaceGraphDraftRequestedScope;
  }): Promise<WorkspaceGraphDraftDecisionContext> {
    const recordedAt = this.clock().toISOString();
    const scope = toContractScope(input.requestedScope);
    const base = {
      requestId: input.requestId,
      correlationId: input.requestId,
      decisionId: randomUUID(),
      recordedAt,
      requestedScope: input.requestedScope,
      scope,
    } as const;

    const authentication = await this.authenticator.authenticateBearerToken(input.token);
    if (!authentication.ok) {
      return {
        authentication: 'unauthenticated',
        ...base,
        capability: {
          scope,
          mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden,
          canRead: false,
          canWrite: false,
          reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.unauthenticated,
        },
      };
    }

    const readAuthorization = await this.authorizer.authorize(
      authentication.principal,
      {
        ...input.requestedScope,
        action: WORKSPACE_GRAPH_DRAFT_ACTION.view,
      },
      input.requestId
    );
    if (!readAuthorization.ok) {
      return {
        authentication: 'authenticated',
        ...base,
        principal: authentication.principal,
        capability: buildForbiddenCapability(scope, readAuthorization.reason),
      };
    }

    const writeAuthorization = await this.authorizer.authorize(
      authentication.principal,
      {
        ...input.requestedScope,
        action: WORKSPACE_GRAPH_DRAFT_ACTION.save,
      },
      input.requestId
    );
    if (!writeAuthorization.ok) {
      return {
        authentication: 'authenticated',
        ...base,
        principal: authentication.principal,
        capability: {
          scope,
          mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.readOnly,
          canRead: true,
          canWrite: false,
          reason:
            writeAuthorization.reason === 'TOKEN_ASSERTION_CONFLICT'
              ? WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.tenantMismatch
              : WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.writeDenied,
        },
      };
    }

    return {
      authentication: 'authenticated',
      ...base,
      principal: authentication.principal,
      capability: {
        scope,
        mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.writable,
        canRead: true,
        canWrite: true,
        reason: WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.authorized,
      },
    };
  }
}

function toContractScope(scope: WorkspaceGraphDraftRequestedScope): WorkspaceGraphDraftScope {
  return {
    tenantId: scope.tenantId.value,
    projectId: scope.projectId.value,
    environmentId: scope.environmentId.value,
  };
}

function buildForbiddenCapability(
  scope: WorkspaceGraphDraftScope,
  reason: AuthorizationFailureReason
): WorkspaceGraphDraftCapabilityOutcome {
  return {
    scope,
    mode: WORKSPACE_GRAPH_DRAFT_CAPABILITY_MODE.forbidden,
    canRead: false,
    canWrite: false,
    reason:
      reason === 'TOKEN_ASSERTION_CONFLICT'
        ? WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.tenantMismatch
        : WORKSPACE_GRAPH_DRAFT_CAPABILITY_REASON.workspaceScopeDenied,
  };
}
