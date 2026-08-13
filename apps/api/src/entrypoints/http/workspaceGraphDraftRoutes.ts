import {
  WorkspaceGraphDraftSaveRequestSchema,
  type WorkspaceGraphDraftSaveRequest,
  type WorkspaceGraphDraftSaveResponse,
  type WorkspaceGraphDraftCapabilityMode,
} from '@dvt/contracts';
import type { IObservability, ISpan } from '@dvt/observability';
import type { FastifyInstance } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import {
  type IWorkspaceGraphDraftTelemetry,
  type WorkspaceGraphDraftRequestedScope,
} from '../../application/ports/workspaceGraphDraft.js';
import type { AuthorizeWorkspaceGraphDraftCapabilityService } from '../../application/services/authorizeWorkspaceGraphDraftCapabilityService.js';
import type { GetWorkspaceGraphDraftUseCase } from '../../application/services/getWorkspaceGraphDraftUseCase.js';
import type { SaveWorkspaceGraphDraftUseCase } from '../../application/services/saveWorkspaceGraphDraftUseCase.js';
import { EnvironmentId, ProjectId, TenantId } from '../../domain/auth/types.js';

import { authenticateHttpBearerRequest } from './httpBearerAuthentication.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { httpErrorTranslation } from './httpErrorTranslation.js';
import {
  badRequestIssue,
  badRequestResult,
  forbiddenIssue,
  type RouteParseIssue,
  type RouteParseResult,
} from './routeParseIssue.js';

export function registerWorkspaceGraphDraftRoutes(
  app: FastifyInstance,
  deps: {
    readonly authenticator: IAuthenticator;
    readonly capabilityService: AuthorizeWorkspaceGraphDraftCapabilityService;
    readonly getUseCase: GetWorkspaceGraphDraftUseCase;
    readonly saveUseCase: SaveWorkspaceGraphDraftUseCase;
    readonly telemetry: IWorkspaceGraphDraftTelemetry;
    readonly observability: IObservability;
    readonly rateLimit: { readonly max: number; readonly timeWindow: number };
  }
): void {
  app.get<{
    Querystring: {
      tenantId?: string;
      projectId?: string;
      environmentId?: string;
    };
  }>(
    '/workspace/graph/draft',
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const startedAt = Date.now();
      const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
      if (principal === null) return;
      const parsed = parseRequestedScope(request.query);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      const span = deps.observability.traces.startSpan('api.workspace_graph_draft.read', {
        attributes: {
          route: '/workspace/graph/draft',
          action: 'draft_read',
        },
      });

      try {
        const decision = await deps.capabilityService.authorize({
          principal,
          requestId: request.id,
          requestedScope: parsed.value,
        });
        attachDecisionAttributes(
          span,
          decision.capability.mode,
          decision.capability.reason,
          decision
        );

        const result = await deps.getUseCase.execute(decision);
        deps.telemetry.recordRead(
          result.response.kind,
          decision.capability.mode,
          Date.now() - startedAt
        );
        span.setAttributes({
          outcome: result.response.kind,
          httpStatus: result.httpStatus,
        });
        reply.code(result.httpStatus).send(result.response);
      } catch (error) {
        span.recordException(error);
        span.setStatus(
          'error',
          error instanceof Error ? error.message : 'workspace_graph_draft_read_failed'
        );
        throw error;
      } finally {
        span.end();
      }
    }
  );

  app.put<{ Body: unknown }>(
    '/workspace/graph/draft',
    { config: { rateLimit: deps.rateLimit } },
    async (request, reply) => {
      const startedAt = Date.now();
      const principal = await authenticateHttpBearerRequest(request, reply, deps.authenticator);
      if (principal === null) return;
      const parsed = parseSaveRequest(request.body);
      if (!parsed.ok) {
        httpErrorTranslation.respond(reply, httpErrorTranslation.parse.issue(parsed.issue));
        return;
      }

      const span = deps.observability.traces.startSpan('api.workspace_graph_draft.write', {
        attributes: {
          route: '/workspace/graph/draft',
          action: 'draft_write',
        },
      });

      try {
        const decision = await deps.capabilityService.authorize({
          principal,
          requestId: request.id,
          requestedScope: parsed.value.requestedScope,
        });
        attachDecisionAttributes(
          span,
          decision.capability.mode,
          decision.capability.reason,
          decision
        );

        const result = await deps.saveUseCase.execute({
          request: parsed.value.request,
          decision,
        });

        deps.telemetry.recordWrite(
          writeTelemetryOutcome(result.response.kind),
          decision.capability.mode,
          Date.now() - startedAt
        );
        span.setAttributes({
          outcome: result.response.kind,
          httpStatus: result.httpStatus,
        });
        reply.code(result.httpStatus).send(result.response);
      } catch (error) {
        span.recordException(error);
        span.setStatus(
          'error',
          error instanceof Error ? error.message : 'workspace_graph_draft_write_failed'
        );
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

function parseRequestedScope(input: {
  readonly tenantId?: string;
  readonly projectId?: string;
  readonly environmentId?: string;
}): RouteParseResult<WorkspaceGraphDraftRequestedScope> {
  const tenant = parseRequiredTenantId(input.tenantId);
  if (!tenant.ok) {
    return { ok: false, issue: tenant.issue };
  }

  const project = parseRequiredProjectId(input.projectId);
  if (!project.ok) {
    return { ok: false, issue: project.issue };
  }

  const environment = parseRequiredEnvironmentId(input.environmentId);
  if (!environment.ok) {
    return { ok: false, issue: environment.issue };
  }

  return {
    ok: true,
    value: {
      tenantId: tenant.value,
      projectId: project.value,
      environmentId: environment.value,
    },
  };
}

function parseSaveRequest(body: unknown): RouteParseResult<{
  readonly request: WorkspaceGraphDraftSaveRequest;
  readonly requestedScope: WorkspaceGraphDraftRequestedScope;
}> {
  const parsed = WorkspaceGraphDraftSaveRequestSchema.safeParse(body);
  if (!parsed.success) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody, {
      target: 'body',
    });
  }

  const scope = parseRequestedScope(parsed.data.scope);
  if (!scope.ok) {
    return scope;
  }

  return {
    ok: true,
    value: {
      request: parsed.data,
      requestedScope: scope.value,
    },
  };
}

function parseRequiredTenantId(
  value: string | undefined
):
  | { readonly ok: true; readonly value: TenantId }
  | { readonly ok: false; readonly issue: RouteParseIssue } {
  if (value === undefined) {
    return {
      ok: false,
      issue: forbiddenIssue(HTTP_ERROR_REASON.missingTenantScope, { target: 'tenantId' }),
    };
  }

  const parsed = TenantId.parse(value);
  if (!parsed.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidTenantId, { target: 'tenantId' }),
    };
  }

  return { ok: true, value: parsed.value };
}

