import type { PreviewPlanCommand } from '../../application/services/PreviewPlanUseCase.js';

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
      tenantId: routePolicy.routeContext.tenantId.value,
      projectId: routePolicy.routeContext.projectId.value,
      environmentId: routePolicy.routeContext.environmentId.value,
      targetAdapter: routePolicy.routeContext.targetAdapter,
      graphSource: commandInput.graphSource,
      selection: { selectedNodeIds: commandInput.selectedNodeIds },
      previewProfile: buildPreviewPlanProfile(routePolicy),
      ...(commandInput.provenance === undefined
        ? {}
        : { provenance: commandInput.provenance }),
      ...(commandInput.policies === undefined ? {} : { policies: commandInput.policies }),
      ...(commandInput.environment === undefined
        ? {}
        : { environment: commandInput.environment }),
      ...(commandInput.observability === undefined
        ? {}
        : { observability: commandInput.observability }),
    },
  };
}

function buildPreviewPlanProfile(
  routePolicy: ParsedPreviewRoutePolicy
): PreviewPlanCommand['previewProfile'] {
  return routePolicy.previewProfile.executor === undefined
    ? {
        previewProfile: routePolicy.previewProfile.previewProfile,
      }
    : {
        previewProfile: routePolicy.previewProfile.previewProfile,
        executor: routePolicy.previewProfile.executor,
      };
}
