/** Owned concern: adapt the protected AnalyzeSelectedDbtModel query rail to HTTP. */
import {
  DbtSelectedModelExecutionSqlSelectionSchema,
  type DbtSelectedModelExecutionSqlSelection,
} from '@dvt/contracts';
import type { FastifyInstance, FastifyReply } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { CanvasModelSqlUnavailableError } from '../../application/ports/canvasModelSql.js';
import { DbtModelProducerAccessDeniedError } from '../../application/ports/dbtModelProducer.js';
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
  readonly includeExecutableSql?: string;
  readonly expectedProjectRevision?: string;
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
          await deps.query.execute(
            {
              scope: authorized.scope,
              canvasId: parsed.value.canvasId,
              selectedUniqueId: parsed.value.selectedUniqueId,
              ...(parsed.value.executionSql == null
                ? {}
                : { executionSql: parsed.value.executionSql }),
            },
            authorized.context
          )
        );
      } catch (error) {
        if (!respondToSelectedModelFailure(reply, error)) throw error;
      }
    }
  );
}

function respondToSelectedModelFailure(reply: FastifyReply, error: unknown): boolean {
  if (error instanceof DbtModelProducerAccessDeniedError) {
    reply
      .code(403)
      .send({ error: { type: 'forbidden', reason: HTTP_ERROR_REASON.modelSqlAccessDenied } });
    return true;
  }
  if (error instanceof CanvasModelSqlUnavailableError) {
    const stale = error.code === 'stale_context';
    reply
      .code(stale ? 409 : 422)
      .send({ error: { type: stale ? 'conflict' : 'unprocessable_entity', reason: error.code } });
    return true;
  }
  if (error instanceof DbtProjectFileAuthorityRequiredError) {
    reply
      .code(409)
      .send({
        error: { type: 'conflict', reason: HTTP_ERROR_REASON.dbtProjectFileAuthorityRequired },
      });
    return true;
  }
  return false;
}

function parseSelectedModelAnalysisQuery(input: SelectedModelAnalysisQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly canvasId: string;
  readonly selectedUniqueId: string;
  readonly executionSql?: DbtSelectedModelExecutionSqlSelection;
}> {
  const accessScope = parseDbtProjectFileScope(
    input,
    HTTP_ERROR_REASON.invalidSelectedDbtModelAnalysisRequest
  );
  const canvasId = input.canvasId?.trim();
  const selectedUniqueId = input.selectedUniqueId?.trim();
  const executionSql = parseExecutionSqlSelection(input);
  if (!accessScope.ok || !canvasId || !selectedUniqueId || !executionSql.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidSelectedDbtModelAnalysisRequest, {
        target: 'query',
      }),
    };
  }

  return {
    ok: true,
    value: {
      accessScope: accessScope.value,
      canvasId,
      selectedUniqueId,
      ...(executionSql.value == null ? {} : { executionSql: executionSql.value }),
    },
  };
}

function parseExecutionSqlSelection(
  input: SelectedModelAnalysisQuery
): RouteParseResult<DbtSelectedModelExecutionSqlSelection | undefined> {
  if (input.includeExecutableSql == null && input.expectedProjectRevision == null)
    return { ok: true, value: undefined };
  const selection = DbtSelectedModelExecutionSqlSelectionSchema.safeParse(
    input.expectedProjectRevision === undefined
      ? {}
      : { expectedProjectRevision: input.expectedProjectRevision }
  );
  if (input.includeExecutableSql === '1' && selection.success)
    return { ok: true, value: selection.data };
  return {
    ok: false,
    issue: badRequestIssue(HTTP_ERROR_REASON.invalidSelectedDbtModelAnalysisRequest, {
      target: 'query',
    }),
  };
}
