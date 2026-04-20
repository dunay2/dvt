import {
  extractStructuredErrorMetadata,
  sanitizeLineageErrorForPersistence,
  type StructuredLineageErrorMetadata,
} from './errorPersistenceSupport.js';

export interface LineageErrorLike {
  code?: string;
  message: string;
  messageKey?: string;
  messageParams?: Readonly<Record<string, unknown>>;
  name: string;
}

export function isLineageAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function toLineageErrorLike(error: unknown): LineageErrorLike {
  const metadata = extractStructuredErrorMetadata(error);

  if (error instanceof Error) {
    return toLineageErrorLikeFromError(error, metadata);
  }

  if (isObjectLike(error)) {
    return toLineageErrorLikeFromObject(error, metadata);
  }

  return {
    ...metadata,
    message: sanitizeLineageErrorForPersistence(stringifyPrimitiveError(error)),
    name: 'UnknownError',
  };
}

export {
  extractStructuredErrorMetadata,
  sanitizeLineageErrorForPersistence,
} from './errorPersistenceSupport.js';

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toLineageErrorLikeFromError(
  error: Error,
  metadata: StructuredLineageErrorMetadata
): LineageErrorLike {
  return {
    ...metadata,
    message: sanitizeLineageErrorForPersistence(error.message),
    name: error.name,
  };
}

function toLineageErrorLikeFromObject(
  error: Record<string, unknown>,
  metadata: StructuredLineageErrorMetadata
): LineageErrorLike {
  const name = resolveErrorLikeName(error);
  const message = tryStringifyObjectError(error);

  return {
    ...metadata,
    message,
    name,
  };
}

function resolveErrorLikeName(error: Record<string, unknown>): string {
  return typeof error['name'] === 'string' ? error['name'] : 'UnknownError';
}

function tryStringifyObjectError(error: Record<string, unknown>): string {
  try {
    return sanitizeLineageErrorForPersistence(JSON.stringify(error));
  } catch {
    return '[object with circular reference]';
  }
}

function stringifyPrimitiveError(error: unknown): string {
  switch (typeof error) {
    case 'string':
      return error;
    case 'number':
    case 'boolean':
    case 'bigint':
    case 'symbol':
    case 'undefined':
      return String(error);
    default:
      return 'Unknown error';
  }
}
