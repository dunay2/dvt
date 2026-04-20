export const LINEAGE_ERROR_CODE = {
  COMPILED_CODE_READER_ERROR: 'COMPILED_CODE_READER_ERROR',
  COMPILED_CODE_NOT_FOUND: 'COMPILED_CODE_NOT_FOUND',
  COMPILED_CODE_INTEGRITY_ERROR: 'COMPILED_CODE_INTEGRITY_ERROR',
  COMPILED_CODE_UNSUPPORTED_SCHEME: 'COMPILED_CODE_UNSUPPORTED_SCHEME',
} as const;

export type LineageErrorCode = (typeof LINEAGE_ERROR_CODE)[keyof typeof LINEAGE_ERROR_CODE];

export const LINEAGE_ERROR_REASON_CODE = {
  COMPILED_CODE_READER_EMPTY_S3_BODY: 'COMPILED_CODE_READER_EMPTY_S3_BODY',
  COMPILED_CODE_READER_FILE_URI_PROHIBITED: 'COMPILED_CODE_READER_FILE_URI_PROHIBITED',
  COMPILED_CODE_READER_MISSING_S3_REGION: 'COMPILED_CODE_READER_MISSING_S3_REGION',
  COMPILED_CODE_READER_READ_FAILED: 'COMPILED_CODE_READER_READ_FAILED',
  COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH: 'COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH',
  COMPILED_CODE_INTEGRITY_SIZE_MISMATCH: 'COMPILED_CODE_INTEGRITY_SIZE_MISMATCH',
} as const;

type CompiledCodeReaderReasonCode =
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_EMPTY_S3_BODY
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_FILE_URI_PROHIBITED
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_MISSING_S3_REGION
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED;

type CompiledCodeIntegrityReasonCode =
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_DIGEST_MISMATCH
  | typeof LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_INTEGRITY_SIZE_MISMATCH;

export type LineageErrorReasonCode = CompiledCodeReaderReasonCode | CompiledCodeIntegrityReasonCode;

export const LINEAGE_ERROR_MESSAGE_KEY = {
  COMPILED_CODE_READER_ERROR: 'traceability.lineage.error.compiled_code_reader_error',
  COMPILED_CODE_NOT_FOUND: 'traceability.lineage.error.compiled_code_not_found',
  COMPILED_CODE_INTEGRITY_ERROR: 'traceability.lineage.error.compiled_code_integrity_error',
  COMPILED_CODE_UNSUPPORTED_SCHEME: 'traceability.lineage.error.compiled_code_unsupported_scheme',
} as const;

export type LineageErrorMessageKeyName = keyof typeof LINEAGE_ERROR_MESSAGE_KEY;
export type LineageErrorMessageKey = (typeof LINEAGE_ERROR_MESSAGE_KEY)[LineageErrorMessageKeyName];

interface LineageErrorMessageParamMap {
  COMPILED_CODE_READER_ERROR: {
    reasonCode?: CompiledCodeReaderReasonCode;
    sourceUri?: string;
    reason?: string;
  };
  COMPILED_CODE_NOT_FOUND: {
    storageUri: string;
  };
  COMPILED_CODE_INTEGRITY_ERROR: {
    reasonCode?: CompiledCodeIntegrityReasonCode;
    storageUri?: string;
    reason?: string;
  };
  COMPILED_CODE_UNSUPPORTED_SCHEME: {
    storageUri: string;
    actualScheme?: string;
    expectedScheme?: string;
  };
}

export type LineageErrorMessageParams<
  K extends LineageErrorMessageKeyName = LineageErrorMessageKeyName,
> = Readonly<LineageErrorMessageParamMap[K]>;

const EMPTY_MESSAGE_PARAMS = Object.freeze({}) as Readonly<Record<string, never>>;

export class LineageError<
  K extends LineageErrorMessageKeyName = LineageErrorMessageKeyName,
