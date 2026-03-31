import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parseStartRunBodyRecord(body: unknown): RouteParseResult<Record<string, unknown>> {
  if (!isPlainRecord(body)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
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
