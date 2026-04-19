import type {
  ExecutionPlan,
  GenericGraphNodeV1,
  GenericGraphSourceV1,
  GenericGraphSourceV1SchemaT,
  PlannerEnvironmentContext,
  PlannerObservabilitySchemaT,
  PlannerPolicyClassSet,
} from '@dvt/contracts';
import {
  parseGenericGraphSourceV1,
  parsePlannerEnvironmentContext,
  parsePlannerObservability,
  parsePlannerPolicyClassSet,
} from '@dvt/contracts';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

export interface ParsedPlanRoutePlannerEnvelope {
  readonly graphSource?: GenericGraphSourceV1;
  readonly policies?: PlannerPolicyClassSet;
  readonly environment?: PlannerEnvironmentContext;
  readonly observability?: ExecutionPlan['observability'];
}

type PlannerCommandFields = {
  -readonly [K in keyof ParsedPlanRoutePlannerEnvelope]?: ParsedPlanRoutePlannerEnvelope[K];
};

const FORBIDDEN_PLANNER_INGRESS_KEYS = ['manifestRef', 'manifest', 'nodes'] as const;

export function parsePlanRoutePlannerEnvelope(
  record: Record<string, unknown>
): RouteParseResult<ParsedPlanRoutePlannerEnvelope> {
  try {
    assertNoForbiddenPlannerIngress(record);
    const result: PlannerCommandFields = {};

    if (record.graphSource !== undefined) {
      result.graphSource = mapGraphSource(parseGenericGraphSourceV1(record.graphSource));
    }

    if (record.policies !== undefined) {
      result.policies = parsePlannerPolicyClassSet(record.policies);
    }

    if (record.environment !== undefined) {
      result.environment = parsePlanRoutePlannerEnvironment(record.environment);
    }

    if (record.observability !== undefined) {
      const observability = parsePlannerObservability(record.observability);
      if (observability !== undefined) {
        result.observability = normalizePlannerObservability(observability);
      }
    }

    return {
      ok: true,
      value: result,
    };
  } catch {
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }
}

function mapGraphSource(
  graphSource: GenericGraphSourceV1SchemaT
): GenericGraphSourceV1 {
  const nodes: GenericGraphNodeV1[] = graphSource.nodes.map((node) => {
    const mappedNode: GenericGraphNodeV1 = {
      nodeId: node.nodeId,
      stepKind: node.stepKind,
      dependsOn: node.dependsOn,
    };

    if (node.stepTypeConfig !== undefined) {
      mappedNode.stepTypeConfig = node.stepTypeConfig;
    }

    if (node.metadata !== undefined) {
      const metadata: NonNullable<GenericGraphNodeV1['metadata']> = {};
      if (node.metadata.displayName !== undefined) {
        metadata.displayName = node.metadata.displayName;
      }
      if (node.metadata.sourceRef !== undefined) {
        metadata.sourceRef = node.metadata.sourceRef;
      }
      if (node.metadata.tags !== undefined) {
        metadata.tags = node.metadata.tags;
      }
      if (Object.keys(metadata).length > 0) {
        mappedNode.metadata = metadata;
      }
    }

    return mappedNode;
  });

  return {
    kind: graphSource.kind,
    sourceFamily: graphSource.sourceFamily,
    sourceVersion: graphSource.sourceVersion,
    nodes,
  };
}

function normalizePlannerObservability(
  observability: NonNullable<PlannerObservabilitySchemaT>
): NonNullable<ExecutionPlan['observability']> {
  const normalized: NonNullable<ExecutionPlan['observability']> = {};

  for (const [key, value] of Object.entries(observability)) {
    if (key !== 'tags' && key !== 'extra') {
      normalized[key] = value;
    }
  }

  if (observability.tags !== undefined) {
    normalized.tags = observability.tags;
  }

  if (observability.extra !== undefined) {
    normalized.extra = observability.extra;
  }

  return normalized;
}

function parsePlanRoutePlannerEnvironment(
  raw: unknown
): PlannerEnvironmentContext {
  const canonicalEnvironment = parsePlannerEnvironmentContext(raw);

  return {
    ...(canonicalEnvironment.environmentId === undefined
      ? {}
      : { environmentId: canonicalEnvironment.environmentId }),
    ...(canonicalEnvironment.vars === undefined
      ? {}
      : { vars: canonicalEnvironment.vars }),
  };
}

function assertNoForbiddenPlannerIngress(record: Record<string, unknown>): void {
  if (hasForbiddenPlannerIngress(record)) {
    throw new Error('Forbidden planner ingress');
  }
}

function hasForbiddenPlannerIngress(record: Record<string, unknown>): boolean {
  return FORBIDDEN_PLANNER_INGRESS_KEYS.some((key) => record[key] !== undefined);
}
