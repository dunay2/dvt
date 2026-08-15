/** Owned concern: adapt the protected ProjectDbtGraphFromFiles query rail to HTTP. */
import {
  DBT_PROJECT_GRAPH_PROJECTION_FEATURE,
  type DbtProjectGraphProjection,
} from '@dvt/contracts';
import type { FastifyInstance } from 'fastify';

import {
  AUTHORIZATION_ACTION,
  buildEnvironmentAccessScope,
} from '../../application/ports/accessDecision.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { DbtProjectFileAuthorityRequiredError } from '../../application/ports/dbtProjectImport.js';
import type { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import type { ProjectDbtGraphFromFilesUseCase } from '../../application/services/projectDbtGraphFromFilesUseCase.js';

import {
  authorizeDbtProjectFileRequest,
  parseDbtProjectFileScope,
  type DbtProjectFileScopeQuery,
} from './dbtProjectFileRouteAuthorization.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import { badRequestIssue, type RouteParseResult } from './routeParseIssue.js';
import { RUNTIME_ROUTE_PATH } from './runtimeRoutes.constants.js';

type DbtProjectGraphQuery = DbtProjectFileScopeQuery & {
  readonly canvasId?: string;
  readonly projectionFeature?: string;
};

type DbtProjectGraphRouteDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly useCase: Pick<ProjectDbtGraphFromFilesUseCase, 'execute'>;
  readonly rateLimit: { readonly max: number; readonly timeWindow: number };
};

export function registerDbtProjectGraphRoutes(
  app: FastifyInstance,
  deps: DbtProjectGraphRouteDeps
): void {
  app.get<{ Querystring: DbtProjectGraphQuery }>(
    RUNTIME_ROUTE_PATH.dbtProjectGraph,
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const parsed = parseDbtProjectGraphQuery(request.query);
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
        const projection = await deps.useCase.execute({
          scope: authorized.scope,
          canvasId: parsed.value.canvasId,
          includeGovernedSourceIdentity:
            parsed.value.projectionFeature ===
            DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity,
        });
        reply
          .code(200)
          .send(projectDbtGraphWireResponse(projection, parsed.value.projectionFeature));
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

function parseDbtProjectGraphQuery(input: DbtProjectGraphQuery): RouteParseResult<{
  readonly accessScope: ReturnType<typeof buildEnvironmentAccessScope>;
  readonly canvasId: string;
  readonly projectionFeature?: typeof DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity;
}> {
  const accessScope = parseDbtProjectFileScope(input);
  const canvasId = input.canvasId?.trim();
  const projectionFeature = input.projectionFeature?.trim();
  if (
    !accessScope.ok ||
    !canvasId ||
    (projectionFeature !== undefined &&
      projectionFeature !== DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity)
  ) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidDbtProjectGraphRequest, {
        target: 'query',
      }),
    };
  }

  return {
    ok: true,
    value: {
      accessScope: accessScope.value,
      canvasId,
      ...(projectionFeature === undefined
        ? {}
        : {
            projectionFeature: DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity,
          }),
    },
  };
}

function projectDbtGraphWireResponse(
  projection: DbtProjectGraphProjection,
  projectionFeature: typeof DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity | undefined
): DbtProjectGraphProjection {
  if (projectionFeature === DBT_PROJECT_GRAPH_PROJECTION_FEATURE.governedSourceIdentity) {
    return projection;
  }

  return {
    ...projection,
    nodes: projection.nodes.map((node) => {
      const legacyNode = { ...node };
      delete legacyNode.identifier;
      delete legacyNode.sourceIdentity;
      return legacyNode;
    }),
  };
}
