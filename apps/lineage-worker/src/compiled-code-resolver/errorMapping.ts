import { URL } from 'node:url';

import {
  CompiledCodeNotFoundError,
  CompiledCodeReaderError,
  LINEAGE_ERROR_REASON_CODE,
  toLineageErrorLike,
} from '@dvt/traceability-service';

export function toCompiledCodeReaderError(sourceUri: string, error: unknown): Error {
  if (error instanceof CompiledCodeNotFoundError) {
    return error;
  }

  if (isS3NotFoundError(error)) {
    throw new CompiledCodeNotFoundError({
      cause: error,
      storageUri: sourceUri,
    });
  }

  if (error instanceof CompiledCodeReaderError) {
    return error;
  }

  if (error instanceof Error) {
    return new CompiledCodeReaderError({
      cause: error,
      reason: resolveCompiledCodeReaderReason(error),
      reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
      sourceUri,
    });
  }

  return new CompiledCodeReaderError({
    reason: resolveCompiledCodeReaderReason(error),
    reasonCode: LINEAGE_ERROR_REASON_CODE.COMPILED_CODE_READER_READ_FAILED,
    sourceUri,
  });
}

export function resolveUriScheme(uri: string): string {
  try {
    return new URL(uri).protocol.replace(/:$/u, '');
  } catch {
    return 'unknown';
  }
}

function isS3NotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const name = (error as Error & { name?: unknown }).name;
  if (name === 'NoSuchKey' || name === 'NotFound') {
    return true;
  }

  const statusCode = (error as Error & { $metadata?: { httpStatusCode?: unknown } }).$metadata
    ?.httpStatusCode;
  return statusCode === 404;
}

function resolveCompiledCodeReaderReason(error: unknown): string {
  return toLineageErrorLike(error).message;
}