> extends Error {
  readonly cause: unknown = undefined;
  readonly details: unknown = undefined;
  readonly messageKey: (typeof LINEAGE_ERROR_MESSAGE_KEY)[K];
  readonly messageParams: LineageErrorMessageParams<K>;

  constructor(
    readonly code: LineageErrorCode,
    messageKeyName: K,
    opts?: {
      cause?: unknown;
      details?: unknown;
      message?: string;
      messageParams?: LineageErrorMessageParams<K>;
    }
  ) {
    const messageKey = LINEAGE_ERROR_MESSAGE_KEY[messageKeyName];
    const messageParams = (opts?.messageParams ??
      EMPTY_MESSAGE_PARAMS) as LineageErrorMessageParams<K>;
    super(opts?.message ?? defaultLineageErrorMessage(messageKeyName, messageParams));
    this.name = 'LineageError';
    this.cause = opts?.cause;
    this.details = opts?.details;
    this.messageKey = messageKey;
    this.messageParams = messageParams;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      messageKey: this.messageKey,
      messageParams: this.messageParams,
      message: this.message,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message,
            }
          : this.cause,
      details: this.details,
    };
  }
}

export function defaultLineageErrorMessage<K extends LineageErrorMessageKeyName>(
  messageKeyName: K,
  params: LineageErrorMessageParams<K>
): string {
  const formatter = LINEAGE_ERROR_MESSAGE_FORMATTERS[messageKeyName] as (
    value: LineageErrorMessageParams<K>
  ) => string;
  return formatter(params);
}

const LINEAGE_ERROR_MESSAGE_FORMATTERS = {
  COMPILED_CODE_READER_ERROR: (
    params: LineageErrorMessageParams<'COMPILED_CODE_READER_ERROR'>
  ): string =>
    formatReasonedLineageMessage('Compiled code read failed', {
      location: params.sourceUri,
      reason: params.reason,
      reasonCode: params.reasonCode,
    }),
  COMPILED_CODE_NOT_FOUND: (params: LineageErrorMessageParams<'COMPILED_CODE_NOT_FOUND'>): string =>
    `Compiled code not found for URI: ${params.storageUri}`,
  COMPILED_CODE_INTEGRITY_ERROR: (
    params: LineageErrorMessageParams<'COMPILED_CODE_INTEGRITY_ERROR'>
  ): string =>
    formatReasonedLineageMessage('Compiled code integrity failed', {
      location: params.storageUri,
      reason: params.reason,
      reasonCode: params.reasonCode,
    }),
  COMPILED_CODE_UNSUPPORTED_SCHEME: (
    params: LineageErrorMessageParams<'COMPILED_CODE_UNSUPPORTED_SCHEME'>
  ): string => formatUnsupportedSchemeLineageMessage(params),
} satisfies {
  [Key in LineageErrorMessageKeyName]: (params: LineageErrorMessageParams<Key>) => string;
};

function formatReasonedLineageMessage(
  baseMessage: string,
  args: {
    location: string | undefined;
    reason: string | undefined;
    reasonCode: string | undefined;
  }
): string {
  const detail = args.reason ?? args.reasonCode;
  if (args.location && detail) {
    return `${baseMessage} for ${args.location}: ${detail}`;
  }
  if (args.location) {
    return `${baseMessage} for ${args.location}`;
  }
  if (detail) {
    return `${baseMessage}: ${detail}`;
  }
  return baseMessage;
}

function formatUnsupportedSchemeLineageMessage(
  params: LineageErrorMessageParams<'COMPILED_CODE_UNSUPPORTED_SCHEME'>
): string {
  const actual = params.actualScheme ?? 'unknown';
  if (params.expectedScheme) {
    return `Unsupported compiled-code URI scheme "${actual}" for ${params.storageUri}; expected ${params.expectedScheme}`;
  }
  return `Unsupported compiled-code URI scheme "${actual}" for ${params.storageUri}`;
}
