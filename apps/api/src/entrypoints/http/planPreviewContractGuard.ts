import { parsePlanPreviewRequest } from '@dvt/contracts';

import { createHttpErrorResponse, HTTP_ERROR_TYPE } from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import type { PreviewProfilePolicy } from './previewProfilePolicy.js';
import type { PreviewProvenance } from './previewProvenanceParser.js';

export function validatePreviewProfileContract(
  previewProfile: PreviewProfilePolicy,
  request: {
    context: unknown;
    selectedNodeIds: readonly string[];
    graphSource: unknown;
    provenance: PreviewProvenance | undefined;
  },
  provenance: PreviewProvenance | undefined
): ReturnType<typeof createHttpErrorResponse> | null {
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

  try {
    parsePlanPreviewRequest({
      previewProfile: previewProfile.previewProfile,
      context: request.context,
      selectedNodeIds: request.selectedNodeIds,
      graphSource: request.graphSource,
      ...(request.provenance === undefined ? {} : { provenance: request.provenance }),
      persist: true,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Preview request failed contract validation.';
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.badRequest,
      reason: HTTP_ERROR_REASON.invalidPlanSource,
      details: {
        cause: 'preview_contract_validation_failed',
        message,
      },
    });
  }

  return null;
}
