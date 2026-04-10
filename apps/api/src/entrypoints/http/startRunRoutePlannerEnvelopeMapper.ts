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
import { isSha256HexString } from '@dvt/contracts';

import type {
  StartRunCommand,
  StartRunManifestRef,
  StartRunPlannerEnvironmentInput,
} from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';
import { asNonEmptyTrimmedStringOrUndefined } from './startRunRouteBodyValidation.js';

type PlannerCommandFields = {
  -readonly [K in
    | 'graphSource'
    | 'manifestRef'
    | 'policies'
    | 'environment'
    | 'observability']?: StartRunCommand[K];
};

export function parseStartRunPlannerEnvelope(
  record: Record<string, unknown>,
  _selection: ReadonlyArray<string>
): RouteParseResult<
  Pick<
    StartRunCommand,
    'graphSource' | 'manifestRef' | 'policies' | 'environment' | 'observability'
  >
> {
  try {
    const result: PlannerCommandFields = {};

    if (record.graphSource !== undefined) {
      result.graphSource = mapGraphSource(parseGenericGraphSourceV1(record.graphSource));
    }

    if (record.manifestRef !== undefined) {
      result.manifestRef = parseStartRunManifestRef(record.manifestRef);
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

function parseStartRunManifestRef(raw: unknown): StartRunManifestRef {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid manifestRef');
  }

  const record = raw as Record<string, unknown>;
  const uri = asNonEmptyTrimmedStringOrUndefined(record.uri);
  const sha256 = asNonEmptyTrimmedStringOrUndefined(record.sha256);
  const artifactId = asNonEmptyTrimmedStringOrUndefined(record.artifactId);

  if (uri === undefined || !/^[a-z][a-z0-9+.-]*:\/\//i.test(uri)) {
    throw new Error('Invalid manifestRef.uri');
  }

  if (sha256 === undefined || !isSha256HexString(sha256)) {
    throw new Error('Invalid manifestRef.sha256');
  }

  return {
    uri,
    sha256,
    ...(artifactId === undefined ? {} : { artifactId }),
  };
}

function parseStartRunPlannerEnvironment(raw: unknown): StartRunPlannerEnvironmentInput {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid environment');
  }

  const record = raw as Record<string, unknown>;
  const targetProfile = asNonEmptyTrimmedStringOrUndefined(record.targetProfile);
  const canonicalEnvironment = parsePlannerEnvironmentContext({
    ...(asNonEmptyTrimmedStringOrUndefined(record.environmentId) === undefined
      ? {}
      : { environmentId: asNonEmptyTrimmedStringOrUndefined(record.environmentId) }),
    ...(record.vars === undefined ? {} : { vars: record.vars }),
  });

  return {
    ...(canonicalEnvironment.environmentId === undefined
      ? {}
      : { environmentId: canonicalEnvironment.environmentId }),
    ...(targetProfile === undefined ? {} : { targetProfile }),
    ...(canonicalEnvironment.vars === undefined ? {} : { vars: canonicalEnvironment.vars }),
  };
}
