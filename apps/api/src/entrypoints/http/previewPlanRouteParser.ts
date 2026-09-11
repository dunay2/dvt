import {
  parsePlanPreviewRequest,
  PreviewProfileSchema,
  toValidationErrorResponse,
  type ExecutionPlan,
  type PlanPreviewProvenance,
  type PreviewProfile,
} from '@dvt/contracts';

import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parsePlanRouteBodyRecord } from './planRouteBodyParser.js';
import { toPlanRouteGraphSource } from './planRoutePlannerEnvelopeParser.js';
import { evaluatePlanRoutePlanSource } from './planRoutePlanSourcePolicy.js';
import { toParsedPlanRouteContext, type ParsedPlanRouteContext } from './planRouteScope.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

type CanonicalPreviewRequest = ReturnType<typeof parsePlanPreviewRequest>;

export interface ParsedPreviewPlanRequest {
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfile;
  readonly contractRequest: CanonicalPreviewRequest;
  readonly command: PreviewPlanCommand;
}

export function parsePreviewPlanBody(body: unknown): RouteParseResult<ParsedPreviewPlanRequest> {
  const bodyRecord = parsePlanRouteBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }
  if (bodyRecord.value.context === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  if (!PreviewProfileSchema.safeParse(bodyRecord.value.previewProfile).success) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPreviewProfile, {
      target: 'previewProfile',
    });
  }

  const sourceDecision = evaluatePlanRoutePlanSource(bodyRecord.value, {
    allowProtectedDvtGraph: true,
  });
  if (!sourceDecision.ok) {
    return sourceDecision;
  }
  if (sourceDecision.value.kind !== 'plannerBacked') {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  let contractRequest: CanonicalPreviewRequest;
  try {
    contractRequest = parsePlanPreviewRequest(bodyRecord.value);
  } catch (error) {
    return mapPreviewContractError(error);
  }

  const routeContext = toParsedPlanRouteContext(contractRequest.context);
  if (!routeContext.ok) {
    return routeContext;
  }

  const observability = buildPreviewObservability(routeContext.value, contractRequest.provenance);
  const command = buildPreviewPlanCommand(contractRequest, routeContext.value, observability);

  return {
    ok: true,
    value: {
      routeContext: routeContext.value,
      previewProfile: contractRequest.previewProfile,
      contractRequest,
      command,
    },
  };
}

function buildPreviewPlanCommand(
  request: CanonicalPreviewRequest,
  context: ParsedPlanRouteContext,
  observability: NonNullable<ExecutionPlan['observability']>
): PreviewPlanCommand {
  const common = {
    targetAdapter: context.targetAdapter,
    selection: request.selection,
    observability,
  };

  if (request.graphSource === undefined) {
    if (request.provenance?.kind !== 'dvt-protected-workspace-graph') {
      throw new Error('Validated Preview request is missing its graph authority.');
    }
    return {
      ...common,
      provenance: request.provenance,
    };
  }

  return {
    ...common,
    graphSource: toPlanRouteGraphSource(request.graphSource),
    ...(request.provenance === undefined ? {} : { provenance: request.provenance }),
  };
}

function mapPreviewContractError(error: unknown): RouteParseResult<ParsedPreviewPlanRequest> {
  const validation = toValidationErrorResponse(error);
  const issues = deduplicateIssues(validation.details);
  const roots = new Set(issues.map((issue) => issue.path.split('.')[0]));

  if (roots.has('previewProfile')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPreviewProfile, {
      target: 'previewProfile',
    });
  }
  if (roots.has('context')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }
  if (roots.has('selection')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidSelection, { target: 'selection' });
  }
  if (roots.has('provenance')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }
  if (roots.has('graphSource')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return badRequestResult(HTTP_ERROR_REASON.invalidBody);
}

function deduplicateIssues(
  issues: ReadonlyArray<{ readonly path: string; readonly code: string; readonly message?: string }>
): ReadonlyArray<{ readonly path: string; readonly code: string }> {
  const seen = new Set<string>();
  const uniqueIssues: Array<{ readonly path: string; readonly code: string }> = [];
  for (const issue of issues) {
    const key = `${issue.path}:${issue.code}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueIssues.push({ path: issue.path, code: issue.code });
  }
  return uniqueIssues;
}

function buildPreviewObservability(
  context: ParsedPlanRouteContext,
  provenance: PlanPreviewProvenance | undefined
): NonNullable<ExecutionPlan['observability']> {
  const extra = {
    ...(provenance === undefined ? {} : { planPreviewProvenance: provenance }),
  };

  return {
    tags: {
      'dvt.scope.tenantId': context.tenantId.value,
      'dvt.scope.projectId': context.projectId.value,
      'dvt.scope.environmentId': context.environmentId.value,
    },
    ...(Object.keys(extra).length === 0 ? {} : { extra }),
  };
}
