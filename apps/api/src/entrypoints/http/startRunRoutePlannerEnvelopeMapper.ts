import { parsePlannerInputEnvelopeV2 } from '@dvt/contracts';

import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';

import type { StartRunParseResult } from './startRunRouteBodyValidation.js';

type PlannerCommandFields = {
  -readonly [K in
    | 'graphSource'
    | 'manifestRef'
    | 'manifest'
    | 'nodes'
    | 'policies'
    | 'environment'
    | 'observability']?: StartRunCommand[K];
};

export function parseStartRunPlannerEnvelope(
  record: Record<string, unknown>,
  selection: ReadonlyArray<string>
): StartRunParseResult<
  Pick<
    StartRunCommand,
    | 'graphSource'
    | 'manifestRef'
    | 'manifest'
    | 'nodes'
    | 'policies'
    | 'environment'
    | 'observability'
  >,
  'INVALID_PLAN_SOURCE'
> {
  try {
    const parsed = parsePlannerInputEnvelopeV2({
      ...(record.graphSource === undefined ? {} : { graphSource: record.graphSource }),
      ...(record.manifestRef === undefined ? {} : { manifestRef: record.manifestRef }),
      ...(record.manifest === undefined ? {} : { manifest: record.manifest }),
      ...(record.nodes === undefined ? {} : { nodes: record.nodes }),
      ...(record.policies === undefined ? {} : { policies: record.policies }),
      ...(record.environment === undefined ? {} : { environment: record.environment }),
      ...(record.observability === undefined ? {} : { observability: record.observability }),
      selection: { selectedNodeIds: selection },
    });

    return {
      ok: true,
      value: toPlannerCommandFields(parsed),
    };
  } catch {
    return { ok: false, code: 'INVALID_PLAN_SOURCE' };
  }
}

function toPlannerCommandFields(
  parsed: ReturnType<typeof parsePlannerInputEnvelopeV2>
): Pick<
  StartRunCommand,
  | 'graphSource'
  | 'manifestRef'
  | 'manifest'
  | 'nodes'
  | 'policies'
  | 'environment'
  | 'observability'
> {
  const result: PlannerCommandFields = {};

  const graphSource = mapGraphSource(parsed.graphSource);
  if (graphSource !== undefined) result.graphSource = graphSource;

  const manifestRef = mapManifestRef(parsed.manifestRef);
  if (manifestRef !== undefined) result.manifestRef = manifestRef;

  if (parsed.manifest !== undefined) result.manifest = parsed.manifest;

  const nodes = mapNodes(parsed.nodes);
  if (nodes !== undefined) result.nodes = nodes;

  if (parsed.policies !== undefined) result.policies = parsed.policies;

  const environment = mapEnvironment(parsed.environment);
  if (environment !== undefined) result.environment = environment;

  const observability = mapObservability(parsed.observability);
  if (observability !== undefined) result.observability = observability;

  return result;
}

function mapGraphSource(
  graphSource: ReturnType<typeof parsePlannerInputEnvelopeV2>['graphSource']
): StartRunCommand['graphSource'] | undefined {
  if (graphSource === undefined) return undefined;

  return {
    kind: graphSource.kind,
    nodes: graphSource.nodes.map((node) => ({
      nodeId: node.nodeId,
      resourceType: node.resourceType,
      dependsOn: [...node.dependsOn],
    })),
  };
}

function mapManifestRef(
  manifestRef: ReturnType<typeof parsePlannerInputEnvelopeV2>['manifestRef']
): StartRunCommand['manifestRef'] | undefined {
  if (manifestRef === undefined) return undefined;

  return {
    uri: manifestRef.uri,
    sha256: manifestRef.sha256,
    ...(manifestRef.artifactId === undefined ? {} : { artifactId: manifestRef.artifactId }),
  };
}

function mapNodes(
  nodes: ReturnType<typeof parsePlannerInputEnvelopeV2>['nodes']
): StartRunCommand['nodes'] | undefined {
  if (nodes === undefined) return undefined;

  return nodes.map((node) => ({
    nodeId: node.nodeId,
    resourceType: node.resourceType,
    dependsOn: [...node.dependsOn],
  }));
}

function mapEnvironment(
  environment: ReturnType<typeof parsePlannerInputEnvelopeV2>['environment']
): StartRunCommand['environment'] | undefined {
  if (environment === undefined) return undefined;

  return {
    ...(environment.environmentId === undefined
      ? {}
      : { environmentId: environment.environmentId }),
    ...(environment.targetProfile === undefined
      ? {}
      : { targetProfile: environment.targetProfile }),
    ...(environment.vars === undefined ? {} : { vars: environment.vars }),
  };
}

function mapObservability(
  observability: ReturnType<typeof parsePlannerInputEnvelopeV2>['observability']
): StartRunCommand['observability'] | undefined {
  if (observability === undefined) return undefined;

  return {
    ...(observability.tags === undefined ? {} : { tags: observability.tags }),
    ...(observability.extra === undefined ? {} : { extra: observability.extra }),
  };
}
