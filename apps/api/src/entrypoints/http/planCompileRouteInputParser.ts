import type { PlannerSelection, PlanCompileRequestV1SchemaT } from '@dvt/contracts';
import { parsePlanCompileRequest } from '@dvt/contracts';

import type { CompilePlanCommand } from '../../application/services/CompilePlanUseCase.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { parsePlanRouteBodyRecord } from './planRouteBodyParser.js';
import { toPlanRouteGraphSource } from './planRoutePlannerEnvelopeParser.js';
import { parsePlanRouteScope, type ParsedPlanRouteScope } from './planRouteScopeParser.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export interface ParsedPlanCompileRouteInput {
  readonly requestedScope: ParsedPlanRouteScope;
  readonly command: CompilePlanCommand;
}

export function parsePlanCompileRouteInput(
  body: unknown
): RouteParseResult<ParsedPlanCompileRouteInput> {
  const parsedBody = parsePlanRouteBodyRecord(body);
  if (!parsedBody.ok) {
    return parsedBody;
  }

  if (hasForbiddenCompileIngress(parsedBody.value)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  let compileRequest: ReturnType<typeof parsePlanCompileRequest>;
  try {
    compileRequest = parsePlanCompileRequest(parsedBody.value);
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  const scopeResult = parsePlanRouteScope(compileRequest.context);
  if (!scopeResult.ok) {
    return scopeResult;
  }

  return {
    ok: true,
    value: {
      requestedScope: scopeResult.value,
      command: {
        graphSource: toPlanRouteGraphSource(compileRequest.graphSource),
        selection: toCompileSelection(compileRequest.selection),
        policies: compileRequest.policies,
        observability: compileRequest.observability,
      },
    },
  };
}

function hasForbiddenCompileIngress(record: Record<string, unknown>): boolean {
  return (
    record.previewProfile !== undefined ||
    record.persist !== undefined ||
    record.planRef !== undefined ||
    record.selectedNodeIds !== undefined ||
    record.provenance !== undefined ||
    record.manifestRef !== undefined ||
    record.manifest !== undefined ||
    record.nodes !== undefined
  );
}

function toCompileSelection(selection: PlanCompileRequestV1SchemaT['selection']): PlannerSelection {
  return {
    selectedNodeIds: selection.selectedNodeIds,
    ...(selection.includeUpstream === undefined
      ? {}
      : { includeUpstream: selection.includeUpstream }),
    ...(selection.includeDownstream === undefined
      ? {}
      : { includeDownstream: selection.includeDownstream }),
  };
}
