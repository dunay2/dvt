/**
 * Owned concern: adapt protected workspace file-history query rails to HTTP.
 */
import path from 'node:path';

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { InvalidWorkspacePathError } from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ListWorkspaceFileHistoryUseCase } from '../../application/services/listWorkspaceFileHistoryUseCase.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import {
  parseRequiredEnvironmentScope,
  type EnvironmentScopeQuery,
} from './routeParserPrimitives.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

const ALLOWED_HISTORY_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

type WorkspaceFileHistoryPathParams = {
  readonly path: string;
};

type WorkspaceFileHistoryRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly listUseCase: ListWorkspaceFileHistoryUseCase;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerWorkspaceFileHistoryRoutes(
  app: FastifyInstance,
  deps: WorkspaceFileHistoryRouteDeps
): void {
  app.get<{ Params: WorkspaceFileHistoryPathParams; Querystring: EnvironmentScopeQuery }>(
    RUNTIME_ROUTE_PATH.workspaceFileHistory,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFileHistoryRequest(request, reply, deps);
      if (!authorized) return;

      try {
        const workspacePath = parseWorkspaceHistoryPath(request.params.path);
        reply.code(200).send(await deps.listUseCase.execute(workspacePath));
      } catch (error) {
        if (error instanceof InvalidWorkspacePathError) {
          httpErrorTranslation.respond(
            reply,
            httpErrorTranslation.parse.issue(
              badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'path' })
            )
          );
          return;
        }

        throw error;
      }
    }
  );
}

function parseWorkspaceHistoryPath(requestPath: string): string {
  const workspacePath = decodeURIComponent(requestPath).replaceAll('\\', '/').trim();
  const segments = workspacePath.split('/');
  if (
    workspacePath.length === 0 ||
    workspacePath.startsWith('/') ||
    segments.some((segment) => segment.length === 0 || segment === '..') ||
    !ALLOWED_HISTORY_EXTENSIONS.has(path.extname(workspacePath).toLowerCase())
  ) {
    throw new InvalidWorkspacePathError(requestPath);
  }

  return workspacePath;
}

async function authorizeWorkspaceFileHistoryRequest(
  request: FastifyRequest<{ Querystring: EnvironmentScopeQuery }>,
  reply: FastifyReply,
  deps: Pick<WorkspaceFileHistoryRouteDeps, 'authenticator' | 'authorizer'>
): Promise<boolean> {
  const parsed = parseRequiredEnvironmentScope(request.query);
  if (!parsed.ok) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
    return false;
  }

  const auth = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      ...parsed.value,
      action: AUTHORIZATION_ACTION.workspaceFilesView,
    },
  });
  if (!auth.ok) {
    httpErrorTranslation.respond(reply, auth.response);
    return false;
  }

  return true;
}
