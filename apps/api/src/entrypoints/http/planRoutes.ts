import type {
  ExecutionPlan,
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanRef,
  RunContextSchemaT,
} from '@dvt/contracts';
import { parseRunContext } from '@dvt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  formatManifestArtifactResolutionReason,
  isManifestArtifactResolutionError,
  mapManifestArtifactResolutionCause,
} from '../../application/errors/ManifestArtifactResolutionError.js';
import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { parseStartRunScope, type ParsedStartRunScope } from './startRunRouteScopeParser.js';
import { parseStartRunSelection } from './startRunRouteSelectionParser.js';

const START_RUN_ACTION = { kind: 'command', name: 'run:start' } as const;

type PlanRoutesDeps = {
  readonly authenticator: IAuthenticator;
  readonly authorizer: AuthorizeCommandScopeService;
  readonly planner: IPlanner;
  readonly planStore: IPlanValidationLifecycleStore;
  readonly planValidator: IPlanExecutabilityValidator;
  readonly planResolver: { fetch(planRef: PlanRef): Promise<ExecutionPlan> };
};

export async function previewPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PlanRoutesDeps
): Promise<void> {
  const parsedBody = parseStartRunBodyRecord(request.body);
  if (!parsedBody.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(parsedBody.issue));
    return;
  }

  const routeContextResult = parseRouteContextRecord(parsedBody.value);
  if (!routeContextResult.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(routeContextResult.issue));
    return;
  }
  const routeContext = routeContextResult.value;

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: routeContext.tenantId,
      projectId: routeContext.projectId,
      environmentId: routeContext.environmentId,
      action: START_RUN_ACTION,
    },
  });
  if (!authz.ok) {
    sendHttpResponse(reply, authz.response);
    return;
  }

  const selectionInput = parsedBody.value.selectedNodeIds ?? parsedBody.value.selection;
  const selection = parseStartRunSelection(selectionInput);
  if (!selection.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(selection.issue));
    return;
  }

  const plannerEnvelope = parseStartRunPlannerEnvelope(parsedBody.value, selection.value);
  if (!plannerEnvelope.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(plannerEnvelope.issue));
    return;
  }

  try {
    const requestedAtIso = authz.context.authorizedAt.toISOString();
    let buildResult: Awaited<ReturnType<IPlanner['buildPlan']>>;
    try {
      buildResult = await deps.planner.buildPlan({
        ...bindScopeToPlannerEnvelope(plannerEnvelope.value, routeContext),
        selection: { selectedNodeIds: selection.value },
        requestedBy: authz.context.principal.principalId,
        requestId: request.id,
        requestedAtIso,
      });
    } catch (error) {
      const manifestResolutionResponse = mapManifestResolutionFailure(error);
      if (manifestResolutionResponse !== null) {
        sendHttpResponse(reply, manifestResolutionResponse);
        return;
      }
      throw error;
    }

    const planRef = await deps.planStore.storePlan(buildResult);
    const validation = await deps.planValidator.validatePlan(planRef, routeContext.targetAdapter);
    if (validation.status === 'ERROR') {
      await deps.planStore.markInvalid(planRef, validation);
      sendHttpResponse(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.unprocessable,
          reason: HTTP_ERROR_REASON.planRejected,
          details: {
            code: validation.code,
            adapterId: validation.adapterId,
            ...(validation.cause === undefined ? {} : { cause: validation.cause }),
            rejectionReason: validation.reason,
          },
        })
      );
      return;
    }
    await deps.planStore.markValid(planRef);
    reply.code(200).send({ plan: buildResult.plan, planRef });
  } catch (error) {
    request.log.error({ err: error }, 'plan preview failed');
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      })
    );
  }
}

export async function importPlanRoute(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply,
  deps: PlanRoutesDeps
): Promise<void> {
  const parsedBody = parseStartRunBodyRecord(request.body);
  if (!parsedBody.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(parsedBody.issue));
    return;
  }

  const routeContextResult = parseRouteContextRecord(parsedBody.value);
  if (!routeContextResult.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(routeContextResult.issue));
    return;
  }
  const routeContext = routeContextResult.value;

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: routeContext.tenantId,
      projectId: routeContext.projectId,
      environmentId: routeContext.environmentId,
      action: START_RUN_ACTION,
    },
  });
  if (!authz.ok) {
    sendHttpResponse(reply, authz.response);
    return;
  }

  const planRefResult = parseStartRunPlanRef(parsedBody.value.planRef);
  if (!planRefResult.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(planRefResult.issue));
    return;
  }

  try {
    const planRef = planRefResult.value;
    const plan = await deps.planResolver.fetch(planRef);
    if (!isPlanOwnedByScope(plan, routeContext)) {
      sendHttpResponse(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.forbidden,
          reason: HTTP_ERROR_REASON.tenantAccessDenied,
          details: { cause: 'plan_scope_mismatch' },
        })
      );
      return;
    }
    reply.code(200).send({ plan, planRef });
  } catch (error) {
    request.log.error({ err: error }, 'plan import failed');
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.internalServerError,
        reason: HTTP_ERROR_REASON.internalError,
      })
    );
  }
}

function parseRouteContextRecord(
  record: Record<string, unknown>
): RouteParseResult<ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>> {
  if (
    record.context === undefined ||
    record.context === null ||
    typeof record.context !== 'object'
  ) {
    return badRequestResult<ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>>(
      HTTP_ERROR_REASON.invalidBody
    );
  }

  try {
    const context = parseRunContext(record.context);
    const scopeResult = parseStartRunScope({
      tenantId: context.tenantId,
      projectId: context.projectId,
      environmentId: context.environmentId,
    });
    if (!scopeResult.ok) {
      return scopeResult;
    }
    return {
      ok: true,
      value: {
        ...scopeResult.value,
        targetAdapter: context.targetAdapter,
      },
    };
  } catch {
    return badRequestResult<ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>>(
      HTTP_ERROR_REASON.invalidBody
    );
  }
}

function bindScopeToPlannerEnvelope(
  envelope: ReturnType<typeof parseStartRunPlannerEnvelope> extends RouteParseResult<infer T>
    ? T
    : never,
  context: ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>
): ReturnType<typeof parseStartRunPlannerEnvelope> extends RouteParseResult<infer T> ? T : never {
  return {
    ...envelope,
    observability: {
      ...(envelope.observability ?? {}),
      tags: {
        ...(envelope.observability?.tags ?? {}),
        'dvt.scope.tenantId': context.tenantId.value,
        'dvt.scope.projectId': context.projectId.value,
        'dvt.scope.environmentId': context.environmentId.value,
      },
    },
  };
}

function isPlanOwnedByScope(
  plan: ExecutionPlan,
  context: ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>
): boolean {
  const tags = plan.observability?.tags;
  if (tags === undefined) {
    return false;
  }
  return (
    tags['dvt.scope.tenantId'] === context.tenantId.value &&
    tags['dvt.scope.projectId'] === context.projectId.value &&
    tags['dvt.scope.environmentId'] === context.environmentId.value
  );
}

function mapManifestResolutionFailure(error: unknown):
  | ReturnType<typeof createHttpErrorResponse>
  | null {
  if (!isManifestArtifactResolutionError(error)) {
    return null;
  }

  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.unprocessable,
    reason: HTTP_ERROR_REASON.planRejected,
    details: {
      message: formatManifestArtifactResolutionReason(error.kind, error.detail),
      cause: mapManifestArtifactResolutionCause(error.kind),
    },
  });
}
