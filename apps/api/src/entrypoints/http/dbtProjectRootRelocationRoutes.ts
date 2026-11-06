/** Owned concern: expose the admitted preview/query and relocation/command with workspace-file authorization. */
import {
  PreviewDbtProjectRootRelocationRequestSchema,
  RelocateDbtProjectRootRequestSchema,
} from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { DbtProjectRootRelocationRuntime } from '../../modules/dbtProjectRootRelocation/buildDbtProjectRootRelocationRuntime.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import {
  authorizeWorkspaceFilesRequest,
  type WorkspaceFilesAuthorizationDeps,
  type WorkspaceFilesQuery,
} from './workspaceFilesRequestScope.js';

export function registerDbtProjectRootRelocationRoutes(
  app: FastifyInstance,
  deps: WorkspaceFilesAuthorizationDeps &
    DbtProjectRootRelocationRuntime &
    Readonly<{ rateLimit: { max: number; timeWindow: number } }>
): void {
  app.post<{ Querystring: WorkspaceFilesQuery }>(
    RUNTIME_ROUTE_PATH.dbtProjectRootRelocationPreview,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const auth = await authorizeWorkspaceFilesRequest(request, reply, deps);
      if (!auth) return;
      const parsed = PreviewDbtProjectRootRelocationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'body' })
          )
        );
        return;
      }
      return reply
        .code(200)
        .send(await deps.previewQuery.execute({ scope: auth.scope, ...parsed.data }));
    }
  );
  app.post<{ Querystring: WorkspaceFilesQuery }>(
    RUNTIME_ROUTE_PATH.dbtProjectRootRelocation,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const auth = await authorizeWorkspaceFilesRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceFilesSave,
      });
      if (!auth) return;
      const parsed = RelocateDbtProjectRootRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'body' })
          )
        );
        return;
      }
      const result = await deps.relocateCommand.execute({ scope: auth.scope, ...parsed.data });
      return reply.code(result.kind === 'refused' ? 409 : 200).send(result);
    }
  );
}
