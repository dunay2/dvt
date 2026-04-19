import { parsePlanPreviewRequest, toValidationErrorResponse } from '@dvt/contracts';

import type { PreviewProfilePolicy } from './previewProfilePolicy.js';
import type { PreviewProvenance } from './previewProvenanceParser.js';

export type PreviewPlanContractIssue =
  | {
      readonly kind: 'missingPreviewProvenance';
      readonly previewProfile: PreviewProfilePolicy['previewProfile'];
      readonly requiredArtifacts: readonly ['graphArtifact', 'sqlArtifact'];
    }
  | {
      readonly kind: 'previewContractValidationFailed';
      readonly previewProfile: PreviewProfilePolicy['previewProfile'];
      readonly issues: ReadonlyArray<{
        readonly path: string;
        readonly code: string;
      }>;
    };

export function validatePreviewProfileContract(
  previewProfile: PreviewProfilePolicy,
  request: {
    context: unknown;
    selectedNodeIds: readonly string[];
    graphSource: unknown;
    provenance: PreviewProvenance | undefined;
  }
): PreviewPlanContractIssue | null {
  if (previewProfile.provenanceRequired && request.provenance === undefined) {
    return {
      kind: 'missingPreviewProvenance',
      previewProfile: previewProfile.previewProfile,
      requiredArtifacts: ['graphArtifact', 'sqlArtifact'],
    };
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
    const validation = toValidationErrorResponse(error);
    return {
      kind: 'previewContractValidationFailed',
      previewProfile: previewProfile.previewProfile,
      issues: validation.details.map((issue) => ({
        path: issue.path,
        code: issue.code,
      })),
    };
  }

  return null;
}
