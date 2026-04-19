import { parsePreviewCommandInput } from './previewPlanRouteCommandParser.js';
import { parsePreviewRoutePolicy } from './previewPlanRoutePolicyParser.js';
import {
  createParsedPreviewPlanRequest,
  type ParsedPreviewPlanRequest,
} from './previewPlanRouteRequestBinder.js';
import { type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';

export type { ParsedPreviewPlanRequest, PreviewPlanContractRequest } from './previewPlanRouteRequestBinder.js';

export function parsePreviewPlanBody(body: unknown): RouteParseResult<ParsedPreviewPlanRequest> {
  const bodyRecord = parseStartRunBodyRecord(body);
  if (!bodyRecord.ok) {
    return bodyRecord;
  }

  const routePolicy = parsePreviewRoutePolicy(bodyRecord.value);
  if (!routePolicy.ok) {
    return routePolicy;
  }

  const commandInput = parsePreviewCommandInput(bodyRecord.value);
  if (!commandInput.ok) {
    return commandInput;
  }

  return {
    ok: true,
    value: createParsedPreviewPlanRequest(bodyRecord.value, routePolicy.value, commandInput.value),
  };
}
