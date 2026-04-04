import { parsePlannerInputEnvelopeV1 } from '@dvt/contracts';

import type { StartRunCommand } from '../../application/ports/startRunCommandContract.js';

import { HTTP_ERROR_REASON } from './httpErrorReasonCatalog.js';
import { badRequestResult, type RouteParseResult } from './routeParseIssue.js';

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
  selection: ReadonlyArray<string>
): RouteParseResult<
  Pick<
    StartRunCommand,
    'graphSource' | 'manifestRef' | 'policies' | 'environment' | 'observability'
  >
> {
  try {
    const parsed = parsePlannerInputEnvelopeV1({
      ...(record.graphSource === undefined ? {} : { graphSource: record.graphSource }),
      ...(record.manifestRef === undefined ? {} : { manifestRef: record.manifestRef }),
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
    return badRequestResult(HTTP_ERROR_REASON.invalidPlanSource);
  }
}

function toPlannerCommandFields(
  parsed: ReturnType<typeof parsePlannerInputEnvelopeV1>
): Pick<
  StartRunCommand,
  'graphSource' | 'manifestRef' | 'policies' | 'environment' | 'observability'
> {
  const result: PlannerCommandFields = {};

  const graphSource = mapGraphSource(parsed.graphSource);
  if (graphSource !== undefined) result.graphSource = graphSource;

  const manifestRef = mapManifestRef(parsed.manifestRef);
  if (manifestRef !== undefined) result.manifestRef = manifestRef;

  if (parsed.policies !== undefined) result.policies = parsed.policies;

  const environment = mapEnvironment(parsed.environment);
  if (environment !== undefined) result.environment = environment;

  const observability = mapObservability(parsed.observability);
  if (observability !== undefined) result.observability = observability;

  return result;
}

function mapGraphSource(
  graphSource: ReturnType<typeof parsePlannerInputEnvelopeV1>['graphSource']
): StartRunCommand['graphSource'] | undefined {
  if (graphSource === undefined) return undefined;

  return graphSource;
}

function mapManifestRef(
  manifestRef: ReturnType<typeof parsePlannerInputEnvelopeV1>['manifestRef']
): StartRunCommand['manifestRef'] | undefined {
  if (manifestRef === undefined) return undefined;

  return {
    uri: manifestRef.uri,
    sha256: manifestRef.sha256,
    ...(manifestRef.artifactId === undefined ? {} : { artifactId: manifestRef.artifactId }),
  };
}

function mapEnvironment(
  environment: ReturnType<typeof parsePlannerInputEnvelopeV1>['environment']
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
  observability: ReturnType<typeof parsePlannerInputEnvelopeV1>['observability']
): StartRunCommand['observability'] | undefined {
  if (observability === undefined) return undefined;

  return {
    ...(observability.tags === undefined ? {} : { tags: observability.tags }),
    ...(observability.extra === undefined ? {} : { extra: observability.extra }),
  };
}
