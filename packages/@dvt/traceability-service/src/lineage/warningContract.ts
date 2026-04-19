export const LINEAGE_WARNING_CODE = {
  COMPILED_CODE_RESOLUTION_FAILED: 'COMPILED_CODE_RESOLUTION_FAILED',
} as const;

export type LineageWarningCode = (typeof LINEAGE_WARNING_CODE)[keyof typeof LINEAGE_WARNING_CODE];

export const LINEAGE_WARNING_MESSAGE_KEY = {
  COMPILED_CODE_RESOLUTION_FAILED: 'traceability.lineage.warning.compiled_code_resolution_failed',
} as const;

export type LineageWarningMessageKeyName = keyof typeof LINEAGE_WARNING_MESSAGE_KEY;
export type LineageWarningMessageKey =
  (typeof LINEAGE_WARNING_MESSAGE_KEY)[LineageWarningMessageKeyName];

interface LineageWarningMessageParamMap {
  COMPILED_CODE_RESOLUTION_FAILED: {
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
    case 'COMPILED_CODE_RESOLUTION_FAILED': {
      const p = params as LineageWarningMessageParams<'COMPILED_CODE_RESOLUTION_FAILED'>;
      if (p.causeCode) {
        return `Compiled code resolution failed for ${p.storageUri}: ${p.causeCode}`;
      }
      return `Compiled code resolution failed for ${p.storageUri}`;
    }
  }

  throw new Error(`Unhandled lineage warning message key: ${String(messageKeyName)}`);
}
