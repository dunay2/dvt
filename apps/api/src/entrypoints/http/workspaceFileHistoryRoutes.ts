/** Owned concern: adapt scoped workspace version command and query ports to HTTP. */
import type { FastifyInstance, FastifyReply } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type {
  IWorkspaceFileHistoryRepository,
  IWorkspaceFileVersionCommandPort,
} from '../../application/ports/workspaceFileHistory.js';
import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
} from '../../application/ports/workspaceFiles.js';
import type { ListWorkspaceFileHistoryUseCase } from '../../application/services/listWorkspaceFileHistoryUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import {
  authorizeWorkspaceFilesRequest,
  type WorkspaceFilesAuthorizationDeps,
  type WorkspaceFilesQuery,
} from './workspaceFilesRequestScope.js';

type WorkspaceFileHistoryRouteDeps = WorkspaceFilesAuthorizationDeps &
  Readonly<{
    listUseCase: ListWorkspaceFileHistoryUseCase;
    versionQuery: Pick<IWorkspaceFileHistoryRepository, 'getFileVersionContent'>;
    versionCommand: IWorkspaceFileVersionCommandPort;
    rateLimit: { readonly max: number; readonly timeWindow: number };
  }>;

type HistoryPath = Readonly<{ path: string }>;
type HistoryQuery = WorkspaceFilesQuery & Readonly<{ before?: string }>;

export function registerWorkspaceFileHistoryRoutes(
  app: FastifyInstance,
  deps: WorkspaceFileHistoryRouteDeps
): void {
  const routeOptions = { config: { rateLimit: deps.rateLimit } };
  app.get<{ Params: HistoryPath; Querystring: HistoryQuery }>(
    RUNTIME_ROUTE_PATH.workspaceFileHistory,
    routeOptions,
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps);
      if (!authorized) return;
      try {
        const path = parseHistoryPath(request.params.path);
        reply.send(await deps.listUseCase.execute(authorized.scope, path, request.query.before));
      } catch (error) {
        respondVersionFailure(reply, error);
      }
    }
  );
  app.get<{ Params: HistoryPath & { revision: string }; Querystring: WorkspaceFilesQuery }>(
    RUNTIME_ROUTE_PATH.workspaceFileVersion,
    routeOptions,
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps);
      if (!authorized) return;
      try {
        const path = parseHistoryPath(request.params.path);
        const { revision } = request.params;
        const content = await deps.versionQuery.getFileVersionContent(
          authorized.scope,
          path,
          revision
        );
        if (content === null) throw new WorkspaceFileNotFoundError(path);
        reply.send({ path, commitSha: revision, content });
      } catch (error) {
        respondVersionFailure(reply, error);
      }
    }
  );
  app.post<{
    Params: HistoryPath;
    Querystring: WorkspaceFilesQuery;
    Body: { expectedContentSha256?: unknown };
  }>(RUNTIME_ROUTE_PATH.workspaceFileHistory, routeOptions, async (request, reply) => {
    const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps, {
      action: AUTHORIZATION_ACTION.workspaceFilesSave,
    });
    if (!authorized) return;
    const expected = request.body?.expectedContentSha256;
    if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected)) {
      httpErrorTranslation.respond(
        reply,
        httpErrorTranslation.parse.issue(
          badRequestIssue(HTTP_ERROR_REASON.invalidWorkspaceFileRevision, {
            target: 'expectedContentSha256',
          })
        )
      );
      return;
    }
    try {
      const path = parseHistoryPath(request.params.path);
      const result = await deps.versionCommand.commitFileVersion(authorized.scope, {
        path,
        expectedContentSha256: expected,
        author: authorized.subjectId,
      });
      if (result.kind === 'conflict') {
        httpErrorTranslation.respond(reply, httpErrorTranslation.workspaceFiles.revisionConflict());
        return;
      }
      reply.send(result);
    } catch (error) {
      respondVersionFailure(reply, error);
    }
  });
}

function parseHistoryPath(path: string): string {
  if (
    path === '' ||
    path.split(/[\\/]/).some((part) => part === '' || part === '.' || part === '..')
  ) {
    throw new InvalidWorkspacePathError(path);
  }
  return path;
}

function respondVersionFailure(reply: FastifyReply, error: unknown): void {
  if (error instanceof WorkspaceFileNotFoundError) {
    httpErrorTranslation.respond(reply, httpErrorTranslation.workspaceFiles.notFound());
    return;
  }
  if (!(error instanceof InvalidWorkspacePathError)) throw error;
  httpErrorTranslation.respond(
    reply,
    httpErrorTranslation.parse.issue(
      badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'path' })
    )
  );
}
