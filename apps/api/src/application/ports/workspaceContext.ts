/**
 * Owned concern: define the protected runtime query port for server-owned
 * effective workspace context resolution.
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
