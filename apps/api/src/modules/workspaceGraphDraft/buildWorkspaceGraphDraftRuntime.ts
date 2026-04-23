/**
 * Owned concern: assemble the workspace-graph-draft runtime subcomponent from
 * protected-runtime dependencies already resolved by the outer composition root.
 */
import type { Logger } from 'pino';

import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { AuthorizeWorkspaceGraphDraftCapabilityService } from '../../application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import { GetWorkspaceGraphDraftUseCase } from '../../application/services/getWorkspaceGraphDraftUseCase.js';
import { SaveWorkspaceGraphDraftUseCase } from '../../application/services/saveWorkspaceGraphDraftUseCase.js';
import { getPgPool } from '../../db/pool.js';
import type { OidcAuthenticator } from '../../infrastructure/auth/oidcAuthenticator.js';
import { PostgresWorkspaceGraphDraftStore } from '../../infrastructure/workspaceGraphDraft/PostgresWorkspaceGraphDraftStore.js';
import { StructuredWorkspaceGraphDraftAuditLogger } from '../../infrastructure/workspaceGraphDraft/StructuredWorkspaceGraphDraftAuditLogger.js';
import type { Env } from '../../plugins/env.js';

type WorkspaceGraphDraftRuntimePool = ReturnType<typeof getPgPool>;

export type BuildWorkspaceGraphDraftRuntimeDeps = {
  readonly appLogger: Logger;
  readonly authenticator: OidcAuthenticator;
  readonly commandAuthorizer: AuthorizeCommandScopeService;
  readonly env: Env;
  readonly pool: WorkspaceGraphDraftRuntimePool;
};

export function buildWorkspaceGraphDraftRuntime(
  deps: BuildWorkspaceGraphDraftRuntimeDeps
) {
  const workspaceGraphDraftStore = new PostgresWorkspaceGraphDraftStore({
    pool: deps.pool,
    schema: deps.env.DVT_PG_SCHEMA,
    queryTimeoutMs: deps.env.DVT_PG_QUERY_TIMEOUT_MS,
  });
  const workspaceGraphDraftAudit = new StructuredWorkspaceGraphDraftAuditLogger(
    deps.appLogger
  );
  const workspaceGraphDraftCapabilityService = new AuthorizeWorkspaceGraphDraftCapabilityService(
    deps.authenticator,
    deps.commandAuthorizer,
    () => new Date()
  );
  const getWorkspaceGraphDraftUseCase = new GetWorkspaceGraphDraftUseCase(
    workspaceGraphDraftStore,
    workspaceGraphDraftAudit
  );
  const saveWorkspaceGraphDraftUseCase = new SaveWorkspaceGraphDraftUseCase(
    workspaceGraphDraftStore,
    workspaceGraphDraftAudit,
    () => new Date()
  );

  return {
    workspaceGraphDraftStore,
    workspaceGraphDraftCapabilityService,
    getWorkspaceGraphDraftUseCase,
    saveWorkspaceGraphDraftUseCase,
  };
}
