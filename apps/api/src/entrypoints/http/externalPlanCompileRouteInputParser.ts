import type { ExternalPlanCompileRequestV1SchemaT, GenericGraphSourceV1, PlannerSelection } from '@dvt/contracts';
import { parseExternalPlanCompileRequest } from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { parseStartRunBodyRecord } from './startRunRouteBodyValidation.js';
import { parseStartRunScope, type ParsedStartRunScope } from './startRunRouteScopeParser.js';

export interface ParsedExternalPlanCompileRouteInput {
  readonly scope: ParsedStartRunScope;
  readonly graphSource: GenericGraphSourceV1;
  readonly selection: PlannerSelection;
  readonly policies: ExternalPlanCompileRequestV1SchemaT['policies'];
  readonly environment: ExternalPlanCompileRequestV1SchemaT['environment'];
  readonly observability: ExternalPlanCompileRequestV1SchemaT['observability'];
}

export function parseExternalPlanCompileRouteInput(
  body: unknown
): RouteParseResult<ParsedExternalPlanCompileRouteInput> {
  const parsedBody = parseStartRunBodyRecord(body);
  if (!parsedBody.ok) {
    return parsedBody;
  }

  if (hasForbiddenCompileIngress(parsedBody.value)) {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }

  let compileRequest: ExternalPlanCompileRequestV1SchemaT;
  try {
    compileRequest = parseExternalPlanCompileRequest(parsedBody.value);
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidBody);
  }

  const scopeResult = parseStartRunScope(compileRequest.context);
  if (!scopeResult.ok) {
    return scopeResult;
  }

  return {
    ok: true,
    value: {
      scope: scopeResult.value,
      graphSource: normalizeCompileGraphSource(compileRequest.graphSource),
      selection: normalizeCompileSelection(compileRequest.selection),
      policies: compileRequest.policies,
      environment: compileRequest.environment,
      observability: compileRequest.observability,
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

function normalizeCompileSelection(selection: ExternalPlanCompileRequestV1SchemaT['selection']) {
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

function normalizeCompileGraphSource(
  graphSource: ExternalPlanCompileRequestV1SchemaT['graphSource']
): GenericGraphSourceV1 {
  return {
    kind: graphSource.kind,
    sourceFamily: graphSource.sourceFamily,
    sourceVersion: graphSource.sourceVersion,
    nodes: graphSource.nodes.map((node) => {
      const metadata =
        node.metadata === undefined
          ? undefined
          : {
              ...(node.metadata.displayName === undefined
                ? {}
                : { displayName: node.metadata.displayName }),
              ...(node.metadata.sourceRef === undefined
                ? {}
                : { sourceRef: node.metadata.sourceRef }),
              ...(node.metadata.tags === undefined ? {} : { tags: node.metadata.tags }),
            };

      return {
        nodeId: node.nodeId,
        stepKind: node.stepKind,
        dependsOn: node.dependsOn,
        ...(node.stepTypeConfig === undefined ? {} : { stepTypeConfig: node.stepTypeConfig }),
        ...(metadata === undefined || Object.keys(metadata).length === 0 ? {} : { metadata }),
      };
    }),
  };
}