function parseRequiredProjectId(
  value: string | undefined
):
  | { readonly ok: true; readonly value: ProjectId }
  | { readonly ok: false; readonly issue: RouteParseIssue } {
  if (value === undefined) {
    return {
      ok: false,
      issue: forbiddenIssue(HTTP_ERROR_REASON.missingProjectId, { target: 'projectId' }),
    };
  }

  const parsed = ProjectId.parse(value);
  if (!parsed.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidProjectId, { target: 'projectId' }),
    };
  }

  return { ok: true, value: parsed.value };
}

function parseRequiredEnvironmentId(
  value: string | undefined
):
  | { readonly ok: true; readonly value: EnvironmentId }
  | { readonly ok: false; readonly issue: RouteParseIssue } {
  if (value === undefined) {
    return {
      ok: false,
      issue: forbiddenIssue(HTTP_ERROR_REASON.missingEnvironmentId, {
        target: 'environmentId',
      }),
    };
  }

  const parsed = EnvironmentId.parse(value);
  if (!parsed.ok) {
    return {
      ok: false,
      issue: badRequestIssue(HTTP_ERROR_REASON.invalidEnvironmentId, {
        target: 'environmentId',
      }),
    };
  }

  return { ok: true, value: parsed.value };
}

function attachDecisionAttributes(
  span: ISpan,
  mode: WorkspaceGraphDraftCapabilityMode,
  reason: string,
  decision: {
    readonly correlationId: string;
    readonly decisionId: string;
  }
): void {
  span.setAttributes({
    capabilityMode: mode,
    capabilityReason: reason,
    correlationId: decision.correlationId,
    decisionId: decision.decisionId,
  });
}

function writeTelemetryOutcome(
  kind: WorkspaceGraphDraftSaveResponse['kind']
): 'saved' | 'conflict' | 'denied' | 'idempotency_mismatch' {
  switch (kind) {
    case 'saved':
    case 'conflict':
    case 'denied':
    case 'idempotency_mismatch':
      return kind;
    case 'authoring_authority_conflict':
      return 'conflict';
    case 'unsupported_schema_version':
      return 'denied';
  }
}
