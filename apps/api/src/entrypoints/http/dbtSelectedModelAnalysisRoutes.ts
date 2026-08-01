/** Owned concern: adapt the protected AnalyzeSelectedDbtModel query rail to HTTP. */
import type { FastifyInstance } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { DbtProjectFileAuthorityRequiredError } from '../../application/ports/dbtProjectImport.js';
import type { AnalyzeSelectedDbtModelQuery } from '../../application/services/analyzeSelectedDbtModelQuery.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type SelectedModelAnalysisQuery = DbtProjectFileScopeQuery & {
  readonly canvasId?: string;
  readonly selectedUniqueId?: string;
};

type SelectedModelAnalysisRouteDeps = Readonly<{
  authenticator: IAuthenticator;
  authorizer: AuthorizeCommandScopeService;
  query: Pick<AnalyzeSelectedDbtModelQuery, 'execute'>;
  rateLimit: { readonly max: number; readonly timeWindow: number };
}>;

export function registerDbtSelectedModelAnalysisRoutes(
  app: FastifyInstance,
  deps: SelectedModelAnalysisRouteDeps
): void {
  app.get<{ Querystring: SelectedModelAnalysisQuery }>(
    RUNTIME_ROUTE_PATH.dbtSelectedModelAnalysis,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = parseSelectedModelAnalysisQuery(request.query);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      const authorized = await authorizeDbtProjectFileRequest(
        request,
        reply,
        deps,
        parsed.value.accessScope,
        AUTHORIZATION_ACTION.workspaceFilesView
      );
      if (!authorized) return;

      try {
        reply.code(200).send(
          await deps.query.execute({
            scope: authorized.scope,
            canvasId: parsed.value.canvasId,
            selectedUniqueId: parsed.value.selectedUniqueId,
          })
        );
      } catch (error) {
        if (error instanceof DbtProjectFileAuthorityRequiredError) {
          reply.code(409).send({
            error: {
              type: 'conflict',
              reason: HTTP_ERROR_REASON.dbtProjectFileAuthorityRequired,
            },
          });
          return;
        }
        throw error;
      }
    }
  );
}

function parseSelectedModelAnalysisQuery(input: SelectedModelAnalysisQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly canvasId: string;
  readonly selectedUniqueId: string;
}> {
  const accessScope = parseDbtProjectFileScope(
    input,
    HTTP_ERROR_REASON.invalidSelectedDbtModelAnalysisRequest
  );
  const canvasId = input.canvasId?.trim();
  const selectedUniqueId = input.selectedUniqueId?.trim();
  if (!accessScope.ok || !canvasId || !selectedUniqueId) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidSelectedDbtModelAnalysisRequest, {
        target: 'query',
      }),
    };
  }

  return {
    ok: true,
    value: { accessScope: accessScope.value, canvasId, selectedUniqueId },
  };
}
