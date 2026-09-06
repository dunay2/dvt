/**
 * Stable lineage warning contract for fail-open artifact reads.
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @decision Preserve bounded generic artifact read warnings in lineage events
 * @consequence Read failures do not restore the retired compiled-code resolver
 * @version 1.0.0
 */
export const LINEAGE_WARNING_CODE = {
  ARTIFACT_READ_FAILED: 'ARTIFACT_READ_FAILED',
} as const;

export type LineageWarningCode = (typeof LINEAGE_WARNING_CODE)[keyof typeof LINEAGE_WARNING_CODE];

export const LINEAGE_WARNING_MESSAGE_KEY = {
  ARTIFACT_READ_FAILED: 'traceability.lineage.warning.artifact_read_failed',
} as const;

export type LineageWarningMessageKeyName = keyof typeof LINEAGE_WARNING_MESSAGE_KEY;
export type LineageWarningMessageKey =
  (typeof LINEAGE_WARNING_MESSAGE_KEY)[LineageWarningMessageKeyName];

interface LineageWarningMessageParamMap {
  ARTIFACT_READ_FAILED: {
    storageUri: string;
    causeCode?: string;
    causeMessageKey?: string;
  };
}

export type LineageWarningMessageParams<
  K extends LineageWarningMessageKeyName = LineageWarningMessageKeyName,
> = Readonly<LineageWarningMessageParamMap[K]>;

export interface LineageWarning {
  code: LineageWarningCode;
  messageKey: LineageWarningMessageKey;
  messageParams: LineageWarningMessageParams;
  message: string;
}

export function defaultLineageWarningMessage<K extends LineageWarningMessageKeyName>(
  messageKeyName: K,
  params: LineageWarningMessageParams<K>
): string {
  switch (messageKeyName) {
    case 'ARTIFACT_READ_FAILED': {
      const p = params as LineageWarningMessageParams<'ARTIFACT_READ_FAILED'>;
      if (p.causeCode) {
        return `Artifact read failed for ${p.storageUri}: ${p.causeCode}`;
      }
      return `Artifact read failed for ${p.storageUri}`;
    }
  }

  throw new Error(`Unhandled lineage warning message key: ${String(messageKeyName)}`);
}
