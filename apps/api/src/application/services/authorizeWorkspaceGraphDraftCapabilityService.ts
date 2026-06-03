/**
 * Owned concern: authenticate the caller and derive the protected workspace
 * graph draft capability decision for read/write application flows.
 *
 * This service owns capability posture only. It does not read drafts, save
 * drafts, translate HTTP outcomes, or assemble runtime dependencies.
 */
import { randomUUID } from 'node:crypto';

import type { WorkspaceGraphDraftCapabilityOutcome, WorkspaceGraphDraftScope } from '@dvt/contracts';

import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';
import { buildWorkspaceGraphDraftAccessScope } from '../ports/accessDecision.js';
import type { IAuthenticator } from '../ports/auth.js';
import {
  WORKSPACE_GRAPH_DRAFT_ACTION,
  type WorkspaceGraphDraftDecisionContext,
  type WorkspaceGraphDraftRequestedScope,
} from '../ports/workspaceGraphDraft.js';

import { AuthorizeCommandScopeService } from './authorizeCommandScopeService.js';
import {
  WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY,
  buildWorkspaceGraphDraftCapabilityFromPolicy,
  buildWorkspaceGraphDraftDeniedCapability,
} from './workspaceGraphDraftCapabilityPolicy.js';

type WorkspaceGraphDraftDecisionBase = Pick<
  WorkspaceGraphDraftDecisionContext,
  'requestId' | 'correlationId' | 'decisionId' | 'recordedAt' | 'requestedScope' | 'scope'
>;

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
    const base = buildDecisionBase(input, this.clock);

    const authentication = await this.authenticator.authenticateBearerToken(input.token);
    if (!authentication.ok) {
      return buildUnauthenticatedDecision(base);
    }

    return this.authorizeAuthenticatedPrincipal(
      authentication.principal,
      base,
      input.requestedScope,
      input.requestId
    );
  }

  private async authorizeWorkspaceGraphDraftAction(
    principal: AuthenticatedPrincipal,
    requestedScope: WorkspaceGraphDraftRequestedScope,
    action: typeof WORKSPACE_GRAPH_DRAFT_ACTION.view | typeof WORKSPACE_GRAPH_DRAFT_ACTION.save,
    requestId: string
  ) {
    return this.authorizer.authorize(
      principal,
      {
        ...buildWorkspaceGraphDraftAccessScope(
          requestedScope.tenantId,
          requestedScope.projectId,
          requestedScope.environmentId
        ),
        action,
      },
      requestId
    );
  }

  private async authorizeAuthenticatedPrincipal(
    principal: AuthenticatedPrincipal,
    base: WorkspaceGraphDraftDecisionBase,
    requestedScope: WorkspaceGraphDraftRequestedScope,
    requestId: string
  ): Promise<WorkspaceGraphDraftDecisionContext> {
    const readAuthorization = await this.authorizeWorkspaceGraphDraftAction(
      principal,
      requestedScope,
      WORKSPACE_GRAPH_DRAFT_ACTION.view,
      requestId
    );
    if (!readAuthorization.ok) {
      return buildAuthenticatedDecision(
        base,
        principal,
        buildWorkspaceGraphDraftDeniedCapability(
          base.scope,
          readAuthorization.reason,
          WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.forbidden
        )
      );
    }

    const writeAuthorization = await this.authorizeWorkspaceGraphDraftAction(
      principal,
      requestedScope,
      WORKSPACE_GRAPH_DRAFT_ACTION.save,
      requestId
    );
    if (!writeAuthorization.ok) {
      return buildAuthenticatedDecision(
        base,
        principal,
        buildWorkspaceGraphDraftDeniedCapability(
          base.scope,
          writeAuthorization.reason,
          WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.readOnly
        )
      );
    }

    return buildAuthenticatedDecision(
      base,
      principal,
      buildWorkspaceGraphDraftCapabilityFromPolicy(
        base.scope,
        WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.writable
      )
    );
  }
}

function buildDecisionBase(
  input: {
    readonly requestId: string;
    readonly requestedScope: WorkspaceGraphDraftRequestedScope;
  },
  clock: () => Date
): WorkspaceGraphDraftDecisionBase {
  return {
    requestId: input.requestId,
    correlationId: input.requestId,
    decisionId: randomUUID(),
    recordedAt: clock().toISOString(),
    requestedScope: input.requestedScope,
    scope: toContractScope(input.requestedScope),
  };
}

function buildUnauthenticatedDecision(
  base: WorkspaceGraphDraftDecisionBase
): WorkspaceGraphDraftDecisionContext {
  return {
    authentication: 'unauthenticated',
    ...base,
    capability: buildWorkspaceGraphDraftCapabilityFromPolicy(
      base.scope,
      WORKSPACE_GRAPH_DRAFT_CAPABILITY_POLICY.unauthenticated
    ),
  };
}

function buildAuthenticatedDecision(
  base: WorkspaceGraphDraftDecisionBase,
  principal: AuthenticatedPrincipal,
  capability: WorkspaceGraphDraftCapabilityOutcome
): WorkspaceGraphDraftDecisionContext {
  return {
    authentication: 'authenticated',
    ...base,
    principal,
    capability,
  };
}

function toContractScope(scope: WorkspaceGraphDraftRequestedScope): WorkspaceGraphDraftScope {
  return {
    tenantId: scope.tenantId.value,
    projectId: scope.projectId.value,
    environmentId: scope.environmentId.value,
  };
}
