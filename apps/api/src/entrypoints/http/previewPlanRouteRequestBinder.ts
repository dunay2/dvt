import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

import { bindScopeToPlannerEnvelope } from './planPreviewEnvelopeBinder.js';
import type { ParsedPreviewCommandInput } from './previewPlanRouteCommandParser.js';
import type { ParsedPreviewRoutePolicy } from './previewPlanRoutePolicyParser.js';
import type { PreviewProvenance } from './previewProvenanceParser.js';

export interface PreviewPlanContractRequest {
  readonly context: unknown;
  readonly selectedNodeIds: readonly string[];
  readonly graphSource: PreviewPlanCommand['graphSource'];
  readonly provenance: PreviewProvenance | undefined;
}

export interface ParsedPreviewPlanRequest {
  readonly routeContext: ParsedPreviewRoutePolicy['routeContext'];
  readonly previewProfile: ParsedPreviewRoutePolicy['previewProfile'];
  readonly contractRequest: PreviewPlanContractRequest;
  readonly command: PreviewPlanCommand;
}

export function createParsedPreviewPlanRequest(
  record: Record<string, unknown>,
  routePolicy: ParsedPreviewRoutePolicy,
  commandInput: ParsedPreviewCommandInput
): ParsedPreviewPlanRequest {
  const plannerEnvelope = bindScopeToPlannerEnvelope(
    {
      graphSource: commandInput.graphSource,
      ...(commandInput.policies === undefined ? {} : { policies: commandInput.policies }),
      ...(commandInput.environment === undefined
        ? {}
        : { environment: commandInput.environment }),
      ...(commandInput.observability === undefined
        ? {}
        : { observability: commandInput.observability }),
    },
    routePolicy.routeContext,
    commandInput.provenance,
    routePolicy.previewProfile
  );

  return {
    routeContext: routePolicy.routeContext,
    previewProfile: routePolicy.previewProfile,
    contractRequest: {
      context: record.context,
      selectedNodeIds: commandInput.selectedNodeIds,
      graphSource: commandInput.graphSource,
      provenance: commandInput.provenance,
    },
    command: {
      targetAdapter: routePolicy.routeContext.targetAdapter,
      graphSource: commandInput.graphSource,
      selection: { selectedNodeIds: commandInput.selectedNodeIds },
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
