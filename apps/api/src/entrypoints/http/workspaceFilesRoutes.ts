/**
 * Owned concern: adapt protected workspace-file command/query rails to HTTP.
 */
import type { FastifyInstance } from 'fastify';

import { AUTHORIZATION_ACTION } from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  InvalidWorkspacePathError,
  WorkspaceFileNotFoundError,
  type ExpectedWorkspaceFileRevision,
  type SaveWorkspaceFileContentInput,
} from '../../application/ports/workspaceFiles.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { GetWorkspaceFileContentUseCase } from '../../application/services/getWorkspaceFileContentUseCase.js';
import type { ListWorkspaceFilesUseCase } from '../../application/services/listWorkspaceFilesUseCase.js';
import type { SaveWorkspaceFileContentUseCase } from '../../application/services/saveWorkspaceFileContentUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';
import {
  authorizeWorkspaceFilesRequest,
  type WorkspaceFilesQuery,
} from './workspaceFilesRequestScope.js';

type WorkspaceFilePathParams = {
  readonly path: string;
};

type SaveWorkspaceFileContentBody = {
  readonly content?: unknown;
  readonly expectedRevision?: unknown;
};

type WorkspaceFilesRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly listUseCase: ListWorkspaceFilesUseCase;
  readonly getUseCase: GetWorkspaceFileContentUseCase;
  readonly saveUseCase: SaveWorkspaceFileContentUseCase;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerWorkspaceFilesRoutes(
  app: FastifyInstance,
  deps: WorkspaceFilesRouteDeps
): void {
  app.get<{ Querystring: WorkspaceFilesQuery }>(
    RUNTIME_ROUTE_PATH.workspaceFiles,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps);
      if (!authorized) return;

      reply.code(200).send(await deps.listUseCase.execute(authorized.scope));
    }
  );

  app.get<{ Params: WorkspaceFilePathParams; Querystring: WorkspaceFilesQuery }>(
    RUNTIME_ROUTE_PATH.workspaceFileContent,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps);
      if (!authorized) return;

      try {
        reply.code(200).send(await deps.getUseCase.execute(authorized.scope, request.params.path));
      } catch (error) {
        if (error instanceof WorkspaceFileNotFoundError) {
          httpErrorTranslation.respond(reply, httpErrorTranslation.workspaceFiles.notFound());
          return;
        }
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

  app.post<{
    Params: WorkspaceFilePathParams;
    Querystring: WorkspaceFilesQuery;
    Body: SaveWorkspaceFileContentBody;
  }>(
    RUNTIME_ROUTE_PATH.workspaceFileContent,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const authorized = await authorizeWorkspaceFilesRequest(request, reply, deps, {
        action: AUTHORIZATION_ACTION.workspaceFilesSave,
      });
      if (!authorized) return;

      const input = parseSaveWorkspaceFileContentBody(request.body);
      if (!input.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(input.issue));
        return;
      }

      try {
        const result = await deps.saveUseCase.execute(authorized.scope, {
          path: request.params.path,
          ...input.value,
        });
        if (result.kind === 'conflict') {
          httpErrorTranslation.respond(
            reply,
            httpErrorTranslation.workspaceFiles.revisionConflict()
          );
          return;
        }

        reply.code(200).send(result);
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

function parseSaveWorkspaceFileContentBody(
  body: SaveWorkspaceFileContentBody | undefined
): RouteParseResult<Omit<SaveWorkspaceFileContentInput, 'path'>> {
  if (typeof body?.content !== 'string') {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidWorkspacePath, { target: 'content' }),
    };
  }

  const expectedRevision = parseExpectedWorkspaceFileRevision(body.expectedRevision);
  if (!expectedRevision) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidWorkspaceFileRevision, {
        target: 'expectedRevision',
      }),
    };
  }

  return { ok: true, value: { content: body.content, expectedRevision } };
}

function parseExpectedWorkspaceFileRevision(value: unknown): ExpectedWorkspaceFileRevision | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (record.kind === 'absent') {
    return { kind: 'absent' };
  }
  if (
    record.kind === 'content_sha256' &&
    typeof record.value === 'string' &&
    /^[a-f0-9]{64}$/.test(record.value)
  ) {
    return { kind: 'content_sha256', value: record.value };
  }

  return null;
}
