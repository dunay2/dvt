/** Admit a file-owned model through the existing dbt project authorization boundary. */
import { WorksheetDbtModelRequestSchema } from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { CreateWorksheetDbtModel } from '../../application/services/createWorksheetDbtModel.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileRouteAuthDeps,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

export function registerWorksheetDbtModelRoutes(
  app: FastifyInstance,
  deps: DbtProjectFileRouteAuthDeps &
    Readonly<{
      command: Pick<CreateWorksheetDbtModel, 'execute'>;
      rateLimit: { max: number; timeWindow: number };
    }>
) {
  app.post<{ Querystring: DbtProjectFileScopeQuery }>(
    RUNTIME_ROUTE_PATH.worksheetDbtModel,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = parseDbtProjectFileScope(request.query);
      if (!parsed.ok)
        return httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
      const grant = await authorizeDbtProjectFileRequest(
        request,
        reply,
        deps,
        parsed.value,
        AUTHORIZATION_ACTION.workspaceFilesSave
      );
      if (!grant) return;
      const input = WorksheetDbtModelRequestSchema.safeParse(request.body);
      if (!input.success)
        return httpErrorTranslation.respond(
          reply,
          httpErrorTranslation.parse.issue(
            badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'body' })
          )
        );
      const result = await deps.command.execute(grant.scope, input.data);
      return reply.code(result.kind === 'created' ? 200 : 409).send(result);
    }
  );
}
