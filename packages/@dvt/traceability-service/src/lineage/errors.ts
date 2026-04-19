import {
  LINEAGE_ERROR_CODE,
  type LineageErrorMessageKeyName,
  type LineageErrorReasonCode,
  type LineageErrorMessageParams,
  LineageError,
} from './errorContract.js';

export class CompiledCodeReaderError extends LineageError<'COMPILED_CODE_READER_ERROR'> {
  constructor(
    opts: {
      cause?: unknown;
      message?: string;
      reason?: string;
      reasonCode?: Extract<LineageErrorReasonCode, `COMPILED_CODE_READER_${string}`>;
      sourceUri?: string;
    } = {}
  ) {
    const messageParams = buildReaderMessageParams(opts);
    super(
      LINEAGE_ERROR_CODE.COMPILED_CODE_READER_ERROR,
      'COMPILED_CODE_READER_ERROR',
      buildLineageSuperOptions<'COMPILED_CODE_READER_ERROR'>(messageParams, opts)
    );
    this.name = 'CompiledCodeReaderError';
  }
}

export class CompiledCodeNotFoundError extends LineageError<'COMPILED_CODE_NOT_FOUND'> {
  constructor(opts: { cause?: unknown; message?: string; storageUri: string }) {
    const messageParams = { storageUri: opts.storageUri } as const;
    super(
      LINEAGE_ERROR_CODE.COMPILED_CODE_NOT_FOUND,
      'COMPILED_CODE_NOT_FOUND',
      buildLineageSuperOptions<'COMPILED_CODE_NOT_FOUND'>(messageParams, opts)
    );
    this.name = 'CompiledCodeNotFoundError';
  }
}

export class CompiledCodeIntegrityError extends LineageError<'COMPILED_CODE_INTEGRITY_ERROR'> {
  constructor(
    opts: {
      cause?: unknown;
      message?: string;
      reason?: string;
      reasonCode?: Extract<LineageErrorReasonCode, `COMPILED_CODE_INTEGRITY_${string}`>;
      storageUri?: string;
    } = {}
  ) {
    const messageParams = buildIntegrityMessageParams(opts);
    super(
      LINEAGE_ERROR_CODE.COMPILED_CODE_INTEGRITY_ERROR,
      'COMPILED_CODE_INTEGRITY_ERROR',
      buildLineageSuperOptions<'COMPILED_CODE_INTEGRITY_ERROR'>(messageParams, opts)
    );
    this.name = 'CompiledCodeIntegrityError';
  }
}

export class CompiledCodeUnsupportedSchemeError extends LineageError<'COMPILED_CODE_UNSUPPORTED_SCHEME'> {
  constructor(opts: {
    actualScheme?: string;
    cause?: unknown;
    expectedScheme?: string;
    message?: string;
    storageUri: string;
  }) {
    const messageParams = buildUnsupportedSchemeMessageParams(opts);
    super(
      LINEAGE_ERROR_CODE.COMPILED_CODE_UNSUPPORTED_SCHEME,
      'COMPILED_CODE_UNSUPPORTED_SCHEME',
      buildLineageSuperOptions<'COMPILED_CODE_UNSUPPORTED_SCHEME'>(messageParams, opts)
    );
    this.name = 'CompiledCodeUnsupportedSchemeError';
  }
}

function buildReaderMessageParams(args: {
  reason?: string;
  reasonCode?: Extract<LineageErrorReasonCode, `COMPILED_CODE_READER_${string}`>;
  sourceUri?: string;
}): LineageErrorMessageParams<'COMPILED_CODE_READER_ERROR'> {
  return {
    ...withOptionalField('reasonCode', args.reasonCode),
    ...withOptionalField('sourceUri', args.sourceUri),
    ...withOptionalField('reason', args.reason),
  };
}

function buildIntegrityMessageParams(args: {
  reason?: string;
  reasonCode?: Extract<LineageErrorReasonCode, `COMPILED_CODE_INTEGRITY_${string}`>;
  storageUri?: string;
}): LineageErrorMessageParams<'COMPILED_CODE_INTEGRITY_ERROR'> {
  return {
    ...withOptionalField('reasonCode', args.reasonCode),
    ...withOptionalField('storageUri', args.storageUri),
    ...withOptionalField('reason', args.reason),
  };
}

function buildUnsupportedSchemeMessageParams(args: {
  actualScheme?: string;
  expectedScheme?: string;
  storageUri: string;
}): LineageErrorMessageParams<'COMPILED_CODE_UNSUPPORTED_SCHEME'> {
  return {
    storageUri: args.storageUri,
    ...withOptionalField('actualScheme', args.actualScheme),
    ...withOptionalField('expectedScheme', args.expectedScheme),
  };
}

function buildLineageSuperOptions<K extends LineageErrorMessageKeyName>(
  messageParams: LineageErrorMessageParams<K>,
  opts: {
    cause?: unknown;
    message?: string;
  }
): {
  cause?: unknown;
  message?: string;
  messageParams: LineageErrorMessageParams<K>;
} {
  return {
    ...withOptionalField('cause', opts.cause),
    ...withOptionalField('message', opts.message),
    messageParams,
  };
}

function withOptionalField<K extends string, V>(
  key: K,
  value: V | undefined
): Partial<Record<K, V>> {
  if (value === undefined) {
    return {};
  }

  return { [key]: value } as Record<K, V>;
}
