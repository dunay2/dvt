/**
 * Owned concern: map canonical artifact read failures into bounded lineage warnings.
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @decision Preserve structured artifact errors through the existing lineage warning contract
 * @consequence Artifact failures remain fail-open for lineage without a legacy resolver path
 * @version 1.0.0
 */
import type { StepArtifactRef } from '@dvt/contracts';

import { toLineageErrorLike } from '../errorSupport.js';
import {
  defaultLineageWarningMessage,
  LINEAGE_WARNING_CODE,
  LINEAGE_WARNING_MESSAGE_KEY,
  type LineageWarning,
  type LineageWarningMessageParams,
} from '../warningContract.js';

export function mapArtifactReadWarning(args: {
  error: unknown;
  ref: StepArtifactRef;
}): LineageWarning {
  const { error, ref } = args;
  const metadata = toLineageErrorLike(error);
  const messageParams: LineageWarningMessageParams<'ARTIFACT_READ_FAILED'> = {
    storageUri: ref.storageUri,
    ...(metadata.code ? { causeCode: metadata.code } : {}),
    ...(metadata.messageKey ? { causeMessageKey: metadata.messageKey } : {}),
  };
  const diagnosticMessage = metadata.message;

  return {
    code: LINEAGE_WARNING_CODE.ARTIFACT_READ_FAILED,
    messageKey: LINEAGE_WARNING_MESSAGE_KEY.ARTIFACT_READ_FAILED,
    messageParams,
    message:
      diagnosticMessage.length > 0
        ? diagnosticMessage
        : defaultLineageWarningMessage('ARTIFACT_READ_FAILED', messageParams),
  };
}
