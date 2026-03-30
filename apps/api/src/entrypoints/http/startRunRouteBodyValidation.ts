export type StartRunParseResult<T, TCode extends string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: TCode };

export function parseStartRunBodyRecord(
  body: unknown
): StartRunParseResult<Record<string, unknown>, 'INVALID_BODY'> {
  if (!isPlainRecord(body)) {
    return { ok: false, code: 'INVALID_BODY' };
  }

  return { ok: true, value: body };
}

export function asStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function asNonEmptyTrimmedStringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
