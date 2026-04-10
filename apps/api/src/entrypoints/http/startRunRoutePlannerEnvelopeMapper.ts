import type {
  GenericGraphNodeV1,
  GenericGraphSourceV1SchemaT,
  PlannerObservabilitySchemaT,
} from '@dvt/contracts';
import {
  parseGenericGraphSourceV1,
  parsePlannerEnvironmentContext,
  parsePlannerObservability,
  parsePlannerPolicyClassSet,
} from '@dvt/contracts';

import type { StartRunCommand, StartRunPlannerEnvironmentInput } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

type PlannerCommandFields = {
  -readonly [K in 'graphSource' | 'policies' | 'environment' | 'observability']?: StartRunCommand[K];
};

export function parseStartRunPlannerEnvelope(
  record: Record<string, unknown>
): RouteParseResult<Pick<StartRunCommand, 'graphSource' | 'policies' | 'environment' | 'observability'>> {
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
      result.environment = parseStartRunPlannerEnvironment(record.environment);
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
): NonNullable<StartRunCommand['graphSource']> {
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
): NonNullable<StartRunCommand['observability']> {
  const normalized: NonNullable<StartRunCommand['observability']> = {};

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

function parseStartRunPlannerEnvironment(raw: unknown): StartRunPlannerEnvironmentInput {
  const canonicalEnvironment = parsePlannerEnvironmentContext(raw);

  return {
    ...(canonicalEnvironment.environmentId === undefined
      ? {}
      : { environmentId: canonicalEnvironment.environmentId }),
    ...(canonicalEnvironment.vars === undefined ? {} : { vars: canonicalEnvironment.vars }),
  };
}

function assertNoForbiddenPlannerIngress(record: Record<string, unknown>): void {
  if (
    record.manifestRef !== undefined ||
    record.manifest !== undefined ||
    record.nodes !== undefined
  ) {
    throw new Error('Forbidden planner ingress');
  }
}
