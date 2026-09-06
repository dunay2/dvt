/**
 * @file packages/@dvt/traceability-service/src/lineage/errorPersistenceSupport.ts
 * @baseline ADR-0067: Canonical Artifact Authority and Compiled-Code Hard Cut
 * @baseline ADR-0033: Outbox Worker Sharding And Fencing Model
 * @decision Sanitize, redact, and bound lineage error metadata before persistence
 * @consequence Dead-letter and retry diagnostics stay safe to store while preserving artifact read evidence
 * @version 0.1.0
 */
export interface StructuredLineageErrorMetadata {
  code?: string;
  messageKey?: string;
  messageParams?: Readonly<Record<string, unknown>>;
}

export function extractStructuredErrorMetadata(error: unknown): StructuredLineageErrorMetadata {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const code =
    typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : undefined;
  const messageKey =
    typeof (error as { messageKey?: unknown }).messageKey === 'string'
      ? (error as { messageKey: string }).messageKey
      : undefined;
  const messageParams = toSanitizedMessageParams(
    (error as { messageParams?: unknown }).messageParams
  );

  return {
    ...(code ? { code } : {}),
    ...(messageKey ? { messageKey } : {}),
    ...(messageParams ? { messageParams } : {}),
  };
}

export function sanitizeLineageErrorForPersistence(error: unknown): string {
  const raw = normalizeLineageErrorPersistenceInput(error);
  const singleLine = raw.replaceAll(/\s+/g, ' ').trim();
  const redacted = redactSensitiveLineageErrorContent(singleLine);
  return truncateLineageErrorPersistenceMessage(redacted);
}

function toSanitizedMessageParams(value: unknown): Readonly<Record<string, unknown>> | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  return sanitizeStructuredValue(value, 0) as Readonly<Record<string, unknown>>;
}

function sanitizeStructuredValue(value: unknown, depth: number): unknown {
  if (depth > 3) {
    return '[TRUNCATED]';
  }

  return sanitizeStructuredValueWithinDepth(value, depth);
}

function sanitizeStructuredValueWithinDepth(value: unknown, depth: number): unknown {
  if (typeof value === 'string') {
    return sanitizeLineageErrorForPersistence(value);
  }

  if (isStructuredScalar(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return sanitizeStructuredArray(value, depth);
  }

  if (isPlainObject(value)) {
    return sanitizeStructuredObject(value, depth);
  }

  return sanitizeNonStructuredValue(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isStructuredScalar(value: unknown): value is number | boolean | null {
  return typeof value === 'number' || typeof value === 'boolean' || value === null;
}

function normalizeLineageErrorPersistenceInput(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null) {
    return stringifyLineageErrorObject(error);
  }

  return stringifyLineageErrorScalar(error);
}

function stringifyLineageErrorObject(error: object): string {
  try {
    return JSON.stringify(error);
  } catch {
    return '[object with circular reference]';
  }
}

function stringifyLineageErrorScalar(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  return (
    stringifyLineageCoercibleScalar(value) ??
    stringifyLineageSymbol(value) ??
    stringifyLineageFunction(value) ??
    'Unknown error'
  );
}

function isLineageScalarCoercible(value: unknown): value is number | boolean | bigint | undefined {
  return (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'undefined'
  );
}

function stringifyLineageCoercibleScalar(value: unknown): string | undefined {
  return isLineageScalarCoercible(value) ? `${value}` : undefined;
}

function stringifyLineageSymbol(value: unknown): string | undefined {
  if (typeof value !== 'symbol') {
    return undefined;
  }

  return value.description ?? value.toString();
}

function stringifyLineageFunction(value: unknown): string | undefined {
  if (typeof value !== 'function') {
    return undefined;
  }

  return value.name ? `[function ${value.name}]` : '[function anonymous]';
}

function sanitizeNonStructuredValue(value: unknown): string {
  if (typeof value === 'object' && value !== null) {
    return sanitizeLineageErrorForPersistence(value);
  }

  return sanitizeLineageErrorForPersistence(stringifyLineageErrorScalar(value));
}

function sanitizeStructuredArray(value: readonly unknown[], depth: number): unknown[] {
  return value.slice(0, 20).map((entry) => sanitizeStructuredValue(entry, depth + 1));
}

function sanitizeStructuredObject(
  value: Record<string, unknown>,
  depth: number
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value)
      .slice(0, 20)
      .map(([key, entry]) => [key, sanitizeStructuredValue(entry, depth + 1)])
  );
}

function redactSensitiveLineageErrorContent(value: string): string {
  return value
    .replaceAll(
      /("(?:password|passwd|pwd|secret|token|apikey|api_key)"\s*:\s*)"[^"]*"/gi,
      '$1"[REDACTED]"'
    )
    .replaceAll(
      /(password|passwd|pwd|secret|token|apikey|api_key)\s*[=:]\s*[^,\s;]+/gi,
      '$1=[REDACTED]'
    )
    .replaceAll(/bearer\s+\S+/gi, 'bearer [REDACTED]');
}

function truncateLineageErrorPersistenceMessage(value: string): string {
  if (value.length <= 512) {
    return value;
  }

  return `${value.slice(0, 509)}...`;
}
