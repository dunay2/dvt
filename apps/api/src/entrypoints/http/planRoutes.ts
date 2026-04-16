import type {
  ExecutionPlan,
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanRef,
} from '@dvt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { IAuthenticator } from '../../application/ports/auth.js';
import { AuthorizeCommandScopeService } from '../../application/services/authorizeCommandScopeService.js';
import { resolveCanonicalPlannerInputEnvelope } from '../../application/services/resolveCanonicalPlannerInputEnvelope.js';

import { authorizeExecutionScope } from './authorizeExecutionScope.js';
import { extractBearerToken } from './extractBearerToken.js';
import { createHttpErrorResponse, HTTP_ERROR_TYPE, sendHttpResponse } from './httpErrorContract.js';
import { mapRouteParseIssue } from './httpErrorMapper.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { validatePreviewProfileContract } from './planPreviewContractGuard.js';
import { bindScopeToPlannerEnvelope } from './planPreviewEnvelopeBinder.js';
import {
  buildPreviewResponse,
  normalizePlanRef,
  toContractPlanRef,
} from './planPreviewResponseMapper.js';
import { parsePlanRouteContextRecord, isPlanOwnedByScope } from './planRouteScope.js';
import { parsePreviewProfile } from './previewProfilePolicy.js';
import { parsePreviewProvenance } from './previewProvenanceParser.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { parseStartRunPlanRef } from './startRunRoutePlanRefParser.js';
import { evaluateStartRunPlanSource } from './startRunRoutePlanSourcePolicy.js';
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

  const routeContextResult = parsePlanRouteContextRecord(parsedBody.value);
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

  const previewProfile = parsePreviewProfile(parsedBody.value.previewProfile);
  if (!previewProfile.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(previewProfile.issue));
    return;
  }

  const selectionInput = parsedBody.value.selectedNodeIds ?? parsedBody.value.selection;
  const selection = parseStartRunSelection(selectionInput);
  if (!selection.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(selection.issue));
    return;
  }

  const sourceDecision = evaluateStartRunPlanSource(parsedBody.value);
  if (!sourceDecision.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(sourceDecision.issue));
    return;
  }
  if (sourceDecision.value.kind !== 'plannerBacked') {
    sendHttpResponse(
      reply,
      createHttpErrorResponse({
        type: HTTP_ERROR_TYPE.badRequest,
        reason: HTTP_ERROR_REASON.invalidPlanSource,
      })
    );
    return;
  }

  const plannerEnvelope = parseStartRunPlannerEnvelope(parsedBody.value);
  if (!plannerEnvelope.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(plannerEnvelope.issue));
    return;
  }
  const provenance = parsePreviewProvenance(parsedBody.value.provenance);
  if (!provenance.ok) {
    sendHttpResponse(reply, mapRouteParseIssue(provenance.issue));
    return;
  }
  const previewContractViolation = validatePreviewProfileContract(
    previewProfile.value,
    {
      context: parsedBody.value.context,
      selectedNodeIds: selection.value,
      graphSource: plannerEnvelope.value.graphSource,
      provenance: provenance.value,
    },
    provenance.value
  );
  if (previewContractViolation !== null) {
    sendHttpResponse(reply, previewContractViolation);
    return;
  }

  try {
    const requestedAtIso = authz.context.authorizedAt.toISOString();
    const boundEnvelope = bindScopeToPlannerEnvelope(
      plannerEnvelope.value,
      routeContext,
      provenance.value,
      previewProfile.value
    );
    if (boundEnvelope.graphSource === undefined) {
      sendHttpResponse(
        reply,
        createHttpErrorResponse({
          type: HTTP_ERROR_TYPE.badRequest,
          reason: HTTP_ERROR_REASON.invalidPlanSource,
        })
      );
      return;
    }

    const canonicalEnvelope = resolveCanonicalPlannerInputEnvelope({
      ...boundEnvelope,
      graphSource: boundEnvelope.graphSource,
      selection: { selectedNodeIds: selection.value },
      requestedBy: authz.context.principal.principalId,
      requestId: request.id,
      requestedAtIso,
    });
    const buildResult = await deps.planner.buildPlan({
      ...canonicalEnvelope,
    });

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
    const responsePlanRef = normalizePlanRef(planRef);
    reply
      .code(200)
      .send(
        buildPreviewResponse(
          buildResult.plan,
          responsePlanRef,
          provenance.value,
          previewProfile.value
        )
      );
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

  const routeContextResult = parsePlanRouteContextRecord(parsedBody.value);
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
    const contractPlanRef = toContractPlanRef(planRef);
    const plan = await deps.planResolver.fetch(contractPlanRef);
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
    reply.code(200).send({ plan, planRef: normalizePlanRef(contractPlanRef) });
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
