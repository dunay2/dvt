/**
 * @file apps/api/src/application/ports/workspaceContext.ts
 * @baseline ADR-0062: Server-owned effective workspace context
 * @decision Keep effective workspace selection behind a distinct server-owned query port.
 * @consequence Protected web routes consume granted workspace scope instead of browser authority.
 * @version 1.0.0
 */
import type { WorkspaceContextResponse } from '@dvt/contracts';

import type { AuthenticatedPrincipal } from '../../domain/auth/types.js';

export type EffectiveWorkspaceContextEnvelope = Pick<
  WorkspaceContextResponse,
  'defaultWorkspace' | 'availableWorkspaces'
>;

export interface IWorkspaceContextQuery {
  getEffectiveWorkspaceContext(
    principal: AuthenticatedPrincipal
  ): Promise<EffectiveWorkspaceContextEnvelope | null>;
}
