/**
 * @file packages/@dvt/traceability-service/src/lineage/mapper/mapCompiledCodeResolutionWarning.ts
 * @baseline ADR-0032: compiledCodeRef Ownership
 * @decision Map compiled-code resolution failures into stable lineage warnings
 * @consequence OpenLineage output can degrade gracefully while preserving storage URI and cause diagnostics
 * @version 0.1.0
 */
import type { CompiledCodeRef } from '@dvt/contracts';

import {
  extractStructuredErrorMetadata,
  sanitizeLineageErrorForPersistence,
} from '../errorSupport.js';
import {
  defaultLineageWarningMessage,
  LINEAGE_WARNING_CODE,
  LINEAGE_WARNING_MESSAGE_KEY,
  type LineageWarning,
  type LineageWarningMessageParams,
} from '../warningContract.js';

export function mapCompiledCodeResolutionWarning(args: {
  error: unknown;
  ref: CompiledCodeRef;
}): LineageWarning {
  const { error, ref } = args;
  const metadata = extractStructuredErrorMetadata(error);
  const messageParams: LineageWarningMessageParams<'COMPILED_CODE_RESOLUTION_FAILED'> = {
    storageUri: ref.storageUri,
    ...(metadata.code ? { causeCode: metadata.code } : {}),
    ...(metadata.messageKey ? { causeMessageKey: metadata.messageKey } : {}),
  };
  const diagnosticMessage = sanitizeLineageErrorForPersistence(
    error instanceof Error ? error.message : String(error)
  );

  return {
    code: LINEAGE_WARNING_CODE.COMPILED_CODE_RESOLUTION_FAILED,
    messageKey: LINEAGE_WARNING_MESSAGE_KEY.COMPILED_CODE_RESOLUTION_FAILED,
    messageParams,
    message:
      diagnosticMessage.length > 0
        ? diagnosticMessage
        : defaultLineageWarningMessage('COMPILED_CODE_RESOLUTION_FAILED', messageParams),
  };
}
