import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parsePlanRoutePlannerEnvelope } from './planRoutePlannerEnvelopeParser.js';
import { evaluatePlanRoutePlanSource } from './planRoutePlanSourcePolicy.js';
import { parsePlanRouteSelection } from './planRouteSelectionParser.js';
import { type PreviewProvenance, parsePreviewProvenance } from './previewProvenanceParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export interface ParsedPreviewCommandInput {
  readonly selectedNodeIds: readonly string[];
  readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  readonly provenance: PreviewProvenance | undefined;
  readonly policies?: PreviewPlanCommand['policies'];
  readonly environment?: PreviewPlanCommand['environment'];
  readonly observability?: PreviewPlanCommand['observability'];
}

export function parsePreviewCommandInput(
  record: Record<string, unknown>
): RouteParseResult<ParsedPreviewCommandInput> {
  const selectionInput = record.selectedNodeIds ?? record.selection;
  const selection = parsePlanRouteSelection(selectionInput);
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

interface PreviewPlannerCommandFields {
  readonly graphSource: NonNullable<PreviewPlanCommand['graphSource']>;
  readonly policies?: PreviewPlanCommand['policies'];
  readonly environment?: PreviewPlanCommand['environment'];
  readonly observability?: PreviewPlanCommand['observability'];
}

function parsePreviewPlannerCommandFields(
  record: Record<string, unknown>
): RouteParseResult<PreviewPlannerCommandFields> {
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
