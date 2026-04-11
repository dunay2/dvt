import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export function parseStartRunSelection(
  selection: unknown
): RouteParseResult<ReadonlyArray<string>> {
  if (!Array.isArray(selection)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidSelection, { target: 'selection' });
  }

  if (!selection.every((item) => typeof item === 'string')) {
    return badRequestResult(HTTP_ERROR_REASON.invalidSelection, { target: 'selection' });
  }

  const values = selection as ReadonlyArray<string>;
  if (!values.every((item) => item.trim().length > 0 && item.trim() === item)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidSelection, { target: 'selection' });
  }

  return { ok: true, value: [...values] };
}
