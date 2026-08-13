import type { ExecutionSelection } from '@dvt/contracts';

import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { bindScopeToPlannerEnvelope } from './planPreviewEnvelopeBinder.js';
import { parsePlanRouteBodyRecord } from './planRouteBodyParser.js';
import {
  parsePlanRoutePlannerEnvelope,
  type ParsedPlanRoutePlannerEnvelope,
} from './planRoutePlannerEnvelopeParser.js';
import { evaluatePlanRoutePlanSource } from './planRoutePlanSourcePolicy.js';
import { type ParsedPlanRouteContext, parsePlanRouteContextRecord } from './planRouteScope.js';
import { parsePlanRouteSelection } from './planRouteSelectionParser.js';
import { type PreviewProfilePolicy, parsePreviewProfile } from './previewProfilePolicy.js';
import { type PreviewProvenance, parsePreviewProvenance } from './previewProvenanceParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export interface PreviewPlanContractRequest {
  readonly context: unknown;
  readonly selection: ExecutionSelection;
  readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  readonly provenance: PreviewProvenance | undefined;
}

export interface ParsedPreviewPlanRequest {
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfilePolicy;
  readonly contractRequest: PreviewPlanContractRequest;
  readonly command: PreviewPlanCommand;
}

export function parsePreviewPlanBody(body: unknown): RouteParseResult<ParsedPreviewPlanRequest> {
  const bodyRecord = parsePlanRouteBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const routeContext = parsePlanRouteContextRecord(bodyRecord.value);
  if (!routeContext.ok) {
    return routeContext;
  }

  const previewProfile = parsePreviewProfile(bodyRecord.value.previewProfile);
  if (!previewProfile.ok) {
    return previewProfile;
  }

  const selection = parsePlanRouteSelection(bodyRecord.value.selection);
  if (!selection.ok) {
    return selection;
  }

  const plannerEnvelope = parsePreviewPlannerEnvelope(bodyRecord.value);
  if (!plannerEnvelope.ok) {
    return plannerEnvelope;
  }

  const provenance = parsePreviewProvenance(bodyRecord.value.provenance);
  if (!provenance.ok) {
    return provenance;
  }

  return {
    ok: true,
    value: bindPreviewPlanRequest({
      record: bodyRecord.value,
      routeContext: routeContext.value,
      previewProfile: previewProfile.value,
      selection: selection.value,
      plannerEnvelope: plannerEnvelope.value,
      provenance: provenance.value,
    }),
  };
}

function parsePreviewPlannerEnvelope(
  record: Record<string, unknown>
): RouteParseResult<
  ParsedPlanRoutePlannerEnvelope & {
    readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  }
> {
  const sourceDecision = evaluatePlanRoutePlanSource(record);
  if (!sourceDecision.ok) {
    return sourceDecision;
  }
  if (sourceDecision.value.kind !== 'plannerBacked') {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const plannerEnvelope = parsePlanRoutePlannerEnvelope(record);
  if (!plannerEnvelope.ok) {
    return plannerEnvelope;
  }
  if (plannerEnvelope.value.graphSource === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return {
    ok: true,
    value: {
      ...plannerEnvelope.value,
      graphSource: plannerEnvelope.value.graphSource,
    },
  };
}

function bindPreviewPlanRequest(input: {
  readonly record: Record<string, unknown>;
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfilePolicy;
  readonly selection: ExecutionSelection;
  readonly plannerEnvelope: ParsedPlanRoutePlannerEnvelope & {
    readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  };
  readonly provenance: PreviewProvenance | undefined;
}): ParsedPreviewPlanRequest {
  const plannerEnvelope = bindScopeToPlannerEnvelope(
    input.plannerEnvelope,
    input.routeContext,
    input.provenance,
    input.previewProfile
  );

  return {
    routeContext: input.routeContext,
    previewProfile: input.previewProfile,
    contractRequest: {
      context: input.record.context,
      selection: input.selection,
      graphSource: input.plannerEnvelope.graphSource,
      provenance: input.provenance,
    },
    command: {
      targetAdapter: input.routeContext.targetAdapter,
      graphSource: input.plannerEnvelope.graphSource,
      selection: input.selection,
      ...(input.provenance === undefined ? {} : { provenance: input.provenance }),
      ...(plannerEnvelope.policies === undefined ? {} : { policies: plannerEnvelope.policies }),
      ...(plannerEnvelope.environment === undefined
        ? {}
        : { environment: plannerEnvelope.environment }),
      ...(plannerEnvelope.observability === undefined
        ? {}
        : { observability: plannerEnvelope.observability }),
    },
  };
}
