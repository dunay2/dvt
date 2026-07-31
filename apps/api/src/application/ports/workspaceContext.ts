/**
 * @file apps/api/src/application/ports/workspaceContext.ts
 * @baseline ADR-0062: Server-owned effective workspace context
 * @decision Keep effective workspace selection behind a distinct server-owned query port.
 * @consequence Protected web routes consume granted workspace scope instead of browser authority.
 * @version 1.0.0
 */
import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

export interface EffectiveWorkspaceContext {
  readonly tenantId: string;
  readonly projectId: string;
  readonly environmentId: string;
}

export interface EffectiveWorkspaceContextEnvelope {
  readonly effectiveWorkspace: EffectiveWorkspaceContext;
  readonly availableWorkspaces: readonly EffectiveWorkspaceContext[];
}

export interface IWorkspaceContextQuery {
  getEffectiveWorkspaceContext(
    principal: AuthenticatedPrincipal
  ): Promise<EffectiveWorkspaceContextEnvelope | null>;
}
