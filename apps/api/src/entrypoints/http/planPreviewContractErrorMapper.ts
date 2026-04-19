import { createHttpErrorResponse, HTTP_ERROR_TYPE } from './httpErrorContract.js';
import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import type { PreviewPlanContractIssue } from './planPreviewContractGuard.js';

export function mapPreviewPlanContractIssue(
  issue: PreviewPlanContractIssue
): ReturnType<typeof createHttpErrorResponse> {
  if (issue.kind === 'missingPreviewProvenance') {
    return createHttpErrorResponse({
      type: HTTP_ERROR_TYPE.unprocessable,
      reason: HTTP_ERROR_REASON.planRejected,
      details: {
        cause: 'missing_preview_provenance',
        previewProfile: issue.previewProfile,
        requiredArtifacts: [...issue.requiredArtifacts],
      },
    });
  }

  return createHttpErrorResponse({
    type: HTTP_ERROR_TYPE.badRequest,
    reason: HTTP_ERROR_REASON.invalidPlanSource,
    details: {
      cause: 'preview_contract_validation_failed',
      previewProfile: issue.previewProfile,
      issues: issue.issues.map((contractIssue) => ({
        path: contractIssue.path,
        code: contractIssue.code,
      })),
    },
  });
}
