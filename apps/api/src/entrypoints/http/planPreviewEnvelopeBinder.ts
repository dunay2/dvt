import {
  parsePlanRoutePlannerEnvelope,
  type ParsedPlanRoutePlannerEnvelope,
} from './planRoutePlannerEnvelopeParser.js';
import type { ParsedPlanRouteContext } from './planRouteScope.js';
import type { PreviewProfilePolicy } from './previewProfilePolicy.js';
import type { PreviewProvenance } from './previewProvenanceParser.js';
import { type RouteParseResult } from './routeParseIssue.js';

export type ParsedPreviewPlannerEnvelope =
  ReturnType<typeof parsePlanRoutePlannerEnvelope> extends RouteParseResult<infer T>
    ? T
    : ParsedPlanRoutePlannerEnvelope;

export function bindScopeToPlannerEnvelope(
  envelope: ParsedPreviewPlannerEnvelope,
  context: ParsedPlanRouteContext,
  provenance: PreviewProvenance | undefined,
  previewProfile: PreviewProfilePolicy
): ParsedPreviewPlannerEnvelope {
  const observability = envelope.observability;
  const observabilityExtra = envelope.observability?.extra ?? {};
  const extraWithRuntimeBinding =
    previewProfile.executor === undefined
      ? observabilityExtra
      : {
          ...observabilityExtra,
          transformationFlowRuntime: {
            previewProfile: previewProfile.previewProfile,
            executor: previewProfile.executor,
          },
        };
  const extraWithProvenance =
    provenance === undefined
      ? extraWithRuntimeBinding
      : {
          ...extraWithRuntimeBinding,
          transformationFlowProvenance: provenance,
        };
  const hasExtra = Object.keys(extraWithProvenance).length > 0;

  return {
    ...envelope,
    observability: {
      ...observability,
      tags: {
        ...observability?.tags,
        'dvt.scope.tenantId': context.tenantId.value,
        'dvt.scope.projectId': context.projectId.value,
        'dvt.scope.environmentId': context.environmentId.value,
      },
      ...(hasExtra ? { extra: extraWithProvenance } : {}),
    },
  };
}
