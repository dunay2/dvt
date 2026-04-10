import type {
  ExecutionPlan,
  IPlanExecutabilityValidator,
  IPlanValidationLifecycleStore,
  IPlanner,
  PlanRef,
  RunContextSchemaT,
} from '@dvt/contracts';
import {
  asNonBlankString,
  jcsCanonicalize,
  parseRunContext,
  sha256HexUtf8,
} from '@dvt/contracts';
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
import { parsePreviewProfile, type PreviewProfilePolicy } from './previewProfilePolicy.js';
import { parsePreviewProvenance, type PreviewProvenance } from './previewProvenanceParser.js';
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

  const plannerEnvelope = parseStartRunPlannerEnvelope(parsedBody.value, selection.value);
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
    parsedBody.value,
    provenance.value
  );
  if (previewContractViolation !== null) {
    sendHttpResponse(reply, previewContractViolation);
    return;
  }

  try {
    const requestedAtIso = authz.context.authorizedAt.toISOString();
    let buildResult: Awaited<ReturnType<IPlanner['buildPlan']>>;
    try {
      buildResult = await deps.planner.buildPlan({
        ...bindScopeToPlannerEnvelope(
          plannerEnvelope.value,
          routeContext,
          provenance.value,
          previewProfile.value
        ),
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
    const responsePlanRef = normalizePlanRef(planRef);
    reply
      .code(200)
      .send(
        buildPreviewResponse(
          buildResult.plan,
          responsePlanRef,
          plannerEnvelope.value,
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
  context: ParsedStartRunScope & Pick<RunContextSchemaT, 'targetAdapter'>,
  provenance: PreviewProvenance | undefined,
  previewProfile: PreviewProfilePolicy
): ReturnType<typeof parseStartRunPlannerEnvelope> extends RouteParseResult<infer T> ? T : never {
  const observabilityExtra = envelope.observability?.extra ?? {};
  const extraWithRuntimeBinding =
    previewProfile.executor === undefined
      ? observabilityExtra
      : {
          ...observabilityExtra,
          transformationFlowRuntime: {
            previewProfile: previewProfile.previewProfile,
            executor: previewProfile.executor,
          },
        };
  const extraWithProvenance =
    provenance === undefined
      ? extraWithRuntimeBinding
      : {
          ...extraWithRuntimeBinding,
          transformationFlowProvenance: provenance,
        };
  const hasExtra = Object.keys(extraWithProvenance).length > 0;

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
      ...(hasExtra ? { extra: extraWithProvenance } : {}),
    },
  };
}

function buildPreviewResponse(
  plan: ExecutionPlan,
  planRef: PlanRef,
  envelope: ReturnType<typeof parseStartRunPlannerEnvelope> extends RouteParseResult<infer T>
    ? T
    : never,
  provenance: PreviewProvenance | undefined,
  previewProfile: PreviewProfilePolicy
): {
  previewProfile: PreviewProfilePolicy['previewProfile'];
  plan: ExecutionPlan;
  planRef: PlanRef;
  planSummary?: {
    executor: 'postgres' | 'dbt';
    nodeCount: number;
    stepCount: number;
    sourceTables: string[];
    sinkTables: string[];
  };
  persisted: {
    planRecordId: string;
    canonicalPlanSha256: string;
  };
  validation: {
    valid: true;
    warnings: string[];
  };
  provenance?: PreviewProvenance;
} {
  const canonicalPlanJson = jcsCanonicalize(plan);
  const planSummary =
    previewProfile.executor === undefined
      ? undefined
      : {
          executor: previewProfile.executor,
          nodeCount: envelope.graphSource?.nodes.length ?? plan.steps.length,
          stepCount: plan.steps.length,
          sourceTables: [],
          sinkTables: [],
        };

  return {
    previewProfile: previewProfile.previewProfile,
    plan,
    planRef,
    ...(planSummary === undefined ? {} : { planSummary }),
    persisted: {
      planRecordId: planRef.planId,
      canonicalPlanSha256: sha256HexUtf8(canonicalPlanJson),
    },
    validation: {
      valid: true,
      warnings: [],
    },
    ...(provenance === undefined ? {} : { provenance }),
  };
}

function normalizePlanRef(
  planRef: Pick<PlanRef, 'uri' | 'sha256' | 'schemaVersion' | 'planId' | 'planVersion'> & {
    sizeBytes?: number | undefined;
    expiresAt?: PlanRef['expiresAt'] | undefined;
  }
): PlanRef {
  return {
    uri: planRef.uri,
    sha256: planRef.sha256,
    schemaVersion: planRef.schemaVersion,
    planId: planRef.planId,
    planVersion: planRef.planVersion,
    ...(planRef.sizeBytes === undefined ? {} : { sizeBytes: planRef.sizeBytes }),
    ...(planRef.expiresAt === undefined ? {} : { expiresAt: planRef.expiresAt }),
  };
}

function toContractPlanRef(planRef: {
  uri: string;
  sha256: string;
  schemaVersion: string;
  planId: string;
  planVersion: string;
}): PlanRef {
  return {
    uri: asNonBlankString(planRef.uri),
    sha256: asNonBlankString(planRef.sha256),
    schemaVersion: asNonBlankString(planRef.schemaVersion),
    planId: asNonBlankString(planRef.planId),
    planVersion: asNonBlankString(planRef.planVersion),
  };
}

function validatePreviewProfileContract(
  previewProfile: PreviewProfilePolicy,
  record: Record<string, unknown>,
  provenance: PreviewProvenance | undefined
): ReturnType<typeof createHttpErrorResponse> | null {
  const activePlanSource =
    record.graphSource !== undefined && record.manifestRef === undefined
      ? 'graphSource'
      : record.manifestRef !== undefined && record.graphSource === undefined
        ? 'manifestRef'
        : null;

  if (activePlanSource !== null && !previewProfile.allowedPlanSources.includes(activePlanSource)) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.planRejected,
      details: {
        cause: 'preview_profile_source_not_allowed',
        message: `${previewProfile.previewProfile} does not allow ${activePlanSource} plan input.`,
      },
    });
  }

  if (previewProfile.provenanceRequired && provenance === undefined) {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.planRejected,
      details: {
        cause: 'missing_preview_provenance',
        message: `${previewProfile.previewProfile} requires graphArtifact and sqlArtifact provenance.`,
      },
    });
  }

  return null;
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

function mapManifestResolutionFailure(
  error: unknown
): ReturnType<typeof createHttpErrorResponse> | null {
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
