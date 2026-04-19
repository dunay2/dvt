import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parsePlanRouteContextRecord, type ParsedPlanRouteContext } from './planRouteScope.js';
import { parsePreviewProfile, type PreviewProfilePolicy } from './previewProfilePolicy.js';
import { parsePreviewProvenance, type PreviewProvenance } from './previewProvenanceParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunPlannerEnvelope } from './startRunRoutePlannerEnvelopeMapper.js';
import { evaluateStartRunPlanSource } from './startRunRoutePlanSourcePolicy.js';
import { parseStartRunSelection } from './startRunRouteSelectionParser.js';

export interface PreviewPlanContractRequest {
  readonly context: unknown;
  readonly selectedNodeIds: readonly string[];
  readonly graphSource: PreviewPlanCommand['graphSource'];
  readonly provenance: PreviewProvenance | undefined;
}

export interface ParsedPreviewPlanRequest {
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfilePolicy;
  readonly contractRequest: PreviewPlanContractRequest;
  readonly command: PreviewPlanCommand;
}

type PreviewPlanBodyRecord = Record<string, unknown>;

type ParsedPreviewRoutePolicy = {
  readonly routeContext: ParsedPlanRouteContext;
  readonly previewProfile: PreviewProfilePolicy;
};

type PreviewPlannerCommandFields = {
  readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  readonly policies?: PreviewPlanCommand['policies'];
  readonly environment?: PreviewPlanCommand['environment'];
  readonly observability?: PreviewPlanCommand['observability'];
};

type ParsedPreviewCommandInput = PreviewPlannerCommandFields & {
  readonly selectedNodeIds: readonly string[];
  readonly provenance: PreviewProvenance | undefined;
};

export function parsePreviewPlanBody(body: unknown): RouteParseResult<ParsedPreviewPlanRequest> {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const routePolicy = parsePreviewRoutePolicy(bodyRecord.value);
  if (!routePolicy.ok) {
    return routePolicy;
  }

  const commandInput = parsePreviewCommandInput(bodyRecord.value);
  if (!commandInput.ok) {
    return commandInput;
  }

  return {
    ok: true,
    value: createParsedPreviewPlanRequest(bodyRecord.value, routePolicy.value, commandInput.value),
  };
}

function parsePreviewRoutePolicy(
  record: PreviewPlanBodyRecord
): RouteParseResult<ParsedPreviewRoutePolicy> {
  const routeContext = parsePlanRouteContextRecord(record);
  if (!routeContext.ok) {
    return routeContext;
  }

  const previewProfile = parsePreviewProfile(record.previewProfile);
  if (!previewProfile.ok) {
    return previewProfile;
  }

  return {
    ok: true,
    value: {
      routeContext: routeContext.value,
      previewProfile: previewProfile.value,
    },
  };
}

function parsePreviewCommandInput(
  record: PreviewPlanBodyRecord
): RouteParseResult<ParsedPreviewCommandInput> {
  const selectionInput = record.selectedNodeIds ?? record.selection;
  const selection = parseStartRunSelection(selectionInput);
  if (!selection.ok) {
    return selection;
  }

  const plannerCommandFields = parsePreviewPlannerCommandFields(record);
  if (!plannerCommandFields.ok) {
    return plannerCommandFields;
  }

  const provenance = parsePreviewProvenance(record.provenance);
  if (!provenance.ok) {
    return provenance;
  }

  return {
    ok: true,
    value: {
      selectedNodeIds: selection.value,
      provenance: provenance.value,
      ...plannerCommandFields.value,
    },
  };
}

function parsePreviewPlannerCommandFields(
  record: PreviewPlanBodyRecord
): RouteParseResult<PreviewPlannerCommandFields> {
  const sourceDecision = evaluateStartRunPlanSource(record);
  if (!sourceDecision.ok) {
    return sourceDecision;
  }

  if (sourceDecision.value.kind !== 'plannerBacked') {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  const plannerEnvelope = parseStartRunPlannerEnvelope(record);
  if (!plannerEnvelope.ok) {
    return plannerEnvelope;
  }

  const graphSource = plannerEnvelope.value.graphSource;
  if (graphSource === undefined) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  return {
    ok: true,
    value: {
      graphSource,
      ...(plannerEnvelope.value.policies === undefined
        ? {}
        : { policies: plannerEnvelope.value.policies }),
      ...(plannerEnvelope.value.environment === undefined
        ? {}
        : { environment: plannerEnvelope.value.environment }),
      ...(plannerEnvelope.value.observability === undefined
        ? {}
        : { observability: plannerEnvelope.value.observability }),
    },
  };
}

function createParsedPreviewPlanRequest(
  record: PreviewPlanBodyRecord,
  routePolicy: ParsedPreviewRoutePolicy,
  commandInput: ParsedPreviewCommandInput
): ParsedPreviewPlanRequest {
  return {
    routeContext: routePolicy.routeContext,
    previewProfile: routePolicy.previewProfile,
    contractRequest: buildPreviewContractRequest(record, commandInput),
    command: buildPreviewPlanCommand(routePolicy, commandInput),
  };
}

function buildPreviewContractRequest(
  record: PreviewPlanBodyRecord,
  commandInput: ParsedPreviewCommandInput
): PreviewPlanContractRequest {
  return {
    context: record.context,
    selectedNodeIds: commandInput.selectedNodeIds,
    graphSource: commandInput.graphSource,
    provenance: commandInput.provenance,
  };
}

function buildPreviewPlanCommand(
  routePolicy: ParsedPreviewRoutePolicy,
  commandInput: ParsedPreviewCommandInput
): PreviewPlanCommand {
  return {
    tenantId: routePolicy.routeContext.tenantId.value,
    projectId: routePolicy.routeContext.projectId.value,
    environmentId: routePolicy.routeContext.environmentId.value,
    targetAdapter: routePolicy.routeContext.targetAdapter,
    graphSource: commandInput.graphSource,
    selection: { selectedNodeIds: commandInput.selectedNodeIds },
    previewProfile: buildPreviewPlanProfile(routePolicy.previewProfile),
    ...(commandInput.provenance === undefined ? {} : { provenance: commandInput.provenance }),
    ...(commandInput.policies === undefined ? {} : { policies: commandInput.policies }),
    ...(commandInput.environment === undefined
      ? {}
      : { environment: commandInput.environment }),
    ...(commandInput.observability === undefined
      ? {}
      : { observability: commandInput.observability }),
  };
}

function buildPreviewPlanProfile(
  previewProfile: PreviewProfilePolicy
): PreviewPlanCommand['previewProfile'] {
  return previewProfile.executor === undefined
    ? {
        previewProfile: previewProfile.previewProfile,
      }
    : {
        previewProfile: previewProfile.previewProfile,
        executor: previewProfile.executor,
      };
}
