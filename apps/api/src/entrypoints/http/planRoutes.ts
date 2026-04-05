import type { IPlanValidationLifecycleStore, IPlanner, PlanRef } from '@dvt/contracts';
import { parseRunContext } from '@dvt/contracts';
import type { ExecutionPlan } from '@dvt/engine';
import type { FastifyReply, FastifyRequest } from 'fastify';

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

  const scopeResult = parseScopeFromContextRecord(parsedBody.value);
  if (!scopeResult.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(scopeResult.issue));
    return;
  }

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: scopeResult.value.tenantId,
      projectId: scopeResult.value.projectId,
      environmentId: scopeResult.value.environmentId,
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
    const buildResult = await deps.planner.buildPlan({
      ...plannerEnvelope.value,
      selection: { selectedNodeIds: selection.value },
      requestedBy: authz.context.principal.principalId,
      requestId: request.id,
      requestedAtIso: authz.context.authorizedAt.toISOString(),
    });
    const planRef = await deps.planStore.storePlan(buildResult);
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

  const scopeResult = parseScopeFromContextRecord(parsedBody.value);
  if (!scopeResult.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(scopeResult.issue));
    return;
  }

  const authz = await authorizeExecutionScope({
    authenticator: deps.authenticator,
    authorizer: deps.authorizer,
    token: extractBearerToken(request.headers.authorization),
    requestId: request.id,
    requestedScope: {
      tenantId: scopeResult.value.tenantId,
      projectId: scopeResult.value.projectId,
      environmentId: scopeResult.value.environmentId,
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

function parseScopeFromContextRecord(
  record: Record<string, unknown>
): RouteParseResult<ParsedStartRunScope> {
  if (
    record.context === undefined ||
    record.context === null ||
    typeof record.context !== 'object'
  ) {
    return badRequestResult<ParsedStartRunScope>(HTTP_ERROR_REASON.invalidBody);
  }

  try {
    const context = parseRunContext(record.context);
    return parseStartRunScope({
      tenantId: context.tenantId,
      projectId: context.projectId,
      environmentId: context.environmentId,
    });
  } catch {
    return badRequestResult<ParsedStartRunScope>(HTTP_ERROR_REASON.invalidBody);
  }
}
